'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Layers,
  Search,
  ExternalLink,
  CalendarCheck,
  Calendar,
  Clock,
  User,
  ChevronRight,
  TrendingUp,
  Receipt,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { CourtBooking } from '@/types/booking';
import { formatRupiah, formatDate } from '@/lib/utils';

interface CourtRevenueDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  courtName: string;
  periodLabel: string;
  filteredBookings: CourtBooking[];
  onOpenBookingReceipt?: (booking: CourtBooking) => void;
}

const normalizeCourtName = (name: string) =>
  (name || '')
    .replace(/\s*\([^)]*VIP[^)]*\)/gi, '')
    .replace(/\s*\([^)]*Vinyl[^)]*\)/gi, '')
    .trim();

export const CourtRevenueDetailModal: React.FC<CourtRevenueDetailModalProps> = ({
  isOpen,
  onClose,
  courtName,
  periodLabel,
  filteredBookings,
  onOpenBookingReceipt,
}) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LUNAS' | 'DP' | 'MEMBER'>('ALL');

  // Filter bookings belonging to this court
  const courtBookings = useMemo(() => {
    return filteredBookings.filter((b) => {
      if (b.status === 'CANCELLED') return false;
      const clean = normalizeCourtName(b.courtName);
      return clean === courtName || b.courtName === courtName;
    });
  }, [filteredBookings, courtName]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalOmzet = courtBookings.reduce((sum, b) => sum + (b.amountPaidTotal || 0), 0);
    const totalHours = courtBookings.reduce((sum, b) => sum + (b.durationHours || 0), 0);
    const totalCount = courtBookings.length;
    const avgPerHour = totalHours > 0 ? Math.round(totalOmzet / totalHours) : 0;
    return { totalOmzet, totalHours, totalCount, avgPerHour };
  }, [courtBookings]);

  // Filtered list based on search and status chip
  const displayList = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return courtBookings.filter((b) => {
      // Filter status chip
      if (statusFilter === 'LUNAS' && b.remainingBalance > 0) return false;
      if (statusFilter === 'DP' && b.remainingBalance === 0) return false;
      if (statusFilter === 'MEMBER' && b.memberType !== 'MEMBER') return false;

      // Filter search
      if (!q) return true;
      return (
        b.customerName.toLowerCase().includes(q) ||
        b.bookingCode.toLowerCase().includes(q) ||
        b.date.includes(q) ||
        b.startTime.includes(q) ||
        b.endTime.includes(q) ||
        (b.communityName && b.communityName.toLowerCase().includes(q)) ||
        (b.phone && b.phone.includes(q))
      );
    });
  }, [courtBookings, searchTerm, statusFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#f8fafc] rounded-[28px] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md bg-gradient-to-tr from-emerald-600 to-teal-700 shadow-emerald-600/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-slate-900 text-base leading-tight">
                  {courtName}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                  Rincian Sewa
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {periodLabel}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ringkasan KPI Cards */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-100 space-y-3">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-emerald-50/70 border border-emerald-100/80 rounded-2xl p-3">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                Total Omzet
              </span>
              <div className="text-base sm:text-lg font-black text-emerald-800 tracking-tight mt-0.5">
                {formatRupiah(stats.totalOmzet)}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Jam
              </span>
              <div className="text-base sm:text-lg font-black text-slate-800 tracking-tight mt-0.5">
                {stats.totalHours} <span className="text-xs font-semibold text-slate-500">Jam</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Booking
              </span>
              <div className="text-base sm:text-lg font-black text-slate-800 tracking-tight mt-0.5">
                {stats.totalCount} <span className="text-xs font-semibold text-slate-500">Sesi</span>
              </div>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari customer, kode booking, tanggal..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400"
            />
          </div>

          {/* Filter Status Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {[
              { id: 'ALL', label: 'Semua' },
              { id: 'LUNAS', label: 'Lunas' },
              { id: 'DP', label: 'Sisa DP' },
              { id: 'MEMBER', label: 'Member' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <span className="ml-auto text-[11px] font-semibold text-slate-400 whitespace-nowrap">
              {displayList.length} data
            </span>
          </div>
        </div>

        {/* Scrollable Booking List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {displayList.length > 0 ? (
            displayList.map((b, idx) => {
              const isLunas = b.remainingBalance === 0;
              const isMember = b.memberType === 'MEMBER';
              return (
                <div
                  key={b.id || idx}
                  onClick={() => onOpenBookingReceipt?.(b)}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-emerald-500 hover:shadow-xs transition-all cursor-pointer group space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      {isMember && (
                        <div className="mb-1">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                            Member
                          </span>
                        </div>
                      )}
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {b.customerName}
                      </h4>
                      {b.communityName && (
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {b.communityName}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-xs sm:text-sm font-black text-emerald-700">
                        {formatRupiah(b.amountPaidTotal)}
                      </span>
                      <span
                        className={`block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                          isLunas
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                            : 'bg-amber-50 text-amber-700 border border-amber-200/50'
                        }`}
                      >
                        {isLunas ? 'Lunas' : `DP (Sisa ${formatRupiah(b.remainingBalance)})`}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <div className="flex items-center gap-2 line-clamp-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formatDate(b.date, false)}</span>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{b.startTime}-{b.endTime} ({b.durationHours} jam)</span>
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-slate-400 group-hover:text-emerald-700 font-bold text-[11px] transition-colors shrink-0">
                      <span>Lihat Nota</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs font-medium space-y-1">
              <Receipt className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
              <p>Tidak ada data booking {courtName} yang sesuai filter.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200/80 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push('/booking/history');
            }}
            className="flex-1 py-3 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
          >
            <span>Buka Riwayat Booking Lapangan</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
