'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Banknote,
  QrCode,
  Search,
  ExternalLink,
  Receipt,
  CalendarCheck,
  Calendar,
  Clock,
  User,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { CourtBooking } from '@/types/booking';
import { Transaction } from '@/types/pos';
import { formatRupiah, formatDate } from '@/lib/utils';

interface PaymentMethodDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  methodName: string; // 'QRIS' | 'Cash (Tunai)' | string
  isLapangan: boolean;
  periodLabel: string;
  startDate?: string;
  endDate?: string;
  filteredBookings: CourtBooking[];
  filteredTransactions: Transaction[];
  onOpenBookingReceipt?: (booking: CourtBooking) => void;
  onOpenKantinReceipt?: (transaction: Transaction) => void;
}

export const PaymentMethodDetailModal: React.FC<PaymentMethodDetailModalProps> = ({
  isOpen,
  onClose,
  methodName,
  isLapangan,
  periodLabel,
  startDate,
  endDate,
  filteredBookings,
  filteredTransactions,
  onOpenBookingReceipt,
  onOpenKantinReceipt,
}) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  const isCash = methodName.toLowerCase().includes('cash') || methodName.toLowerCase().includes('tunai');
  const targetMethod: 'CASH' | 'QRIS' = isCash ? 'CASH' : 'QRIS';
  const displayTitle = isCash ? 'Cash (Tunai)' : 'QRIS';

  // Data transaksi yang sesuai dengan metode bayar ini
  const matchingItems = useMemo(() => {
    if (isLapangan) {
      // Filter booking lapangan
      const list: Array<{
        booking: CourtBooking;
        paidAmount: number;
        paymentType: 'DP' | 'PELUNASAN' | 'LUNAS_LANGSUNG';
      }> = [];

      filteredBookings.forEach((b) => {
        if (b.status === 'CANCELLED') return;

        const totalPaid = b.amountPaidTotal || 0;
        const dpAmt = b.dpAmount || 0;
        const realDp = Math.min(dpAmt, totalPaid);
        const realSettle = Math.max(0, totalPaid - realDp);

        const isDpMatch = b.dpPaymentMethod === targetMethod && realDp > 0;
        const isSettleMatch = b.settlementPaymentMethod === targetMethod && realSettle > 0;

        if (isDpMatch && isSettleMatch) {
          list.push({
            booking: b,
            paidAmount: realDp + realSettle,
            paymentType: b.remainingBalance === 0 ? 'LUNAS_LANGSUNG' : 'PELUNASAN',
          });
        } else if (isDpMatch) {
          list.push({
            booking: b,
            paidAmount: realDp,
            paymentType: b.remainingBalance === 0 ? 'LUNAS_LANGSUNG' : 'DP',
          });
        } else if (isSettleMatch) {
          list.push({
            booking: b,
            paidAmount: realSettle,
            paymentType: 'PELUNASAN',
          });
        }
      });

      return list;
    } else {
      // Filter transaksi kantin
      return filteredTransactions
        .filter((t) => t.status === 'COMPLETED' && t.paymentMethod === targetMethod)
        .map((t) => ({
          transaction: t,
          paidAmount: t.grandTotal,
        }));
    }
  }, [isLapangan, filteredBookings, filteredTransactions, targetMethod]);

  // Filter pencarian
  const filteredList = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return matchingItems;

    if (isLapangan) {
      return (matchingItems as Array<{
        booking: CourtBooking;
        paidAmount: number;
        paymentType: 'DP' | 'PELUNASAN' | 'LUNAS_LANGSUNG';
      }>).filter((item) => {
        const b = item.booking;
        return (
          b.customerName.toLowerCase().includes(q) ||
          b.bookingCode.toLowerCase().includes(q) ||
          b.courtName.toLowerCase().includes(q) ||
          (b.phone && b.phone.includes(q))
        );
      });
    } else {
      return (matchingItems as Array<{
        transaction: Transaction;
        paidAmount: number;
      }>).filter((item) => {
        const t = item.transaction;
        return (
          t.invoiceNumber.toLowerCase().includes(q) ||
          (t.customerName && t.customerName.toLowerCase().includes(q)) ||
          t.items.some((i) => i.product.name.toLowerCase().includes(q))
        );
      });
    }
  }, [matchingItems, searchTerm, isLapangan]);

  const totalCalculatedAmount = useMemo(() => {
    return matchingItems.reduce((sum, item) => sum + item.paidAmount, 0);
  }, [matchingItems]);

  if (!isOpen) return null;

  const handleNavigateToFullHistory = () => {
    onClose();
    if (isLapangan) {
      router.push(`/booking/history?method=${targetMethod}`);
    } else {
      router.push(`/history?method=${targetMethod}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#f8fafc] rounded-[28px] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md ${
              isCash
                ? 'bg-gradient-to-tr from-amber-500 to-orange-500 shadow-amber-500/20'
                : isLapangan
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-700 shadow-emerald-600/20'
                  : 'bg-gradient-to-tr from-red-600 to-[#a62512] shadow-red-600/20'
            }`}>
              {isCash ? <Banknote className="w-5 h-5" /> : <QrCode className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-slate-900 text-base leading-tight">
                  Rincian Pembayaran {displayTitle}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  isLapangan ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}>
                  {isLapangan ? 'Lapangan' : 'Kantin'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {periodLabel}
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

        {/* Total Summary Card */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Masuk via {displayTitle}
              </span>
              <div className={`text-xl sm:text-2xl font-black tracking-tight ${
                isCash ? 'text-amber-600' : isLapangan ? 'text-emerald-700' : 'text-[#a62512]'
              }`}>
                {formatRupiah(totalCalculatedAmount)}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Jumlah Data
              </span>
              <span className="text-sm font-black text-slate-800">
                {matchingItems.length} {isLapangan ? 'Booking' : 'Transaksi'}
              </span>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isLapangan ? 'Cari nama customer, kode, lapangan...' : 'Cari nota, nama produk...'}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400"
            />
          </div>
        </div>

        {/* Scrollable Transaction List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {filteredList.length > 0 ? (
            isLapangan ? (
              // List Booking Lapangan
              (filteredList as Array<{
                booking: CourtBooking;
                paidAmount: number;
                paymentType: 'DP' | 'PELUNASAN' | 'LUNAS_LANGSUNG';
                dateNote?: string;
              }>).map((item, idx) => {
                const b = item.booking;
                return (
                  <div
                    key={`${b.id || idx}-${item.paymentType}-${idx}`}
                    onClick={() => onOpenBookingReceipt?.(b)}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-emerald-500 hover:shadow-xs transition-all cursor-pointer group space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {b.customerName}
                        </h4>
                      </div>

                      <div className="text-right">
                        <span className={`text-xs sm:text-sm font-black ${
                          isCash ? 'text-amber-600' : 'text-emerald-700'
                        }`}>
                          {formatRupiah(item.paidAmount)}
                        </span>
                        <span className={`block text-[10px] font-bold px-2 py-0.2 rounded-full ${
                          item.paymentType === 'DP'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {item.paymentType === 'DP' ? 'Uang Muka (DP)' : item.paymentType === 'PELUNASAN' ? 'Pelunasan' : 'Lunas Penuh'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5 line-clamp-1 flex-wrap">
                        <CalendarCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{b.courtName} • {b.bookingDate && b.bookingDate !== b.date ? `Booking ${b.bookingDate} · ` : ''}Main {b.date} ({b.startTime}-{b.endTime})</span>
                        {item.paymentType === 'PELUNASAN' && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            Tgl Pelunasan: {b.settlementPaidAt ? b.settlementPaidAt.split('T')[0] : (b.bookingDate || b.date)}
                          </span>
                        )}
                        {item.paymentType === 'DP' && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            Tgl DP: {b.bookingDate || (b.dpPaidAt ? b.dpPaidAt.split('T')[0] : b.date)}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 text-slate-400 group-hover:text-emerald-700 font-bold text-[11px] transition-colors shrink-0">
                        <span>Lihat Nota</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              // List Transaksi Kantin
              (filteredList as Array<{
                transaction: Transaction;
                paidAmount: number;
              }>).map((item, idx) => {
                const t = item.transaction;
                const itemsSummary = t.items.map((i) => `${i.product.name} (${i.quantity}x)`).join(', ');
                return (
                  <div
                    key={t.id || idx}
                    onClick={() => onOpenKantinReceipt?.(t)}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-red-500 hover:shadow-xs transition-all cursor-pointer group space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1">
                          {t.customerName ? t.customerName : 'Pelanggan Umum'}
                        </h4>
                      </div>

                      <div className="text-right">
                        <span className={`text-xs sm:text-sm font-black ${
                          isCash ? 'text-amber-600' : 'text-[#a62512]'
                        }`}>
                          {formatRupiah(item.paidAmount)}
                        </span>
                        <span className="block text-[10px] font-medium text-slate-400">
                          {formatDate(t.createdAt, false)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="line-clamp-1 text-slate-600 font-medium">
                        {itemsSummary}
                      </span>
                      
                      <div className="flex items-center gap-1 text-slate-400 group-hover:text-[#a62512] font-bold text-[11px] transition-colors shrink-0 ml-2">
                        <span>Nota</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs font-medium space-y-1">
              <Receipt className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
              <p>Tidak ada transaksi {displayTitle} yang sesuai.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200/80 flex items-center gap-2">
          <button
            type="button"
            onClick={handleNavigateToFullHistory}
            className={`flex-1 py-3 px-4 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
              isLapangan
                ? 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-700/20'
                : 'bg-[#a62512] hover:bg-[#8f1e0d] shadow-red-700/20'
            }`}
          >
            <span>Buka Riwayat {isLapangan ? 'Sewa' : 'Nota'} Lengkap ({displayTitle})</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
