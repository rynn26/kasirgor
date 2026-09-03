'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CourtBooking } from '@/types/booking';
import { formatRupiah, formatDate } from '@/lib/utils';
import { 
  Check, 
  Receipt, 
  PlusCircle, 
  Printer, 
  MessageCircle, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface BookingSuccessModalProps {
  isOpen: boolean;
  booking: CourtBooking | null;
  mode?: 'DP' | 'PELUNASAN';
  onClose: () => void;
  onViewReceipt: () => void;
  onNewTransaction: () => void;
}

export const BookingSuccessModal: React.FC<BookingSuccessModalProps> = ({
  isOpen,
  booking,
  mode = 'PELUNASAN',
  onClose,
  onViewReceipt,
  onNewTransaction,
}) => {
  const router = useRouter();

  if (!isOpen || !booking) return null;

  const isLunas = booking.status === 'SETTLED' || booking.remainingBalance === 0;
  const isDPMode = mode === 'DP' || (!isLunas && booking.status === 'DP_PAID');

  const title = isDPMode ? 'Booking Berhasil' : 'Pelunasan Berhasil';
  const subtitle = isDPMode
    ? 'Pembayaran uang muka (DP) booking lapangan berhasil dicatat.'
    : 'Pembayaran sisa booking lapangan berhasil dicatat.';

  const sportName = booking.communityName?.includes('Pickleball') ? 'Pickleball' : 'Badminton';
  const paymentMethodUsed = isDPMode
    ? booking.dpPaymentMethod || 'QRIS'
    : booking.settlementPaymentMethod || booking.dpPaymentMethod || 'Cash';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Card Body */}
        <div className="p-6 sm:p-7 flex flex-col items-center text-center space-y-4">
          
          {/* Big Green Circle Checkmark Icon */}
          <div className="w-20 h-20 rounded-full bg-emerald-100/90 text-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-600/15 animate-in zoom-in-50 duration-300">
            <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center">
              <Check className="w-8 h-8 stroke-[3.5]" />
            </div>
          </div>

          {/* Title & Subtitle */}
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {title}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1 max-w-xs mx-auto">
              {subtitle}
            </p>
          </div>

          {/* Transaction Summary List */}
          <div className="w-full bg-slate-50/90 rounded-2xl p-4 border border-slate-200/80 space-y-2.5 text-left text-xs">
            
            <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
              <span className="text-slate-500 font-medium">Nama Customer</span>
              <span className="font-bold text-slate-900">{booking.customerName}</span>
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
              <span className="text-slate-500 font-medium">Jenis Olahraga</span>
              <span className="font-bold text-slate-900">{sportName}</span>
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
              <span className="text-slate-500 font-medium">Tanggal Booking</span>
              <span className="font-bold text-slate-900">
                {booking.bookingDate || (booking.dpPaidAt ? booking.dpPaidAt.split('T')[0] : booking.date)}
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
              <span className="text-slate-500 font-medium">Tanggal Main</span>
              <span className="font-bold text-slate-900">{booking.date}</span>
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
              <span className="text-slate-500 font-medium">Jam</span>
              <span className="font-bold text-slate-900">
                {booking.startTime} - {booking.endTime} ({booking.durationHours} jam)
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
              <span className="text-slate-500 font-medium">Jumlah Lapangan</span>
              <span className="font-bold text-slate-900">
                {booking.courtName.includes('&') ? '2 Lapangan' : '1 Lapangan'}
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
              <span className="text-slate-500 font-medium">Total Booking</span>
              <span className="font-black text-slate-900">{formatRupiah(booking.totalAmount)}</span>
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
              <span className="text-slate-500 font-medium">DP</span>
              <span className="font-bold text-slate-900">{formatRupiah(booking.dpAmount)}</span>
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
              <span className="text-slate-500 font-medium">
                {isLunas ? 'Pelunasan' : 'Sisa Pelunasan'}
              </span>
              <span className={`font-black ${isLunas ? 'text-slate-900' : 'text-amber-600'}`}>
                {isLunas ? formatRupiah(booking.settlementAmount || (booking.totalAmount - booking.dpAmount)) : formatRupiah(booking.remainingBalance)}
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
              <span className="text-slate-500 font-medium">Status</span>
              {isLunas ? (
                <span className="px-3 py-0.5 rounded-full text-[11px] font-black bg-emerald-600 text-white">
                  Lunas
                </span>
              ) : (
                <span className="px-3 py-0.5 rounded-full text-[11px] font-black bg-amber-500 text-white">
                  DP Terbayar
                </span>
              )}
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
              <span className="text-slate-500 font-medium">Metode Pembayaran</span>
              <span className="font-bold text-slate-900">{paymentMethodUsed}</span>
            </div>

            <div className="flex justify-between items-center pt-0.5">
              <span className="text-slate-500 font-medium">Waktu Transaksi</span>
              <span className="font-medium text-slate-700">{formatDate(booking.createdAt, true)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-2 pt-2">
            {/* Primary Button: Lihat Detail / Cetak Struk */}
            <button
              type="button"
              onClick={onViewReceipt}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-emerald-700/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Lihat Detail / Cetak Struk</span>
            </button>

            {/* Secondary Button: Transaksi Baru */}
            <button
              type="button"
              onClick={onNewTransaction}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-700 font-bold text-sm border-2 border-emerald-600/80 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Transaksi Baru</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
