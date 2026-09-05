'use client';

import React, { useState, useEffect } from 'react';
import { useCourtBookingStore } from '@/lib/store/useCourtBookingStore';
import { useShiftStore } from '@/lib/store/useShiftStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { formatRupiah, formatNumber, parseNumberInput } from '@/lib/utils';
import { CourtBooking } from '@/types/booking';
import { PaymentMethod } from '@/types/pos';
import { X, Search, Check, ReceiptText, QrCode, Banknote } from 'lucide-react';

interface SettlementModalProps {
  isOpen: boolean;
  selectedBookingId?: string | null;
  onClose: () => void;
  onSuccess: (booking: CourtBooking) => void;
}

export const SettlementModal: React.FC<SettlementModalProps> = ({
  isOpen,
  selectedBookingId,
  onClose,
  onSuccess,
}) => {
  const { bookings, settleBooking } = useCourtBookingStore();
  const { cashierName } = useShiftStore();
  const { showToast } = useToastStore();

  const [activeBookingId, setActiveBookingId] = useState<string | null>(selectedBookingId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('QRIS');
  const [cashReceived, setCashReceived] = useState<number>(0);

  // Filter pending/DP bookings
  const pendingBookings = bookings.filter(
    (b) => b.status === 'DP_PAID' || (b.status === 'IN_PLAY' && b.remainingBalance > 0)
  );

  const filteredBookings = pendingBookings.filter((b) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      b.customerName.toLowerCase().includes(query) ||
      b.phone.toLowerCase().includes(query) ||
      b.courtName.toLowerCase().includes(query) ||
      (b.communityName && b.communityName.toLowerCase().includes(query))
    );
  });

  const firstPendingId = pendingBookings[0]?.id;
  useEffect(() => {
    if (selectedBookingId) {
      setActiveBookingId(selectedBookingId);
    } else if (firstPendingId && !activeBookingId) {
      setActiveBookingId(firstPendingId);
    }
  }, [selectedBookingId, firstPendingId, activeBookingId]);

  const currentBooking = bookings.find((b) => b.id === activeBookingId);
  const totalSettlementDue = currentBooking ? currentBooking.remainingBalance : 0;

  useEffect(() => {
    if (currentBooking) {
      setCashReceived(currentBooking.remainingBalance);
    }
  }, [currentBooking?.id, currentBooking?.remainingBalance]);

  if (!isOpen) return null;

  const isCash = paymentMethod === 'CASH';
  const cashChange = Math.max(0, (cashReceived || 0) - totalSettlementDue);
  const isUnderpaid = isCash && (cashReceived || 0) > 0 && (cashReceived || 0) < totalSettlementDue;

  const nextRound10k = Math.ceil(totalSettlementDue / 10000) * 10000;
  const nextRound50k = Math.ceil(totalSettlementDue / 50000) * 50000;
  const quickNominals = [
    nextRound10k,
    nextRound50k,
    100000,
    150000,
    200000,
  ].filter((v, i, a) => v > 0 && a.indexOf(v) === i && v > totalSettlementDue);

  const handleConfirmSettlement = async () => {
    if (!currentBooking) {
      showToast('Pilih booking yang ingin dilunasi');
      return;
    }

    if (paymentMethod === 'CASH' && (cashReceived || 0) > 0 && (cashReceived || 0) < totalSettlementDue) {
      showToast('Uang tunai yang diterima kurang dari total pelunasan');
      return;
    }

    setIsProcessing(true);
    try {
      const updated = await settleBooking(currentBooking.id, {
        settlementAmount: totalSettlementDue,
        paymentMethod: paymentMethod,
        cashier: cashierName || 'Yuli',
        additionalItems: [],
      });
      showToast(`Pelunasan ${currentBooking.customerName} via ${paymentMethod === 'QRIS' ? 'QRIS' : 'Cash'} berhasil diproses!`);

      // Record Activity Log
      import('@/lib/db/activityLogs').then(({ recordActivityLog }) => {
        const activeCashier = cashierName || 'Yuli';
        recordActivityLog({
          staffName: activeCashier,
          role: 'Kasir',
          actionType: 'SETTLE_BOOKING',
          title: 'Pelunasan Booking Lapangan',
          details: `Kasir ${activeCashier} memproses pelunasan booking #${currentBooking.id.slice(0, 8)} (${currentBooking.customerName}) sebesar ${formatRupiah(totalSettlementDue)} via ${paymentMethod}. Status: LUNAS.`,
          metadata: {
            bookingId: currentBooking.id,
            customerName: currentBooking.customerName,
            settlementAmount: totalSettlementDue,
            paymentMethod,
          },
        });
      });

      onSuccess(updated);
    } catch {
      showToast('Gagal memproses pelunasan. Coba lagi.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
              <ReceiptText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base leading-tight">
                Pelunasan Booking Lapangan
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Pilih reservasi yang belum lunas dan proses pelunasan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Booking Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Pilih Booking yang Belum Lunas
            </label>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama, no WA, atau lapangan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600 placeholder-slate-400"
              />
            </div>

            {/* Booking Cards */}
            {filteredBookings.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                Tidak ada booking DP yang menunggu pelunasan.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                {filteredBookings.map((bkg) => {
                  const isSelected = bkg.id === activeBookingId;
                  return (
                    <button
                      key={bkg.id}
                      type="button"
                      onClick={() => setActiveBookingId(bkg.id)}
                      className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/60 border-blue-600 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {bkg.customerName}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                          Sisa {formatRupiah(bkg.remainingBalance)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
                        <span>{bkg.courtName}</span>
                        <span className="font-semibold text-slate-700">{bkg.startTime} - {bkg.endTime}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Booking Detail & Total */}
          {currentBooking && (
            <div className="space-y-3">
              {/* Rincian */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Rincian Reservasi</span>
                    <h4 className="font-black text-sm text-slate-900">{currentBooking.customerName}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-semibold text-slate-500 block">Jadwal Main: {currentBooking.date}</span>
                    <span className="font-bold text-xs text-blue-700">{currentBooking.startTime} - {currentBooking.endTime} WIB</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-medium">Lapangan</span>
                    <span className="font-bold text-slate-800 line-clamp-1">{currentBooking.courtName}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-medium">DP Masuk</span>
                    <span className="font-bold text-emerald-600">{formatRupiah(currentBooking.dpAmount)}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-medium">Sisa Tagihan</span>
                    <span className="font-black text-amber-600">{formatRupiah(currentBooking.remainingBalance)}</span>
                  </div>
                </div>
              </div>

              {/* Total Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 text-white flex items-center justify-between shadow-md">
                <div>
                  <span className="text-xs text-blue-200 block font-medium">TOTAL WAJIB DILUNASI</span>
                  <span className="text-[11px] text-blue-300/80">Sisa pokok pembayaran sewa lapangan</span>
                </div>
                <div className="text-xl font-black text-emerald-300">
                  {formatRupiah(totalSettlementDue)}
                </div>
              </div>

              {/* Pilihan Metode Pembayaran Pelunasan (QRIS / Cash) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    Metode Pembayaran Pelunasan
                  </label>
                  <span className="text-[11px] font-bold text-blue-600">
                    {paymentMethod === 'QRIS' ? 'QRIS Digital' : 'Tunai / Cash'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('QRIS')}
                    className={`p-3 rounded-2xl border font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      paymentMethod === 'QRIS'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20 ring-2 ring-blue-600/20'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>QRIS</span>
                    {paymentMethod === 'QRIS' && <Check className="w-3.5 h-3.5 stroke-[3] ml-1" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('CASH');
                      if (!cashReceived || cashReceived < totalSettlementDue) {
                        setCashReceived(totalSettlementDue);
                      }
                    }}
                    className={`p-3 rounded-2xl border font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      paymentMethod === 'CASH'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20 ring-2 ring-blue-600/20'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Cash / Tunai</span>
                    {paymentMethod === 'CASH' && <Check className="w-3.5 h-3.5 stroke-[3] ml-1" />}
                  </button>
                </div>

                {/* Detail Jika Cash */}
                {paymentMethod === 'CASH' && (
                  <div className="pt-2 border-t border-slate-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-600">
                        Uang Tunai Diterima
                      </label>
                      <span className={`text-[11px] font-bold ${
                        isUnderpaid ? 'text-rose-600' : 'text-emerald-600'
                      }`}>
                        {isUnderpaid
                          ? `Kurang: ${formatRupiah(totalSettlementDue - (cashReceived || 0))}`
                          : `Kembalian: ${formatRupiah(cashChange)}`}
                      </span>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={cashReceived ? formatNumber(cashReceived) : ''}
                        onChange={(e) => setCashReceived(parseNumberInput(e.target.value))}
                        placeholder={formatNumber(totalSettlementDue) || '0'}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:border-blue-600 transition-all"
                      />
                    </div>

                    {/* Quick Nominals */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setCashReceived(totalSettlementDue)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                          cashReceived === totalSettlementDue
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50'
                        }`}
                      >
                        Uang Pas
                      </button>
                      {quickNominals.map((nom) => (
                        <button
                          key={nom}
                          type="button"
                          onClick={() => setCashReceived(nom)}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer ${
                            cashReceived === nom
                              ? 'bg-blue-600 text-white border-blue-600 font-bold'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {formatRupiah(nom)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detail Jika QRIS */}
                {paymentMethod === 'QRIS' && (
                  <div className="p-3 bg-blue-50/80 border border-blue-100 rounded-xl flex items-center gap-2.5 text-blue-900">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div className="text-xs">
                      <span className="font-bold block">Pembayaran QRIS</span>
                      <span className="text-[11px] text-blue-700 font-medium">
                        Pelanggan scan barcode QRIS senilai <span className="font-bold text-blue-900">{formatRupiah(totalSettlementDue)}</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={!currentBooking || isProcessing || isUnderpaid}
            onClick={handleConfirmSettlement}
            className="flex-[2] py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-blue-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>{isProcessing ? 'Memproses...' : 'Lunasi Sekarang'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

