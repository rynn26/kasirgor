'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCourtBookingStore } from '@/lib/store/useCourtBookingStore';
import { useShiftStore } from '@/lib/store/useShiftStore';
import { formatRupiah } from '@/lib/utils';
import { CourtBooking } from '@/types/booking';
import {
  ArrowLeft,
  Search,
  Calendar,
  ChevronRight,
  X,
  ReceiptText,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { SettlementModal } from '@/components/booking/SettlementModal';
import { BookingReceiptModal } from '@/components/booking/BookingReceiptModal';
import { BookingSuccessModal } from '@/components/booking/BookingSuccessModal';

export default function PelunasanBookingPage() {
  const router = useRouter();
  const { bookings, loadBookings } = useCourtBookingStore();
  const { cashierName } = useShiftStore();

  useEffect(() => {
    loadBookings();
  }, []);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState<'ALL' | 'DP' | 'LUNAS'>('ALL');

  // Modal states
  const [selectedBookingForSettlement, setSelectedBookingForSettlement] = useState<string | null>(null);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [selectedBookingForReceipt, setSelectedBookingForReceipt] = useState<CourtBooking | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Counts
  const dpCount = bookings.filter((b) => b.status === 'DP_PAID' || b.remainingBalance > 0).length;
  const lunasCount = bookings.filter((b) => b.status === 'SETTLED' || b.remainingBalance === 0).length;
  const allCount = bookings.length;

  // Filtered List
  const filteredBookings = bookings.filter((bkg) => {
    const isDP = bkg.status === 'DP_PAID' || bkg.remainingBalance > 0;
    const isLunas = bkg.status === 'SETTLED' || bkg.remainingBalance === 0;

    // Filter Tab
    if (activeFilterTab === 'DP' && !isDP) return false;
    if (activeFilterTab === 'LUNAS' && !isLunas) return false;

    // Date filter
    if (selectedDateFilter && bkg.date !== selectedDateFilter) return false;

    // Search query (name, phone, bookingCode, courtName, communityName)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = bkg.customerName.toLowerCase().includes(q);
      const matchCode = bkg.bookingCode.toLowerCase().includes(q);
      const matchPhone = bkg.phone.toLowerCase().includes(q);
      const matchDate = bkg.date.toLowerCase().includes(q);
      const matchCourt = bkg.courtName.toLowerCase().includes(q);
      return matchName || matchCode || matchPhone || matchDate || matchCourt;
    }

    return true;
  });

  const handleCardClick = (bkg: CourtBooking) => {
    const isDP = bkg.status === 'DP_PAID' || bkg.remainingBalance > 0;
    if (isDP) {
      setSelectedBookingForSettlement(bkg.id);
      setIsSettlementModalOpen(true);
    } else {
      setSelectedBookingForReceipt(bkg);
      setIsReceiptModalOpen(true);
    }
  };

  return (
    <div className="min-h-full bg-[#f8fafc] p-3.5 sm:p-5 max-w-xl mx-auto space-y-4 pb-28">
      
      {/* Top Header Card */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            href="/booking"
            className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-[#b92b10] border border-slate-200 transition-colors cursor-pointer flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">
                4
              </span>
              <h1 className="font-black text-base sm:text-lg text-slate-900 leading-tight">
                Pelunasan Booking Lapangan
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Cari booking berdasarkan nama, tanggal, atau kode untuk pelunasan
            </p>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <span className="text-[10px] text-slate-400 font-semibold block">Kasir</span>
          <span className="text-xs font-bold text-slate-800">{cashierName || 'Yuli'}</span>
        </div>
      </div>

      {/* Search & Date Filter Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari nama atau tanggal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white placeholder-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Date Picker Button / Input */}
          <div className="relative">
            <input
              type="date"
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="sr-only"
              id="date-filter-picker"
            />
            <label
              htmlFor="date-filter-picker"
              title={selectedDateFilter ? `Filter: ${selectedDateFilter}` : 'Pilih Tanggal'}
              className={`p-2.5 sm:px-3.5 py-2.5 rounded-2xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                selectedDateFilter
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              {selectedDateFilter && (
                <span className="text-[11px] hidden sm:inline">{selectedDateFilter}</span>
              )}
            </label>
          </div>

          {selectedDateFilter && (
            <button
              type="button"
              onClick={() => setSelectedDateFilter('')}
              title="Hapus Filter Tanggal"
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Tabs Pills (Semua, DP, Lunas) */}
        <div className="flex gap-2 text-xs">
          {[
            { id: 'ALL', label: `Semua (${allCount})` },
            { id: 'DP', label: `DP (${dpCount})` },
            { id: 'LUNAS', label: `Lunas (${lunasCount})` },
          ].map((tab) => {
            const isSelected = activeFilterTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilterTab(tab.id as 'ALL' | 'DP' | 'LUNAS')}
                className={`py-2 px-4 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Booking List */}
      <div className="space-y-2.5">
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-2">
            <ReceiptText className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">Tidak Ditemukan Data Booking</h3>
            <p className="text-xs text-slate-500">
              {searchQuery || selectedDateFilter
                ? 'Tidak ada booking yang cocok dengan kata kunci pencarian atau tanggal yang dipilih.'
                : 'Belum ada data reservasi booking lapangan.'}
            </p>
          </div>
        ) : (
          filteredBookings.map((bkg) => {
            const isDP = bkg.status === 'DP_PAID' || bkg.remainingBalance > 0;
            const isLunas = bkg.status === 'SETTLED' || bkg.remainingBalance === 0;

            return (
              <div
                key={bkg.id}
                onClick={() => handleCardClick(bkg)}
                className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer space-y-2 relative group"
              >
                {/* Top Row: Name & Status Badge */}
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-sm sm:text-base text-slate-900">
                    {bkg.customerName}
                  </h3>

                  <div className="flex items-center gap-2">
                    {isDP && (
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800">
                        DP
                      </span>
                    )}
                    {isLunas && (
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                        Lunas
                      </span>
                    )}
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                {/* Details Line 1: Sport & Court count */}
                <div className="text-xs text-slate-500 font-medium">
                  {bkg.communityName?.includes('Pickleball') ? 'Pickleball' : 'Badminton'} · {bkg.courtName.includes('&') ? bkg.courtName : `${bkg.courtName.split(' ')[0]} ${bkg.courtName.split(' ')[1] || '1 Lapangan'}`}
                </div>

                {/* Details Line 2: Date & Time range */}
                <div className="text-xs font-semibold text-slate-700 flex flex-wrap items-center gap-x-2">
                  <span>Main: {bkg.date} ({bkg.startTime} - {bkg.endTime})</span>
                  {bkg.bookingDate && bkg.bookingDate !== bkg.date && (
                    <span className="text-[11px] font-normal text-slate-500">· Booking: {bkg.bookingDate}</span>
                  )}
                </div>

                {/* Details Line 3: Total & DP breakdown */}
                <div className="text-xs text-slate-500">
                  Total: {formatRupiah(bkg.totalAmount)} | DP: {formatRupiah(bkg.dpAmount)}
                </div>

                {/* Details Line 4: Sisa Pelunasan */}
                <div className="pt-1 flex items-center justify-between">
                  <span className={`text-xs font-black ${
                    isDP ? 'text-emerald-700' : 'text-slate-600'
                  }`}>
                    Sisa: {formatRupiah(bkg.remainingBalance)}
                  </span>

                  <span className="text-[10px] text-blue-600 font-bold group-hover:underline">
                    {isDP ? 'Klik untuk Lunasi' : 'Lihat Struk Lunas'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Settlement Processing Modal */}
      <SettlementModal
        isOpen={isSettlementModalOpen}
        selectedBookingId={selectedBookingForSettlement}
        onClose={() => {
          setIsSettlementModalOpen(false);
          setSelectedBookingForSettlement(null);
        }}
        onSuccess={(updated) => {
          setIsSettlementModalOpen(false);
          setSelectedBookingForSettlement(null);
          setSelectedBookingForReceipt(updated);
          setIsSuccessModalOpen(true);
        }}
      />

      {/* Success Confirmation Modal (Step 6) */}
      <BookingSuccessModal
        isOpen={isSuccessModalOpen}
        booking={selectedBookingForReceipt}
        mode="PELUNASAN"
        onClose={() => {
          setIsSuccessModalOpen(false);
          setSelectedBookingForReceipt(null);
        }}
        onViewReceipt={() => {
          setIsSuccessModalOpen(false);
          setIsReceiptModalOpen(true);
        }}
        onNewTransaction={() => {
          setIsSuccessModalOpen(false);
          setSelectedBookingForReceipt(null);
          router.push('/booking');
        }}
      />

      {/* Thermal Receipt Modal */}
      <BookingReceiptModal
        isOpen={isReceiptModalOpen}
        booking={selectedBookingForReceipt}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setSelectedBookingForReceipt(null);
        }}
      />
    </div>
  );
}
