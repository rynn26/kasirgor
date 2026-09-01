'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Transaction } from '@/types/pos';
import { formatRupiah, formatDate } from '@/lib/utils';
import { 
  Check, 
  Home, 
  ShoppingCart
} from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onNewTransaction: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  transaction,
  onClose,
  onNewTransaction,
}) => {
  const router = useRouter();

  const handleGoHome = () => {
    onClose();
    router.push('/dashboard');
  };

  const handleNewTransaction = () => {
    onNewTransaction();
    onClose();
    router.push('/kasir');
  };

  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Main Payment Success Card (Clean & Struk-Free) */}
      <div className="bg-white border border-slate-200/90 rounded-[32px] max-w-sm w-full p-6 sm:p-7 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        {/* Green Checkmark Circle Badge */}
        <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4 ring-8 ring-emerald-50/60 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
            <Check className="w-7 h-7 stroke-[3.5]" />
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Pembayaran Berhasil!
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Transaksi telah berhasil diproses.
        </p>

        {/* Total Pembayaran Box */}
        <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4.5 my-5 text-center shadow-2xs">
          <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase block">
            TOTAL PEMBAYARAN
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            {formatRupiah(transaction.grandTotal)}
          </div>
        </div>

        {/* Dashed Separator */}
        <div className="w-full border-t border-dashed border-slate-200 my-1" />

        {/* Transaction Summary Info */}
        <div className="w-full py-3 space-y-2.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">No. Transaksi</span>
            <span className="font-mono font-bold text-slate-900">{transaction.invoiceNumber}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500">Waktu</span>
            <span className="font-medium text-slate-800">
              {formatDate(transaction.createdAt, true)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500">Metode</span>
            <span className="font-bold text-slate-900">
              {transaction.paymentMethod === 'CASH' ? 'Tunai (CASH)' : transaction.paymentMethod}
            </span>
          </div>

          {transaction.change > 0 && (
            <div className="flex justify-between items-center pt-1 border-t border-slate-100">
              <span className="text-slate-500">Kembalian</span>
              <span className="font-black text-emerald-600">{formatRupiah(transaction.change)}</span>
            </div>
          )}
        </div>

        {/* Action Buttons: Transaksi Baru & Kembali ke Beranda (Tanpa Tombol Struk) */}
        <div className="w-full space-y-2.5 pt-2">
          {/* Button 1: TRANSAKSI BARU (KEMBALI KE KASIR) */}
          <button
            type="button"
            onClick={handleNewTransaction}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#b92b10] hover:bg-[#a3250d] active:scale-[0.99] text-white font-black text-xs sm:text-sm tracking-wider uppercase shadow-lg shadow-[#b92b10]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>TRANSAKSI BARU</span>
          </button>

          {/* Button 2: KEMBALI KE BERANDA */}
          <button
            type="button"
            onClick={handleGoHome}
            className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-50 active:scale-[0.99] border-2 border-slate-200 text-slate-700 font-black text-xs sm:text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>KEMBALI KE BERANDA</span>
          </button>
        </div>
      </div>
    </div>
  );
};
