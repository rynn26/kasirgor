'use client';

import React, { useRef } from 'react';
import { OpenMabarTransaction } from '@/types/academy';
import { formatRupiah, formatDate } from '@/lib/utils';
import { 
  Printer, 
  X, 
  MessageCircle, 
  Users2
} from 'lucide-react';
import { useToastStore } from '@/lib/store/useToastStore';

interface OpenMabarReceiptModalProps {
  isOpen: boolean;
  transaction: OpenMabarTransaction | null;
  onClose: () => void;
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
}

export const OpenMabarReceiptModal: React.FC<OpenMabarReceiptModalProps> = ({
  isOpen,
  transaction,
  onClose,
  shopName = 'GOR SINYO ARENA',
  shopAddress = 'Jl. Perum. Pemda Graha Sukadami Blok A Raya',
  shopPhone = '0821-2478-428',
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToastStore();

  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyWhatsApp = () => {
    const text = `*BUKTI PEMASUKAN OPEN MABAR*
*${shopName.toUpperCase()}*
----------------------------------------
No. Nota: *${transaction.receiptNumber}*
Jenis Mabar: *${transaction.sportType === 'BADMINTON' ? 'Badminton' : 'Pickleball'}*
Tanggal: *${formatDate(transaction.date, false)}*
----------------------------------------
Nominal Cash: ${formatRupiah(transaction.nominalCash)}
Nominal QRIS: ${formatRupiah(transaction.nominalQris)}
*TOTAL DITERIMA: ${formatRupiah(transaction.totalAmount)}* ✅
----------------------------------------
Kasir: ${transaction.cashierName} ${transaction.shift ? `(${transaction.shift})` : ''}
Waktu Catat: ${formatDate(transaction.createdAt, true)}
----------------------------------------
GOR Sinyo Arena - Open Mabar`;

    navigator.clipboard.writeText(text);
    showToast('Teks bukti pemasukan mabar berhasil disalin ke clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <Users2 className="w-5 h-5 text-pink-600" />
            <h2 className="font-black text-slate-800 text-sm sm:text-base">
              Struk Pemasukan Open Mabar
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shadow-2xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Content Printable Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/60">
          <div 
            ref={receiptRef}
            id="printable-receipt"
            className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 font-mono text-xs text-slate-800 space-y-4 max-w-sm mx-auto receipt-paper"
          >
            {/* Header Nota */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-pink-50 text-pink-600 mb-1">
                <Users2 className="w-5 h-5" />
              </div>
              <h3 className="font-black text-sm tracking-wider text-slate-900 font-sans">
                {shopName}
              </h3>
              <p className="text-[10px] text-slate-500 font-sans leading-tight">
                {shopAddress}
              </p>
              <div className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-bold text-[10px] uppercase font-sans">
                OPEN MABAR {transaction.sportType}
              </div>
            </div>

            {/* Info Transaksi */}
            <div className="space-y-1.5 text-[11px] pb-3 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">No. Bukti:</span>
                <span className="font-bold">{transaction.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tanggal Mabar:</span>
                <span className="font-semibold">{formatDate(transaction.date, false)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kasir:</span>
                <span>{transaction.cashierName} {transaction.shift ? `(${transaction.shift})` : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Waktu Catat:</span>
                <span>{formatDate(transaction.createdAt, true)}</span>
              </div>
            </div>

            {/* Rincian Pemasukan */}
            <div className="space-y-1.5 text-[11px] pb-3 border-b border-dashed border-slate-300">
              <div className="flex justify-between text-slate-600">
                <span>Penerimaan Cash (Tunai):</span>
                <span className="font-semibold">{formatRupiah(transaction.nominalCash)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Penerimaan QRIS:</span>
                <span className="font-semibold">{formatRupiah(transaction.nominalQris)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-slate-200 text-sm font-black text-emerald-700">
                <span>TOTAL PEMASUKAN:</span>
                <span>{formatRupiah(transaction.totalAmount)}</span>
              </div>
            </div>

            {/* Status Stamp */}
            <div className="py-2 px-3 rounded-xl text-center font-black tracking-wide font-sans text-xs bg-emerald-50 text-emerald-800 border border-emerald-200">
              PEMASUKAN SUDAH TERCATAT
            </div>

            {/* Footer */}
            <div className="text-center space-y-1 text-[10px] text-slate-400 pt-1 font-sans">
              <p>Bukti sah pencatatan kasir open mabar.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-slate-100 bg-white grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleCopyWhatsApp}
            className="w-full py-2.5 px-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-emerald-200"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            Salin ke WA
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="w-full py-2.5 px-3 rounded-2xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-pink-600/20"
          >
            <Printer className="w-4 h-4" />
            Cetak Bukti
          </button>
        </div>
      </div>
    </div>
  );
};
