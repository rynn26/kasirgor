'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Wallet,
  Store,
  CalendarCheck,
  Banknote,
  QrCode,
  Copy,
  Check,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { useCourtBookingStore } from '@/lib/store/useCourtBookingStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { formatRupiah } from '@/lib/utils';

interface OwnerDailyRevenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
}

export const OwnerDailyRevenueModal: React.FC<OwnerDailyRevenueModalProps> = ({
  isOpen,
  onClose,
  initialDate,
}) => {
  const { transactions } = useTransactionStore();
  const { bookings } = useCourtBookingStore();
  const { showToast } = useToastStore();

  const todayStr = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);
  const [isCopied, setIsCopied] = useState(false);
  const dateInputRef = React.useRef<HTMLInputElement>(null);

  // Perhitungan Data Pendapatan Berdasarkan Tanggal yang Dipilih
  const revenueSummary = useMemo(() => {
    // 1. KANTIN / TOKO & F&B
    const kantinTx = transactions.filter(
      (t) => t.status === 'COMPLETED' && t.createdAt.split('T')[0] === selectedDate
    );

    const kantinCash = kantinTx
      .filter((t) => t.paymentMethod === 'CASH')
      .reduce((sum, t) => sum + t.grandTotal, 0);

    const kantinQris = kantinTx
      .filter((t) => t.paymentMethod === 'QRIS')
      .reduce((sum, t) => sum + t.grandTotal, 0);

    const kantinTotal = kantinCash + kantinQris;
    const kantinTxCount = kantinTx.length;

    // 2. ARENA LAPANGAN (DP BOOKING & PELUNASAN)
    let dpCash = 0;
    let dpQris = 0;
    let dpCount = 0;

    let settleCash = 0;
    let settleQris = 0;
    let settleCount = 0;

    bookings.forEach((b) => {
      if (b.status === 'CANCELLED') return;

      const totalPaid = b.amountPaidTotal || 0;
      const dpAmt = b.dpAmount || 0;

      // Porsi DP yang sesungguhnya dibayarkan
      const realDp = Math.min(dpAmt, totalPaid);
      // Porsi Pelunasan yang sesungguhnya dibayarkan setelah DP
      const realSettle = Math.max(0, totalPaid - realDp);

      // Tanggal DP diterima
      const dpDate = b.dpPaidAt ? b.dpPaidAt.split('T')[0] : (b.bookingDate || b.date);
      if (dpDate === selectedDate && realDp > 0) {
        dpCount += 1;
        if (b.dpPaymentMethod === 'CASH') {
          dpCash += realDp;
        } else {
          dpQris += realDp;
        }
      }

      // Tanggal Pelunasan diterima
      const settleDate = b.settlementPaidAt ? b.settlementPaidAt.split('T')[0] : b.date;
      if (settleDate === selectedDate && realSettle > 0) {
        settleCount += 1;
        if (b.settlementPaymentMethod === 'CASH') {
          settleCash += realSettle;
        } else {
          settleQris += realSettle;
        }
      }
    });

    const dpTotal = dpCash + dpQris;
    const settleTotal = settleCash + settleQris;

    // 3. REKAP TOTAL CASH & QRIS
    const totalCash = kantinCash + dpCash + settleCash;
    const totalQris = kantinQris + dpQris + settleQris;
    const grandTotal = totalCash + totalQris;

    return {
      kantinCash,
      kantinQris,
      kantinTotal,
      kantinTxCount,

      dpCash,
      dpQris,
      dpTotal,
      dpCount,

      settleCash,
      settleQris,
      settleTotal,
      settleCount,

      totalCash,
      totalQris,
      grandTotal,
    };
  }, [transactions, bookings, selectedDate]);

  if (!isOpen) return null;

  // Format label tanggal
  const formattedDateLabel = (() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const dayName = dayNames[dateObj.getDay()];
      const isToday = selectedDate === todayStr;
      return `${isToday ? 'Hari Ini — ' : ''}${dayName}, ${d} ${dateObj.toLocaleString('id-ID', { month: 'long' })} ${y}`;
    } catch {
      return selectedDate;
    }
  })();

  const handleCopySummary = () => {
    const text = `📊 *REKAP OMSET OWNER GOR*
📅 Tanggal: ${formattedDateLabel}

*1. KANTIN / KASIR TOKO*
- Cash (Tunai): ${formatRupiah(revenueSummary.kantinCash)}
- QRIS: ${formatRupiah(revenueSummary.kantinQris)}
👉 Subtotal Kantin: ${formatRupiah(revenueSummary.kantinTotal)} (${revenueSummary.kantinTxCount} nota)

*2. DP BOOKING LAPANGAN*
- Cash (Tunai): ${formatRupiah(revenueSummary.dpCash)}
- QRIS: ${formatRupiah(revenueSummary.dpQris)}
👉 Subtotal DP: ${formatRupiah(revenueSummary.dpTotal)} (${revenueSummary.dpCount} tim)

*3. PELUNASAN SEWA LAPANGAN*
- Cash (Tunai): ${formatRupiah(revenueSummary.settleCash)}
- QRIS: ${formatRupiah(revenueSummary.settleQris)}
👉 Subtotal Pelunasan: ${formatRupiah(revenueSummary.settleTotal)} (${revenueSummary.settleCount} tim)

━━━━━━━━━━━━━━━━━━━━
💰 *TOTAL PER METODE PEMBAYARAN:*
💵 *CASH (TUNAI):* ${formatRupiah(revenueSummary.totalCash)}
📱 *QRIS:* ${formatRupiah(revenueSummary.totalQris)}
━━━━━━━━━━━━━━━━━━━━
⭐ *GRAND TOTAL (CASH + QRIS):*
*${formatRupiah(revenueSummary.grandTotal)}*`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    showToast('Ringkasan omset berhasil disalin ke clipboard!');
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#f8fafc] rounded-[28px] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-slate-900 text-base leading-tight">
                  Rekap Omset Keseluruhan
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                  Owner
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Kantin + DP Booking + Pelunasan Lapangan
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">

          {/* Date Selector Banner */}
          <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Periode Rekap
                </span>
                <span className="text-xs font-bold text-slate-900 line-clamp-1">
                  {formattedDateLabel}
                </span>
              </div>
            </div>

            <div className="relative shrink-0">
              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                  }
                }}
                onClick={(e) => {
                  try {
                    (e.currentTarget as HTMLInputElement).showPicker?.();
                  } catch {}
                }}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                title="Ganti Tanggal"
              />
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-slate-200"
              >
                <span>Ubah Tanggal</span>
              </button>
            </div>
          </div>

          {/* Rincian 3 Sumber Pendapatan */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Rincian Sumber Omset
            </div>

            {/* 1. KANTIN / KASIR */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-red-50 text-[#a62512] flex items-center justify-center">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">1. Kantin / Kasir Toko</h4>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {revenueSummary.kantinTxCount} transaksi selesai
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-slate-900 block">
                    {formatRupiah(revenueSummary.kantinTotal)}
                  </span>
                  <span className="text-[10px] text-slate-400">Subtotal</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="text-slate-600 text-[11px] font-medium">Cash (Tunai)</span>
                  </div>
                  <span className="font-bold text-slate-900 text-xs">
                    {formatRupiah(revenueSummary.kantinCash)}
                  </span>
                </div>

                <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-[#a62512] shrink-0" />
                    <span className="text-slate-600 text-[11px] font-medium">QRIS</span>
                  </div>
                  <span className="font-bold text-slate-900 text-xs">
                    {formatRupiah(revenueSummary.kantinQris)}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. DP BOOKING LAPANGAN */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <CalendarCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">2. DP Booking Lapangan</h4>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {revenueSummary.dpCount} tim bayar DP
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-slate-900 block">
                    {formatRupiah(revenueSummary.dpTotal)}
                  </span>
                  <span className="text-[10px] text-slate-400">Subtotal</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="text-slate-600 text-[11px] font-medium">Cash (Tunai)</span>
                  </div>
                  <span className="font-bold text-slate-900 text-xs">
                    {formatRupiah(revenueSummary.dpCash)}
                  </span>
                </div>

                <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span className="text-slate-600 text-[11px] font-medium">QRIS</span>
                  </div>
                  <span className="font-bold text-slate-900 text-xs">
                    {formatRupiah(revenueSummary.dpQris)}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. PELUNASAN LAPANGAN */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">3. Pelunasan Sewa Lapangan</h4>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {revenueSummary.settleCount} tim lunas
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-slate-900 block">
                    {formatRupiah(revenueSummary.settleTotal)}
                  </span>
                  <span className="text-[10px] text-slate-400">Subtotal</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="text-slate-600 text-[11px] font-medium">Cash (Tunai)</span>
                  </div>
                  <span className="font-bold text-slate-900 text-xs">
                    {formatRupiah(revenueSummary.settleCash)}
                  </span>
                </div>

                <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                    <span className="text-slate-600 text-[11px] font-medium">QRIS</span>
                  </div>
                  <span className="font-bold text-slate-900 text-xs">
                    {formatRupiah(revenueSummary.settleQris)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* REKAP METODE BAYAR: CASH & QRIS */}
          <div className="space-y-2.5 pt-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Rekapitulasi Berdasarkan Metode Bayar
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Card TOTAL CASH */}
              <div className="bg-white rounded-2xl p-4 border border-amber-200/90 shadow-2xs space-y-2 bg-gradient-to-b from-amber-50/40 to-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-700">
                    <Banknote className="w-4 h-4" />
                    <span className="text-xs font-bold">TOTAL CASH (TUNAI)</span>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Fisik Tunai
                  </span>
                </div>

                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {formatRupiah(revenueSummary.totalCash)}
                </div>

                <div className="pt-1.5 border-t border-slate-100 space-y-1 text-[11px] text-slate-500 font-medium">
                  <div className="flex justify-between">
                    <span>Kantin:</span>
                    <span className="font-semibold text-slate-700">{formatRupiah(revenueSummary.kantinCash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DP Booking:</span>
                    <span className="font-semibold text-slate-700">{formatRupiah(revenueSummary.dpCash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pelunasan:</span>
                    <span className="font-semibold text-slate-700">{formatRupiah(revenueSummary.settleCash)}</span>
                  </div>
                </div>
              </div>

              {/* Card TOTAL QRIS */}
              <div className="bg-white rounded-2xl p-4 border border-blue-200/90 shadow-2xs space-y-2 bg-gradient-to-b from-blue-50/40 to-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-blue-700">
                    <QrCode className="w-4 h-4" />
                    <span className="text-xs font-bold">TOTAL QRIS (NON-TUNAI)</span>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    Rekening
                  </span>
                </div>

                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {formatRupiah(revenueSummary.totalQris)}
                </div>

                <div className="pt-1.5 border-t border-slate-100 space-y-1 text-[11px] text-slate-500 font-medium">
                  <div className="flex justify-between">
                    <span>Kantin:</span>
                    <span className="font-semibold text-slate-700">{formatRupiah(revenueSummary.kantinQris)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DP Booking:</span>
                    <span className="font-semibold text-slate-700">{formatRupiah(revenueSummary.dpQris)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pelunasan:</span>
                    <span className="font-semibold text-slate-700">{formatRupiah(revenueSummary.settleQris)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GRAND TOTAL REVENUE CARD (BAWAH) */}
          <div className="w-full bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 text-white rounded-[24px] p-5 shadow-lg border border-slate-700/50 space-y-3 relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-amber-500/10 pointer-events-none blur-2xl" />
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                <span>TOTAL KESELURUHAN (QRIS + CASH)</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-bold">
                Semua Unit
              </span>
            </div>

            <div className="text-[32px] sm:text-[38px] font-black tracking-tight leading-none text-white">
              {formatRupiah(revenueSummary.grandTotal)}
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="text-amber-300 font-semibold">
                  💵 Cash: {formatRupiah(revenueSummary.totalCash)}
                </span>
                <span className="text-blue-300 font-semibold">
                  📱 QRIS: {formatRupiah(revenueSummary.totalQris)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200/80 flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopySummary}
            className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-200"
          >
            {isCopied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                <span className="text-emerald-700">Tersalin ke Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-600" />
                <span>Salin Ringkasan WhatsApp</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
