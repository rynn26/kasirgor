'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, QrCode, Banknote, Award, AlertCircle, Calendar } from 'lucide-react';
import { AcademyTransaction, AcademyPaymentMethod } from '@/types/academy';
import { settleAcademyTransaction } from '@/lib/db/academy';
import { formatRupiah, formatDate } from '@/lib/utils';
import { useToastStore } from '@/lib/store/useToastStore';
import { getJakartaToday } from '@/lib/bookingUtils';

interface AcademySettlementModalProps {
  isOpen: boolean;
  transaction: AcademyTransaction | null;
  onClose: () => void;
  onSuccess: (updated: AcademyTransaction) => void;
}

export const AcademySettlementModal: React.FC<AcademySettlementModalProps> = ({
  isOpen,
  transaction,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToastStore();
  const [paymentMethod, setPaymentMethod] = useState<AcademyPaymentMethod>('CASH');
  const [settledDate, setSettledDate] = useState<string>(getJakartaToday());
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !transaction) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      // Get current cashier from localStorage or fallback
      let currentCashier = 'Yuli';
      try {
        const stored = localStorage.getItem('kasirgor_current_cashier');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.name) currentCashier = parsed.name;
        }
      } catch {}

      const settledAtIso = settledDate === getJakartaToday()
        ? new Date().toISOString()
        : `${settledDate}T12:00:00+07:00`;

      const updated = await settleAcademyTransaction(transaction.id, {
        settlementAmount: transaction.remainingAmount,
        paymentMethod,
        cashierName: currentCashier,
        settledAt: settledAtIso,
      });

      showToast(`Pelunasan untuk ${transaction.customerName} berhasil disimpan!`);
      onSuccess(updated);
      onClose();
    } catch (err) {
      console.error('Error settling academy transaction:', err);
      showToast('Gagal memproses pelunasan. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base leading-tight">
                Pelunasan Sinyo Academy
              </h3>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                {transaction.customerName} • {transaction.program}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          
          {/* Siswa Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900">{transaction.customerName}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                {transaction.program} {transaction.package || ''}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-200/60">
              <div className="flex justify-between">
                <span>Total Biaya Paket:</span>
                <span className="font-bold text-slate-800">{formatRupiah(transaction.feeAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>DP yang Sudah Dibayar ({formatDate(transaction.createdAt, false)}):</span>
                <span className="font-bold text-emerald-700">✓ {formatRupiah(transaction.dpAmount)} ({transaction.paymentMethod})</span>
              </div>
            </div>
          </div>

          {/* Sisa Tagihan Pelunasan Banner */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-center space-y-1">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
              Nominal Pelunasan Hari Ini
            </span>
            <div className="text-2xl font-black text-emerald-800">
              {formatRupiah(transaction.remainingAmount)}
            </div>
            <span className="text-[10px] text-emerald-600 block">
              Uang ini akan otomatis masuk ke laporan kasir hari ini.
            </span>
          </div>

          {/* Metode Pembayaran Pelunasan */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Pilih Metode Pembayaran Pelunasan:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  paymentMethod === 'CASH'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs ring-2 ring-amber-400/20'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Banknote className="w-4 h-4 text-[#f59e0b]" />
                <span>Cash (Tunai)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('QRIS')}
                className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  paymentMethod === 'QRIS'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs ring-2 ring-emerald-400/20'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <QrCode className="w-4 h-4 text-[#059669]" />
                <span>QRIS</span>
              </button>
            </div>
          </div>

          {/* TANGGAL PELUNASAN (DESAIN SESUAI GAMBAR 2) */}
          <div className="space-y-2 pt-2 border-t border-slate-100 bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100">
            <label className="font-bold text-emerald-950 text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                <span>Tanggal Pelunasan</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Lunas
              </span>
            </label>
            <input
              type="date"
              value={settledDate}
              onChange={(e) => setSettledDate(e.target.value)}
              className="w-full py-2 px-2.5 bg-white border border-emerald-200 rounded-xl text-slate-900 font-bold text-xs focus:outline-none focus:border-emerald-700 cursor-pointer"
            />
            <p className="text-[10px] text-emerald-700 font-medium">
              Tanggal pelunasan ini akan tercatat pada laporan kasir & omset harian.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 font-bold text-xs text-slate-600 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-sm shadow-emerald-700/20 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Menyimpan...' : 'Lunasi & Cetak Nota'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
