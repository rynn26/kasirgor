'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCourtBookingStore } from '@/lib/store/useCourtBookingStore';
import { useShiftStore } from '@/lib/store/useShiftStore';
import { formatRupiah, formatDate } from '@/lib/utils';
import { CourtBooking } from '@/types/booking';
import {
  ArrowLeft,
  Search,
  Calendar,
  Receipt,
  History as HistoryIcon,
  ChevronRight,
  X,
  Printer,
  MessageCircle,
  CheckCircle2,
  QrCode,
  Banknote,
  Clock,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { BookingReceiptModal } from '@/components/booking/BookingReceiptModal';

export default function HistoryBookingPage() {
  const router = useRouter();
  const { bookings, loadBookings } = useCourtBookingStore();
  const { cashierName } = useShiftStore();

  useEffect(() => {
    loadBookings();
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<'ALL' | 'CASH' | 'QRIS'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SETTLED' | 'DP_PAID'>('ALL');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<CourtBooking | null>(null);

  // Financial Summary
  const totalRevenue = bookings.reduce((sum, b) => sum + b.amountPaidTotal, 0);
  const totalBookingsCount = bookings.length;
  const lunasCount = bookings.filter((b) => b.status === 'SETTLED' || b.remainingBalance === 0).length;
  const pendingDpCount = bookings.filter((b) => b.status === 'DP_PAID' && b.remainingBalance > 0).length;
  const totalPiutang = bookings.reduce((sum, b) => sum + b.remainingBalance, 0);

  // Filtered List
  const filtered = bookings.filter((bkg) => {
    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchCode = bkg.bookingCode.toLowerCase().includes(q);
      const matchName = bkg.customerName.toLowerCase().includes(q);
      const matchPhone = bkg.phone.toLowerCase().includes(q);
      const matchCourt = bkg.courtName.toLowerCase().includes(q);
      if (!matchCode && !matchName && !matchPhone && !matchCourt) return false;
    }

    // Method filter
    if (methodFilter !== 'ALL') {
      const isMethodMatch = bkg.dpPaymentMethod === methodFilter || bkg.settlementPaymentMethod === methodFilter;
      if (!isMethodMatch) return false;
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'SETTLED' && bkg.status !== 'SETTLED' && bkg.remainingBalance > 0) return false;
      if (statusFilter === 'DP_PAID' && (bkg.status !== 'DP_PAID' || bkg.remainingBalance === 0)) return false;
    }

    // Date filter
    if (selectedDate && bkg.date !== selectedDate) return false;

    return true;
  });

  return (
    <div className="min-h-full bg-[#f8fafc] p-3.5 sm:p-5 max-w-2xl mx-auto space-y-4 pb-28">
      
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            href="/booking"
            className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-emerald-700 border border-slate-200 transition-colors cursor-pointer flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </Link>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Riwayat Transaksi Lapangan</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Daftar nota, bukti DP, dan pelunasan sewa lapangan GOR
            </p>
          </div>
        </div>

        <div className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black">
          {filtered.length} Transaksi
        </div>
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold">Total Uang Masuk</span>
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900">
            {formatRupiah(totalRevenue)}
          </div>
          <span className="text-[10px] text-slate-400 block font-medium">
            Dari {totalBookingsCount} transaksi sewa
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold">Lunas / Selesai</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-base sm:text-lg font-black text-blue-700">
            {lunasCount} Nota
          </div>
          <span className="text-[10px] text-slate-400 block font-medium">
            Pembayaran penuh 100%
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold">Belum Lunas (DP)</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-base sm:text-lg font-black text-amber-600">
            {pendingDpCount} Booking
          </div>
          <span className="text-[10px] text-slate-400 block font-medium">
            Sisa tagihan: {formatRupiah(totalPiutang)}
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-3">
        {/* Search & Date Picker Row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari kode booking, nama customer, nomor WA..."
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-700 focus:bg-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="sr-only"
              id="history-date-picker"
            />
            <label
              htmlFor="history-date-picker"
              title={selectedDate ? `Tanggal: ${selectedDate}` : 'Filter Tanggal'}
              className={`p-2.5 sm:px-3 py-2.5 rounded-2xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                selectedDate
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              {selectedDate && <span className="text-[11px] hidden sm:inline">{selectedDate}</span>}
            </label>
          </div>

          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate('')}
              title="Reset Tanggal"
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          {[
            { id: 'ALL', label: 'Semua Status' },
            { id: 'SETTLED', label: 'Lunas' },
            { id: 'DP_PAID', label: 'DP Terbayar' },
          ].map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}

          <div className="w-[1px] bg-slate-200 mx-1 shrink-0" />

          {/* Payment Method Tabs */}
          {[
            { id: 'ALL', label: 'Semua Metode' },
            { id: 'CASH', label: 'Cash' },
            { id: 'QRIS', label: 'QRIS' },
          ].map((tab) => {
            const isSelected = methodFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMethodFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-2.5">
        {filtered.length > 0 ? (
          filtered.map((bkg) => {
            const isLunas = bkg.status === 'SETTLED' || bkg.remainingBalance === 0;
            const isDP = !isLunas && (bkg.status === 'DP_PAID' || bkg.dpAmount > 0);
            const sportName = bkg.communityName?.includes('Pickleball') ? 'Pickleball' : 'Badminton';
            const paymentMethodUsed = bkg.settlementPaymentMethod || bkg.dpPaymentMethod || 'Cash';

            return (
              <div
                key={bkg.id}
                onClick={() => setSelectedBooking(bkg)}
                className="p-4 sm:p-5 rounded-3xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all flex items-center justify-between gap-3 cursor-pointer shadow-xs group"
              >
                <div className="flex items-start space-x-3.5 min-w-0">
                  {/* Badge Icon */}
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                    isLunas 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                      : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    <Receipt className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-slate-500">
                        {bkg.bookingCode}
                      </span>
                      {isLunas ? (
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                          Lunas
                        </span>
                      ) : (
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                          DP
                        </span>
                      )}
                    </div>

                    <h4 className="font-black text-sm text-slate-900 truncate group-hover:text-emerald-800 transition-colors">
                      {bkg.customerName}
                    </h4>

                    <p className="text-[11px] text-slate-500">
                      {sportName} · {bkg.courtName}
                    </p>

                    <p className="text-[11px] text-slate-400">
                      {bkg.date} · {bkg.startTime} - {bkg.endTime} ({bkg.durationHours} Jam)
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center space-x-2.5">
                  <div>
                    <div className="text-sm font-black text-slate-900">
                      {formatRupiah(bkg.amountPaidTotal)}
                    </div>

                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {paymentMethodUsed}
                      </span>
                    </div>

                    {isDP && (
                      <span className="text-[10px] font-bold text-amber-600 block mt-0.5">
                        Sisa: {formatRupiah(bkg.remainingBalance)}
                      </span>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-2">
            <HistoryIcon className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-bold text-sm text-slate-800">Tidak Ada Riwayat Transaksi</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Tidak ditemukan nota booking lapangan yang sesuai dengan filter pencarian.
            </p>
          </div>
        )}
      </div>

      {/* Booking Thermal Receipt & WhatsApp Modal */}
      <BookingReceiptModal
        isOpen={Boolean(selectedBooking)}
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
    </div>
  );
}
