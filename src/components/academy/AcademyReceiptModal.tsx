'use client';

import React, { useRef } from 'react';
import { AcademyTransaction } from '@/types/academy';
import { formatRupiah, formatDate } from '@/lib/utils';
import { 
  Printer, 
  X, 
  MessageCircle, 
  Award
} from 'lucide-react';
import { useToastStore } from '@/lib/store/useToastStore';

interface AcademyReceiptModalProps {
  isOpen: boolean;
  transaction: AcademyTransaction | null;
  onClose: () => void;
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
}

export const AcademyReceiptModal: React.FC<AcademyReceiptModalProps> = ({
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

  const isLunas = transaction.status === 'LUNAS' || transaction.remainingAmount === 0;
  const isBadminton = transaction.program === 'BADMINTON';
  const hasSettlement = Boolean(transaction.settledAt && (transaction.settlementAmount || 0) > 0);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyWhatsApp = () => {
    const now = new Date();
    const realtimeTime = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now);

    const programTitle = isBadminton ? 'SINYO BADMINTON ACADEMY' : 'SINYO PICKLEBALL ACADEMY';
    const detailProgram = isBadminton 
      ? `Kategori: *${transaction.category === 'ANAK' ? 'Anak' : 'Dewasa'}*\nPaket: *${transaction.package} Pertemuan*\nBulan Latihan: *${transaction.trainingMonth || '-'}*`
      : `Waktu: *${transaction.sessionTime === 'PAGI_SIANG' ? 'Pagi - Siang (08.00 - 17.00)' : 'Sore - Malam (17.00 - 23.00)'}*\nPeriode: *${transaction.periodStart || '-'} s/d ${transaction.periodEnd || '-'}*`;

    let paymentBreakdown = `Total Biaya: ${formatRupiah(transaction.feeAmount)}\n`;
    if (hasSettlement) {
      paymentBreakdown += `1. DP (${formatDate(transaction.createdAt, false)} - ${transaction.paymentMethod}): ${formatRupiah(transaction.dpAmount)}\n`;
      paymentBreakdown += `2. Pelunasan (${formatDate(transaction.settledAt!, false)} - ${transaction.settlementPaymentMethod || transaction.paymentMethod}): ${formatRupiah(transaction.settlementAmount || 0)}\n`;
      paymentBreakdown += `*STATUS: SUDAH LUNAS* ✅`;
    } else if (isLunas) {
      paymentBreakdown += `Pembayaran (${transaction.paymentMethod}): ${formatRupiah(transaction.dpAmount)}\n`;
      paymentBreakdown += `*STATUS: SUDAH LUNAS* ✅`;
    } else {
      paymentBreakdown += `Pembayaran DP (${transaction.paymentMethod}): ${formatRupiah(transaction.dpAmount)}\n`;
      paymentBreakdown += `*SISA PEMBAYARAN: ${formatRupiah(transaction.remainingAmount)}* ⚠️\n(Harap dilunasi sebelum latihan dimulai)`;
    }

    const text = `*BUKTI PEMBAYARAN - ${programTitle}*
*${shopName.toUpperCase()}*
----------------------------------------
Nama Peserta: *${transaction.customerName}*
Tanggal Nota: *${formatDate(transaction.createdAt, false)}, ${realtimeTime} WIB*
${detailProgram}
----------------------------------------
${paymentBreakdown}
Kasir: ${transaction.cashierName} ${transaction.shift ? `(${transaction.shift})` : ''}
----------------------------------------
Terima kasih telah bergabung bersama Sinyo Academy!`;

    navigator.clipboard.writeText(text);
    showToast('Teks bukti pembayaran berhasil disalin ke clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            <h2 className="font-black text-slate-800 text-sm sm:text-base">
              Struk Pembayaran Sinyo Academy
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
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 mb-1">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-black text-sm tracking-wider text-slate-900 font-sans">
                {shopName}
              </h3>
              <p className="text-[10px] text-slate-500 font-sans leading-tight">
                {shopAddress}
              </p>
              <p className="text-[10px] text-slate-500 font-sans">
                WA: {shopPhone}
              </p>
              <div className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px] uppercase font-sans">
                {isBadminton ? 'Sinyo Badminton Academy' : 'Sinyo Pickleball Academy'}
              </div>
            </div>

            {/* Info Transaksi */}
            <div className="space-y-1.5 text-[11px] pb-3 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Tanggal Booking:</span>
                <span>{formatDate(transaction.createdAt, true)}</span>
              </div>
              {hasSettlement && (
                <div className="flex justify-between text-emerald-800">
                  <span className="font-semibold">Tanggal Lunas:</span>
                  <span className="font-bold">{formatDate(transaction.settledAt!, true)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Kasir:</span>
                <span>{transaction.cashierName} {transaction.shift ? `(${transaction.shift})` : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Peserta:</span>
                <span className="font-bold text-slate-900">{transaction.customerName}</span>
              </div>

              {isBadminton ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kategori:</span>
                    <span className="font-semibold">{transaction.category === 'ANAK' ? 'Anak' : 'Dewasa'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Paket:</span>
                    <span className="font-semibold">{transaction.package} Pertemuan</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bulan:</span>
                    <span className="font-semibold">{transaction.trainingMonth || '-'}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Waktu Latihan:</span>
                    <span className="font-semibold">
                      {transaction.sessionTime === 'PAGI_SIANG' ? 'Pagi - Siang (08.00 - 17.00)' : 'Sore - Malam (17.00 - 23.00)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Periode:</span>
                    <span className="font-semibold text-right">
                      {transaction.periodStart || '-'} s/d {transaction.periodEnd || '-'}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Rincian Finansial */}
            <div className="space-y-1.5 text-[11px] pb-3 border-b border-dashed border-slate-300">
              <div className="flex justify-between text-slate-600">
                <span>Tarif Pelatihan:</span>
                <span className="font-semibold">{formatRupiah(transaction.feeAmount)}</span>
              </div>
              
              <div className="flex justify-between text-slate-900 font-bold">
                <span>DP ({transaction.paymentMethod}):</span>
                <span>{formatRupiah(transaction.dpAmount)}</span>
              </div>

              {hasSettlement && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Pelunasan ({transaction.settlementPaymentMethod || transaction.paymentMethod}):</span>
                  <span>{formatRupiah(transaction.settlementAmount || 0)}</span>
                </div>
              )}

              <div className="flex justify-between pt-1 border-t border-slate-100 font-black">
                <span className={isLunas ? 'text-emerald-700' : 'text-amber-700'}>
                  {isLunas ? 'Sisa Pembayaran:' : 'Sisa Tagihan:'}
                </span>
                <span className={isLunas ? 'text-emerald-700' : 'text-amber-700'}>
                  {formatRupiah(transaction.remainingAmount)}
                </span>
              </div>
            </div>

            {/* Status Stamp */}
            <div className={`py-2 px-3 rounded-xl text-center font-black tracking-wide font-sans text-xs ${
              isLunas 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              {isLunas ? 'LUNAS' : `BELUM LUNAS (SISA ${formatRupiah(transaction.remainingAmount)})`}
            </div>

            {/* Footer */}
            <div className="text-center space-y-1 text-[10px] text-slate-400 pt-1 font-sans">
              <p>Simpan struk ini sebagai bukti pendaftaran resmi.</p>
              <p className="font-bold text-slate-600">Terima kasih atas kepercayaannya!</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-slate-100 bg-white grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleCopyWhatsApp}
            className="w-full py-2.5 px-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-emerald-200 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            Salin ke WA
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="w-full py-2.5 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Cetak Struk
          </button>
        </div>
      </div>
    </div>
  );
};
