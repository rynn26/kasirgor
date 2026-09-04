'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useCourtBookingStore } from '@/lib/store/useCourtBookingStore';
import { useAppDateStore } from '@/lib/store/useAppDateStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { formatRupiah } from '@/lib/utils';
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
  CheckCircle2,
  Clock,
  Wallet,
  Pencil,
  Trash2,
  AlertTriangle,
  Ban,
  FileSpreadsheet
} from 'lucide-react';
import { BookingReceiptModal } from '@/components/booking/BookingReceiptModal';
import { EditCourtBookingModal } from '@/components/booking/EditCourtBookingModal';
import { exportCourtBookingsToExcel, printCourtBookingsPDF } from '@/lib/exportUtils';

export default function HistoryBookingPage() {
  const { bookings, loadBookings, deleteBooking, cancelBooking } = useCourtBookingStore();
  const {
    selectedDate: globalSelectedDate,
    isCustomActive,
    setSelectedDate: setGlobalDate,
  } = useAppDateStore();
  const { showToast } = useToastStore();

  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBookings();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const m = params.get('method');
      if (m === 'CASH' || m === 'QRIS') {
        setMethodFilter(m);
      }
      const d = params.get('date');
      if (d) {
        setSelectedDate(d);
        setGlobalDate(d);
      } else if (isCustomActive && globalSelectedDate) {
        setSelectedDate(globalSelectedDate);
      }
    }
  }, [loadBookings, isCustomActive, globalSelectedDate, setGlobalDate]);

  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<'ALL' | 'CASH' | 'QRIS'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SETTLED' | 'DP_PAID' | 'CANCELLED'>('ALL');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<CourtBooking | null>(null);
  const [editingBooking, setEditingBooking] = useState<CourtBooking | null>(null);
  const [deletingBooking, setDeletingBooking] = useState<CourtBooking | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper: Dapatkan tanggal transaksi / uang masuk
  const getTxDate = (b: CourtBooking) =>
    b.bookingDate || (b.dpPaidAt ? b.dpPaidAt.split('T')[0] : (b.createdAt ? b.createdAt.split('T')[0] : b.date));

  const getSettleDate = (b: CourtBooking) =>
    b.settlementPaidAt ? b.settlementPaidAt.split('T')[0] : getTxDate(b);

  // Financial Summary (menyesuaikan dengan tanggal yang dipilih jika ada)
  const activeBookings = bookings.filter((b) => {
    if (b.status === 'CANCELLED') return false;
    if (selectedDate) {
      const txDate = getTxDate(b);
      const settleDate = getSettleDate(b);
      return txDate === selectedDate || settleDate === selectedDate;
    }
    return true;
  });

  const totalRevenue = activeBookings.reduce((sum, b) => {
    if (!selectedDate) return sum + b.amountPaidTotal;
    const totalPaid = b.amountPaidTotal || 0;
    const dpAmt = b.dpAmount || 0;
    const realDp = Math.min(dpAmt, totalPaid);
    const realSettle = Math.max(0, totalPaid - realDp);
    const txDate = getTxDate(b);
    const settleDate = getSettleDate(b);

    let amt = 0;
    if (txDate === selectedDate) {
      amt += realDp;
      if (settleDate === txDate) {
        amt += realSettle;
      }
    } else if (settleDate === selectedDate) {
      amt += realSettle;
    }
    return sum + amt;
  }, 0);

  const lunasCount = activeBookings.filter((b) => b.status === 'SETTLED' || b.remainingBalance === 0).length;
  const pendingDpCount = activeBookings.filter((b) => b.status === 'DP_PAID' && b.remainingBalance > 0).length;
  const totalPiutang = activeBookings.reduce((sum, b) => sum + b.remainingBalance, 0);

  // Filtered List
  const filtered = bookings
    .filter((bkg) => {
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
        if (statusFilter === 'CANCELLED') {
          if (bkg.status !== 'CANCELLED') return false;
        } else if (statusFilter === 'SETTLED') {
          if (bkg.status !== 'SETTLED' && bkg.remainingBalance > 0) return false;
        } else if (statusFilter === 'DP_PAID') {
          if (bkg.status !== 'DP_PAID' || bkg.remainingBalance === 0) return false;
        }
      }

      // Date filter (mencocokkan tanggal transaksi kasir / uang masuk)
      if (selectedDate) {
        const txDate = getTxDate(bkg);
        const settleDate = getSettleDate(bkg);
        if (txDate !== selectedDate && settleDate !== selectedDate) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = getTxDate(a);
      const dateB = getTxDate(b);
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA); // Tanggal transaksi terbaru di atas
      }
      return (b.startTime || '').localeCompare(a.startTime || '');
    });

  const handleCancelBooking = async () => {
    if (!deletingBooking) return;
    setIsDeleting(true);
    try {
      await cancelBooking(deletingBooking.id);
      showToast('⚠️ Transaksi booking berhasil dibatalkan (Void)');
      setDeletingBooking(null);
    } catch {
      showToast('Gagal membatalkan booking');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteBooking = async () => {
    if (!deletingBooking) return;
    setIsDeleting(true);
    try {
      await deleteBooking(deletingBooking.id);
      showToast('🗑️ Transaksi booking berhasil dihapus permanen');
      setDeletingBooking(null);
    } catch {
      showToast('Gagal menghapus booking');
    } finally {
      setIsDeleting(false);
    }
  };

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
              Daftar nota, bukti DP, edit, dan pelunasan sewa lapangan GOR
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              exportCourtBookingsToExcel(selectedDate ? `Tanggal ${selectedDate}` : 'Semua Riwayat', filtered);
              showToast('Export Excel berhasil diunduh!');
            }}
            className="px-2.5 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
            title="Unduh Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            type="button"
            onClick={() => {
              printCourtBookingsPDF(selectedDate ? `Tanggal ${selectedDate}` : 'Semua Riwayat', filtered);
              showToast('Membuka PDF Cetak Laporan...');
            }}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
            title="Cetak PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <div className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
            {filtered.length} Nota
          </div>
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
            Dari {activeBookings.length} transaksi aktif
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
              ref={dateInputRef}
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                if (e.target.value) {
                  setGlobalDate(e.target.value);
                }
              }}
              onClick={(e) => {
                try {
                  (e.currentTarget as HTMLInputElement).showPicker?.();
                } catch {}
              }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
              title={selectedDate ? `Tanggal: ${selectedDate}` : 'Filter Tanggal'}
            />
            <div
              className={`p-2.5 sm:px-3 py-2.5 rounded-2xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all ${
                selectedDate
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0" />
              {selectedDate ? (
                <span className="text-[11px] font-semibold whitespace-nowrap">{selectedDate}</span>
              ) : (
                <span className="text-[11px] hidden sm:inline text-slate-600 font-medium">Tanggal</span>
              )}
            </div>
          </div>

          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate('')}
              title="Reset Tanggal"
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Date Filter Active Indicator */}
        {selectedDate && (
          <div className="flex items-center justify-between px-1 text-xs pt-0.5">
            <span className="text-slate-500 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              Tanggal: <strong className="text-slate-900 font-bold">{selectedDate}</strong>
            </span>
            <button
              type="button"
              onClick={() => setSelectedDate('')}
              className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
            >
              Semua Tanggal
            </button>
          </div>
        )}

        {/* Status Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          {[
            { id: 'ALL', label: 'Semua Status' },
            { id: 'SETTLED', label: 'Lunas' },
            { id: 'DP_PAID', label: 'DP Terbayar' },
            { id: 'CANCELLED', label: 'Dibatalkan (Void)' },
          ].map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as 'ALL' | 'SETTLED' | 'DP_PAID' | 'CANCELLED')}
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
                onClick={() => setMethodFilter(tab.id as 'ALL' | 'CASH' | 'QRIS')}
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
            const isCancelled = bkg.status === 'CANCELLED';
            const isLunas = bkg.status === 'SETTLED' || bkg.remainingBalance === 0;
            const isDP = !isLunas && !isCancelled && (bkg.status === 'DP_PAID' || bkg.dpAmount > 0);
            const sportName = bkg.communityName?.includes('Pickleball') ? 'Pickleball' : 'Badminton';
            const paymentMethodUsed = bkg.settlementPaymentMethod || bkg.dpPaymentMethod || 'Cash';

            return (
              <div
                key={bkg.id}
                onClick={() => setSelectedBooking(bkg)}
                className={`p-4 sm:p-5 rounded-3xl bg-white hover:bg-slate-50 border transition-all cursor-pointer shadow-xs group space-y-2.5 ${
                  isCancelled
                    ? 'border-red-200/80 bg-red-50/20 opacity-80'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Baris 1: Status Badge & Action Buttons */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isCancelled ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-600">
                        VOID
                      </span>
                    ) : isLunas ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                        Lunas
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                        DP
                      </span>
                    )}
                    {(bkg.memberType === 'MEMBER' || bkg.communityName?.includes('Member')) && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 border border-blue-200">
                        Member
                      </span>
                    )}
                    {getTxDate(bkg) !== bkg.date && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                        Order: {getTxDate(bkg)}
                      </span>
                    )}
                  </div>

                  {/* Tombol Edit & Hapus */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      title="Edit Booking"
                      onClick={() => setEditingBooking(bkg)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Hapus / Batalkan"
                      onClick={() => setDeletingBooking(bkg)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Baris 2: Nama Customer & Total Nominal */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      isCancelled
                        ? 'bg-red-50 text-red-500 border-red-200'
                        : isLunas 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className={`font-black text-sm sm:text-base truncate group-hover:text-emerald-800 transition-colors ${
                        isCancelled ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}>
                        {bkg.customerName}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate">
                        {sportName} · {bkg.courtName}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`text-base font-black ${
                      isCancelled ? 'line-through text-slate-400' : 'text-slate-900'
                    }`}>
                      {formatRupiah(bkg.amountPaidTotal)}
                    </div>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {paymentMethodUsed}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Baris 3: Jadwal Main (Lega 100%) + Sisa Tagihan + Lihat Nota */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5 min-w-0 truncate font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      Main: <strong className="text-slate-800 font-bold">{bkg.date}</strong> · {bkg.startTime} - {bkg.endTime} ({bkg.durationHours} Jam)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isDP && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        Sisa: {formatRupiah(bkg.remainingBalance)}
                      </span>
                    )}
                    <span className="text-emerald-700 font-bold text-[11px] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      Lihat Nota
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
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
        onEdit={(b) => {
          setSelectedBooking(null);
          setEditingBooking(b);
        }}
        onDelete={(b) => {
          setSelectedBooking(null);
          setDeletingBooking(b);
        }}
      />

      {/* Edit Booking Modal */}
      <EditCourtBookingModal
        isOpen={Boolean(editingBooking)}
        booking={editingBooking}
        onClose={() => setEditingBooking(null)}
        onSuccess={(updated) => {
          if (selectedBooking?.id === updated.id) {
            setSelectedBooking(updated);
          }
        }}
      />

      {/* Delete / Void Confirmation Modal */}
      {deletingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-5 border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-900 text-base">
                Kelola Pembatalan / Hapus
              </h3>
              <p className="text-xs text-slate-500">
                Pilih tindakan untuk booking <strong className="text-slate-800">{deletingBooking.customerName}</strong>:
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleCancelBooking}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Ban className="w-4 h-4" />
                <span>Batalkan Booking (Tandai Void)</span>
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteBooking}
                className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Permanen dari Database</span>
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingBooking(null)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Tutup / Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
