'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Store,
  Banknote,
  QrCode,
  Copy,
  Check,
  Calendar,
  BarChart3,
  Printer,
  FileSpreadsheet,
} from 'lucide-react';
import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { useCourtBookingStore } from '@/lib/store/useCourtBookingStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { formatRupiah } from '@/lib/utils';
import { getBookingPaymentItemsInPeriod, getJakartaToday, toJakartaDateString } from '@/lib/bookingUtils';
import { printCombinedReportPDF, exportCombinedReportToExcel } from '@/lib/exportUtils';
import { useAppDateStore } from '@/lib/store/useAppDateStore';
import { CourtBooking } from '@/types/booking';

interface OwnerDailyRevenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  initialStartDate?: string;
  initialEndDate?: string;
  onDateChange?: (start: string, end: string) => void;
}

export const OwnerDailyRevenueModal: React.FC<OwnerDailyRevenueModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  initialStartDate,
  initialEndDate,
  onDateChange,
}) => {
  const { transactions } = useTransactionStore();
  const { bookings } = useCourtBookingStore();
  const { showToast } = useToastStore();

  const {
    selectedDate: globalSelectedDate,
    customStartDate: globalCustomStartDate,
    customEndDate: globalCustomEndDate,
    setSelectedDate: setGlobalSelectedDate,
    setDateRange: setGlobalDateRange,
  } = useAppDateStore();

  const todayStr = useMemo(() => getJakartaToday(), []);

  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || globalSelectedDate || todayStr);
  const [startDate, setStartDate] = useState<string>(initialStartDate || initialDate || globalCustomStartDate || todayStr);
  const [endDate, setEndDate] = useState<string>(initialEndDate || initialDate || globalCustomEndDate || todayStr);
  const [isCopied, setIsCopied] = useState(false);
  const dateInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      const s = initialStartDate || initialDate || globalCustomStartDate || globalSelectedDate || todayStr;
      const e = initialEndDate || initialDate || globalCustomEndDate || globalSelectedDate || todayStr;

      if (s !== e) {
        setDateMode('range');
        const [realS, realE] = s <= e ? [s, e] : [e, s];
        setStartDate(realS);
        setEndDate(realE);
        setSelectedDate(realS);
      } else {
        setDateMode('single');
        setSelectedDate(s);
        setStartDate(s);
        setEndDate(s);
      }
    }
  }, [isOpen, initialDate, initialStartDate, initialEndDate, globalSelectedDate, globalCustomStartDate, globalCustomEndDate, todayStr]);

  const handleSingleDateChange = (newDate: string) => {
    if (!newDate) return;
    setSelectedDate(newDate);
    setStartDate(newDate);
    setEndDate(newDate);
    setGlobalSelectedDate(newDate);
    onDateChange?.(newDate, newDate);
  };

  const handleQuickToday = () => {
    setSelectedDate(todayStr);
    setStartDate(todayStr);
    setEndDate(todayStr);
    setGlobalSelectedDate(todayStr);
    onDateChange?.(todayStr, todayStr);
  };

  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    if (newStart && endDate) {
      const [s, e] = newStart <= endDate ? [newStart, endDate] : [endDate, newStart];
      setGlobalDateRange(s, e);
      onDateChange?.(s, e);
    }
  };

  const handleEndDateChange = (newEnd: string) => {
    setEndDate(newEnd);
    if (startDate && newEnd) {
      const [s, e] = startDate <= newEnd ? [startDate, newEnd] : [newEnd, startDate];
      setGlobalDateRange(s, e);
      onDateChange?.(s, e);
    }
  };

  const handleModeChange = (newMode: 'single' | 'range') => {
    setDateMode(newMode);
    if (newMode === 'single') {
      setGlobalSelectedDate(selectedDate);
      onDateChange?.(selectedDate, selectedDate);
    } else {
      const [s, e] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate];
      setGlobalDateRange(s, e);
      onDateChange?.(s, e);
    }
  };

  const effectiveStart = dateMode === 'single' ? selectedDate : (startDate <= endDate ? startDate : endDate);
  const effectiveEnd = dateMode === 'single' ? selectedDate : (startDate <= endDate ? endDate : startDate);

  // Perhitungan Data Pendapatan Berdasarkan Tanggal/Rentang yang Dipilih
  const revenueSummary = useMemo(() => {
    // 1. KANTIN / TOKO & F&B
    const kantinTx = transactions.filter((t) => {
      if (t.status !== 'COMPLETED') return false;
      const txDate = toJakartaDateString(t.createdAt);
      return txDate >= effectiveStart && txDate <= effectiveEnd;
    });

    const kantinCash = kantinTx
      .filter((t) => t.paymentMethod === 'CASH')
      .reduce((sum, t) => sum + t.grandTotal, 0);

    const kantinQris = kantinTx
      .filter((t) => t.paymentMethod === 'QRIS')
      .reduce((sum, t) => sum + t.grandTotal, 0);

    const kantinTotal = kantinCash + kantinQris;
    const kantinTxCount = kantinTx.length;

    // 2. ARENA LAPANGAN (DP & PELUNASAN DIPISAH BADMINTON & PICKLEBALL)
    let badmintonDpCash = 0;
    let badmintonDpQris = 0;
    let badmintonSettleCash = 0;
    let badmintonSettleQris = 0;

    let pickleballDpCash = 0;
    let pickleballDpQris = 0;
    let pickleballSettleCash = 0;
    let pickleballSettleQris = 0;

    let dpCount = 0;
    let settleCount = 0;

    const isPickleballBooking = (b: CourtBooking) => {
      const cType = (b.courtType || '').toLowerCase();
      const cName = (b.courtName || '').toLowerCase();
      const comm = (b.communityName || '').toLowerCase();
      const notes = (b.notes || '').toLowerCase();
      return cType.includes('pickle') || cName.includes('pickle') || comm.includes('pickle') || notes.includes('pickle');
    };

    bookings.forEach((b) => {
      if (b.status === 'CANCELLED') return;
      const items = getBookingPaymentItemsInPeriod(b, effectiveStart, effectiveEnd);
      const isPickle = isPickleballBooking(b);

      items.forEach((it) => {
        if (it.type === 'DP') {
          dpCount += 1;
          if (isPickle) {
            if (it.method === 'CASH') pickleballDpCash += it.amount;
            else pickleballDpQris += it.amount;
          } else {
            if (it.method === 'CASH') badmintonDpCash += it.amount;
            else badmintonDpQris += it.amount;
          }
        } else if (it.type === 'PELUNASAN' || it.type === 'LUNAS_LANGSUNG') {
          settleCount += 1;
          if (isPickle) {
            if (it.method === 'CASH') pickleballSettleCash += it.amount;
            else pickleballSettleQris += it.amount;
          } else {
            if (it.method === 'CASH') badmintonSettleCash += it.amount;
            else badmintonSettleQris += it.amount;
          }
        }
      });
    });

    // Subtotal Lapangan
    const badmintonTotalCash = badmintonDpCash + badmintonSettleCash;
    const badmintonTotalQris = badmintonDpQris + badmintonSettleQris;
    const badmintonTotal = badmintonTotalCash + badmintonTotalQris;

    const pickleballTotalCash = pickleballDpCash + pickleballSettleCash;
    const pickleballTotalQris = pickleballDpQris + pickleballSettleQris;
    const pickleballTotal = pickleballTotalCash + pickleballTotalQris;

    const lapanganCash = badmintonTotalCash + pickleballTotalCash;
    const lapanganQris = badmintonTotalQris + pickleballTotalQris;
    const lapanganTotal = badmintonTotal + pickleballTotal;
    const lapanganTxCount = dpCount + settleCount;

    // 3. REKAP TOTAL CASH & QRIS
    const totalCash = kantinCash + lapanganCash;
    const totalQris = kantinQris + lapanganQris;
    const grandTotal = totalCash + totalQris;

    return {
      kantinCash,
      kantinQris,
      kantinTotal,
      kantinTxCount,

      badmintonDpCash,
      badmintonSettleCash,
      badmintonTotalCash,
      badmintonDpQris,
      badmintonSettleQris,
      badmintonTotalQris,
      badmintonTotal,

      pickleballDpCash,
      pickleballSettleCash,
      pickleballTotalCash,
      pickleballDpQris,
      pickleballSettleQris,
      pickleballTotalQris,
      pickleballTotal,

      lapanganCash,
      lapanganQris,
      lapanganTotal,
      lapanganTxCount,

      totalCash,
      totalQris,
      grandTotal,
    };
  }, [transactions, bookings, effectiveStart, effectiveEnd]);

  if (!isOpen) return null;

  // Format label tanggal
  const formatIndoDate = (dStr: string) => {
    try {
      const [y, m, d] = dStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const dayName = dayNames[dateObj.getDay()];
      return `${dayName}, ${d} ${dateObj.toLocaleString('id-ID', { month: 'long' })} ${y}`;
    } catch {
      return dStr;
    }
  };

  const formatShortDate = (dStr: string) => {
    try {
      const [y, m, d] = dStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return `${d} ${dateObj.toLocaleString('id-ID', { month: 'short' })} ${y}`;
    } catch {
      return dStr;
    }
  };

  const formattedDateLabel = (() => {
    if (dateMode === 'single') {
      return formatIndoDate(selectedDate);
    }
    return `${formatShortDate(effectiveStart)} s/d ${formatShortDate(effectiveEnd)}`;
  })();

  const periodLabelForExport = (() => {
    if (dateMode === 'single') {
      return `Tanggal ${formatShortDate(selectedDate)}`;
    }
    return `${formatShortDate(effectiveStart)} s/d ${formatShortDate(effectiveEnd)}`;
  })();

  const handleExportPDF = () => {
    printCombinedReportPDF(
      periodLabelForExport,
      transactions,
      bookings,
      effectiveStart,
      effectiveEnd
    );
    showToast('Membuka format cetak PDF Laporan Omset Keseluruhan...');
  };

  const handleExportExcel = () => {
    exportCombinedReportToExcel(
      periodLabelForExport,
      transactions,
      bookings,
      effectiveStart,
      effectiveEnd
    );
    showToast('Laporan Excel Omset Keseluruhan berhasil diunduh!');
  };

  const handleCopySummary = () => {
    const text = `📊 *REKAP OMSET HARIAN GOR*
📅 Tanggal: ${formattedDateLabel}

💵 *CASH (Uang Fisik di Kas): ${formatRupiah(revenueSummary.totalCash)}*
• Kantin Cash: ${formatRupiah(revenueSummary.kantinCash)}
• Badminton:
  - DP Badminton Cash: ${formatRupiah(revenueSummary.badmintonDpCash)}
  - Pelunasan Badminton Cash: ${formatRupiah(revenueSummary.badmintonSettleCash)}
• Pickleball:
  - DP Pickleball Cash: ${formatRupiah(revenueSummary.pickleballDpCash)}
  - Pelunasan Pickleball Cash: ${formatRupiah(revenueSummary.pickleballSettleCash)}

📱 *QRIS (Masuk ke Rekening): ${formatRupiah(revenueSummary.totalQris)}*
• Kantin QRIS: ${formatRupiah(revenueSummary.kantinQris)}
• Badminton:
  - DP Badminton QRIS: ${formatRupiah(revenueSummary.badmintonDpQris)}
  - Pelunasan Badminton QRIS: ${formatRupiah(revenueSummary.badmintonSettleQris)}
• Pickleball:
  - DP Pickleball QRIS: ${formatRupiah(revenueSummary.pickleballDpQris)}
  - Pelunasan Pickleball QRIS: ${formatRupiah(revenueSummary.pickleballSettleQris)}

━━━━━━━━━━━━━━━━━━━━
⭐ *TOTAL OMZET: ${formatRupiah(revenueSummary.grandTotal)}*
━━━━━━━━━━━━━━━━━━━━`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    showToast('Ringkasan omset berhasil disalin ke clipboard!');
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#f8fafc] rounded-[32px] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-200/90 animate-in zoom-in-95 duration-150">
        
        {/* ============================================================ */}
        {/* MODAL HEADER — Sesuai Desain: Rekap Omset Harian & Badge Tanggal */}
        {/* ============================================================ */}
        <div className="px-5 py-4 sm:px-7 sm:py-5 bg-white border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Rekap Omset Harian
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Button Hari Ini jika sedang melihat tanggal lampau */}
            {dateMode === 'single' && selectedDate !== todayStr && (
              <button
                type="button"
                onClick={handleQuickToday}
                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-all cursor-pointer border border-amber-200"
                title="Kembali ke Hari Ini"
              >
                Hari Ini
              </button>
            )}

            {/* Date Pill Picker */}
            <div className="relative">
              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) handleSingleDateChange(e.target.value);
                }}
                onClick={(e) => {
                  try {
                    (e.currentTarget as HTMLInputElement).showPicker?.();
                  } catch {}
                }}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                title="Pilih Tanggal"
              />
              <button
                type="button"
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="truncate">{formattedDateLabel}</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* MODAL BODY — 2 KOLOM (CASH vs QRIS) & BANNER TOTAL DI BAWAH */}
        {/* ============================================================ */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          
          {/* Opsi Switch Mode Harian / Rentang (Opsional untuk Fleksibilitas) */}
          <div className="flex items-center justify-between bg-white px-3.5 py-2 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Mode Laporan:
            </span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => handleModeChange('single')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  dateMode === 'single'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Harian
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('range')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  dateMode === 'range'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Rentang Tanggal
              </button>
            </div>
          </div>

          {dateMode === 'range' && (
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Dari Tanggal</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      if (e.target.value) handleStartDateChange(e.target.value);
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      if (e.target.value) handleEndDateChange(e.target.value);
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* DUA KOLOM: CASH (Kiri) & QRIS (Kanan) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            
            {/* ======================================================== */}
            {/* KARTU KIRI: CASH (Uang Fisik di Kas) */}
            {/* ======================================================== */}
            <div className="bg-[#FFFDF5] border border-amber-200/80 rounded-[28px] p-4.5 sm:p-5 shadow-xs flex flex-col justify-between space-y-3.5">
              
              {/* Header Kartu Cash */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#FDF0CD] text-[#925B03] flex items-center justify-center shrink-0 shadow-2xs">
                  <Banknote className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                    CASH
                  </h3>
                  <p className="text-xs font-medium text-slate-500">
                    Uang Fisik di Kas
                  </p>
                </div>
              </div>

              {/* Total Cash Box */}
              <div className="bg-[#FFF6DB] border border-[#FBE3A4] rounded-2xl p-3.5 sm:p-4">
                <span className="text-[11px] font-black text-[#946109] uppercase tracking-wider block">
                  Total Cash
                </span>
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight block mt-0.5">
                  {formatRupiah(revenueSummary.totalCash)}
                </span>
              </div>

              {/* Kantin Cash Row */}
              <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-amber-200/60 shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <Store className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-800">
                    Kantin Cash
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-black text-slate-900">
                  {formatRupiah(revenueSummary.kantinCash)}
                </span>
              </div>

              {/* Badminton Cash Section */}
              <div className="bg-[#F4FAF6] border border-emerald-100/90 rounded-2xl p-3 sm:p-3.5 space-y-2">
                <div>
                  <span className="inline-block text-[11px] font-black text-emerald-900 bg-emerald-100/80 px-2.5 py-0.5 rounded-lg">
                    Badminton
                  </span>
                </div>
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">DP Badminton Cash</span>
                    <span className="font-black text-slate-900">{formatRupiah(revenueSummary.badmintonDpCash)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-100/60">
                    <span className="font-semibold text-slate-600">Pelunasan Badminton Cash</span>
                    <span className="font-black text-slate-900">{formatRupiah(revenueSummary.badmintonSettleCash)}</span>
                  </div>
                </div>
              </div>

              {/* Pickleball Cash Section */}
              <div className="bg-[#F4FAF6] border border-emerald-100/90 rounded-2xl p-3 sm:p-3.5 space-y-2">
                <div>
                  <span className="inline-block text-[11px] font-black text-emerald-900 bg-emerald-100/80 px-2.5 py-0.5 rounded-lg">
                    Pickleball
                  </span>
                </div>
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">DP Pickleball Cash</span>
                    <span className="font-black text-slate-900">{formatRupiah(revenueSummary.pickleballDpCash)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-100/60">
                    <span className="font-semibold text-slate-600">Pelunasan Pickleball Cash</span>
                    <span className="font-black text-slate-900">{formatRupiah(revenueSummary.pickleballSettleCash)}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* ======================================================== */}
            {/* KARTU KANAN: QRIS (Masuk ke Rekening) */}
            {/* ======================================================== */}
            <div className="bg-[#F5F9FF] border border-sky-200/80 rounded-[28px] p-4.5 sm:p-5 shadow-xs flex flex-col justify-between space-y-3.5">
              
              {/* Header Kartu QRIS */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#E1EEFD] text-[#0B63C5] flex items-center justify-center shrink-0 shadow-2xs">
                  <QrCode className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                    QRIS
                  </h3>
                  <p className="text-xs font-medium text-slate-500">
                    Masuk ke Rekening
                  </p>
                </div>
              </div>

              {/* Total QRIS Box */}
              <div className="bg-[#E8F2FD] border border-[#CDE3FC] rounded-2xl p-3.5 sm:p-4">
                <span className="text-[11px] font-black text-[#0B63C5] uppercase tracking-wider block">
                  Total QRIS
                </span>
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight block mt-0.5">
                  {formatRupiah(revenueSummary.totalQris)}
                </span>
              </div>

              {/* Kantin QRIS Row */}
              <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-sky-200/60 shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                    <Store className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-800">
                    Kantin QRIS
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-black text-slate-900">
                  {formatRupiah(revenueSummary.kantinQris)}
                </span>
              </div>

              {/* Badminton QRIS Section */}
              <div className="bg-[#EEF6FE] border border-sky-100/90 rounded-2xl p-3 sm:p-3.5 space-y-2">
                <div>
                  <span className="inline-block text-[11px] font-black text-sky-900 bg-sky-100/80 px-2.5 py-0.5 rounded-lg">
                    Badminton
                  </span>
                </div>
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">DP Badminton QRIS</span>
                    <span className="font-black text-slate-900">{formatRupiah(revenueSummary.badmintonDpQris)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-sky-100/60">
                    <span className="font-semibold text-slate-600">Pelunasan Badminton QRIS</span>
                    <span className="font-black text-slate-900">{formatRupiah(revenueSummary.badmintonSettleQris)}</span>
                  </div>
                </div>
              </div>

              {/* Pickleball QRIS Section */}
              <div className="bg-[#EEF6FE] border border-sky-100/90 rounded-2xl p-3 sm:p-3.5 space-y-2">
                <div>
                  <span className="inline-block text-[11px] font-black text-sky-900 bg-sky-100/80 px-2.5 py-0.5 rounded-lg">
                    Pickleball
                  </span>
                </div>
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">DP Pickleball QRIS</span>
                    <span className="font-black text-slate-900">{formatRupiah(revenueSummary.pickleballDpQris)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-sky-100/60">
                    <span className="font-semibold text-slate-600">Pelunasan Pickleball QRIS</span>
                    <span className="font-black text-slate-900">{formatRupiah(revenueSummary.pickleballSettleQris)}</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* ============================================================ */}
          {/* BANNER BAWAH: TOTAL OMZET HARI INI (Hijau Pastel Sesuai Desain) */}
          {/* ============================================================ */}
          <div className="bg-[#EDF8F2] border border-emerald-200/90 rounded-[26px] p-4.5 sm:p-5 flex items-center gap-4 sm:gap-5 shadow-xs">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#CEEEDC] text-[#0A7347] flex items-center justify-center shrink-0 shadow-2xs">
              <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] sm:text-xs font-black text-[#0A7347] uppercase tracking-wider block">
                {dateMode === 'single' ? 'TOTAL OMZET HARI INI' : 'TOTAL OMZET PERIODE INI'}
              </span>
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight block mt-0.5">
                {formatRupiah(revenueSummary.grandTotal)}
              </span>
            </div>
          </div>

        </div>

        {/* ============================================================ */}
        {/* MODAL ACTIONS FOOTER (Export PDF, Excel, WhatsApp, Tutup) */}
        {/* ============================================================ */}
        <div className="px-5 py-4 sm:px-7 sm:py-4 bg-white border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportPDF}
              className="py-2 px-3 sm:px-3.5 rounded-xl bg-red-50 hover:bg-red-100 text-[#a62512] font-bold text-xs flex items-center gap-1.5 border border-red-200 transition-all cursor-pointer shadow-2xs active:scale-95"
              title="Cetak PDF"
            >
              <Printer className="w-3.5 h-3.5 text-red-600" />
              <span>Export PDF</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="py-2 px-3 sm:px-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 border border-emerald-200 transition-all cursor-pointer shadow-2xs active:scale-95"
              title="Unduh Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="py-2 px-3 sm:px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200 active:scale-95"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                  <span className="text-emerald-700">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span>Salin WA</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 sm:px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
