'use client';

import React, { useState, useEffect } from 'react';
import { useCourtBookingStore } from '@/lib/store/useCourtBookingStore';
import { useShiftStore } from '@/lib/store/useShiftStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { formatRupiah, formatDate, formatNumber, parseNumberInput } from '@/lib/utils';
import { PaymentMethod, CourtBooking, AdditionalItem } from '@/types/booking';
import { 
  X, 
  Search, 
  CheckCircle2, 
  CreditCard, 
  QrCode, 
  Banknote, 
  Building2, 
  Check, 
  Plus, 
  Minus,
  Calendar,
  Clock,
  User,
  Phone,
  ReceiptText,
  Sparkles,
  Layers
} from 'lucide-react';

interface SettlementModalProps {
  isOpen: boolean;
  selectedBookingId?: string | null;
  onClose: () => void;
  onSuccess: (booking: CourtBooking) => void;
}

const COMMON_ADDONS = [
  { id: 'add-1', name: 'Sewa Raket Badminton', price: 10000 },
  { id: 'add-2', name: 'Shuttlecock Samurai (1 Slop)', price: 95000 },
  { id: 'add-3', name: 'Pocari Sweat 500ml', price: 9000 },
  { id: 'add-4', name: 'Sewa Sepatu Olahraga', price: 15000 },
  { id: 'add-5', name: 'Grip Raket Handuk / Karet', price: 10000 },
];

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [addedItems, setAddedItems] = useState<AdditionalItem[]>([]);

  // Filter pending/DP bookings
  const pendingBookings = bookings.filter(
    (b) => b.status === 'DP_PAID' || (b.status === 'IN_PLAY' && b.remainingBalance > 0)
  );

  const filteredBookings = pendingBookings.filter((b) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      b.bookingCode.toLowerCase().includes(query) ||
      b.customerName.toLowerCase().includes(query) ||
      b.phone.toLowerCase().includes(query) ||
      b.courtName.toLowerCase().includes(query) ||
      (b.communityName && b.communityName.toLowerCase().includes(query))
    );
  });

  useEffect(() => {
    if (selectedBookingId) {
      setActiveBookingId(selectedBookingId);
    } else if (pendingBookings.length > 0 && !activeBookingId) {
      setActiveBookingId(pendingBookings[0].id);
    }
  }, [selectedBookingId, pendingBookings]);

  if (!isOpen) return null;

  const currentBooking = bookings.find((b) => b.id === activeBookingId);

  // Addons total
  const addonsTotal = addedItems.reduce((sum, it) => sum + it.price * it.qty, 0);

  // Remaining Court Fee
  const remainingCourtFee = currentBooking ? currentBooking.remainingBalance : 0;
  
  // Total Settlement to pay
  const totalSettlementDue = remainingCourtFee + addonsTotal;

  // Change
  const cashChange = Math.max(0, (cashReceived || 0) - totalSettlementDue);

  const handleAddItem = (item: { id: string; name: string; price: number }) => {
    setAddedItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
    showToast(`Ditambahkan: ${item.name}`);
  };

  const handleRemoveItem = (itemId: string) => {
    setAddedItems((prev) => {
      const existing = prev.find((i) => i.id === itemId);
      if (existing && existing.qty > 1) {
        return prev.map((i) =>
          i.id === itemId ? { ...i, qty: i.qty - 1 } : i
        );
      }
      return prev.filter((i) => i.id !== itemId);
    });
  };

  const handleConfirmSettlement = async () => {
    if (!currentBooking) {
      showToast('Pilih booking yang ingin dilunasi');
      return;
    }

    if (paymentMethod === 'CASH' && (cashReceived || 0) < totalSettlementDue) {
      showToast('Nominal uang tunai yang diterima kurang');
      return;
    }

    const updated = await settleBooking(currentBooking.id, {
      settlementAmount: totalSettlementDue,
      paymentMethod,
      cashier: cashierName || 'Yuli',
      additionalItems: addedItems,
    });

    showToast(`Pelunasan ${currentBooking.bookingCode} berhasil diproses!`);
    onSuccess(updated);
  };

  const quickNominals = [
    totalSettlementDue,
    50000,
    100000,
    150000,
    200000,
    300000,
  ].filter((v, i, a) => v > 0 && a.indexOf(v) === i && v >= totalSettlementDue);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
              <ReceiptText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base sm:text-lg leading-tight">
                Pelunasan Booking Lapangan
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Pilih reservasi yang belum lunas, tambah item sewa jika ada, dan proses pelunasan
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Booking Lookup / Selector */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
              1. Pilih Antrean / Nota Booking yang Belum Lunas
            </label>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama pemesan, no WA, atau kode booking..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600 placeholder-slate-400"
              />
            </div>

            {/* Horizontal Booking Cards List */}
            {filteredBookings.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                Tidak ada data booking DP yang menunggu pelunasan.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {filteredBookings.map((bkg) => {
                  const isSelected = bkg.id === activeBookingId;
                  return (
                    <button
                      key={bkg.id}
                      type="button"
                      onClick={() => {
                        setActiveBookingId(bkg.id);
                        setAddedItems([]);
                        setCashReceived(0);
                      }}
                      className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/60 border-blue-600 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-slate-500">
                          {bkg.bookingCode}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          Sisa {formatRupiah(bkg.remainingBalance)}
                        </span>
                      </div>
                      <div className="font-bold text-xs text-slate-900 mt-1 line-clamp-1">
                        {bkg.customerName}
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

          {/* Current Booking Detail Card */}
          {currentBooking && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Rincian Reservasi</span>
                  <h4 className="font-black text-sm text-slate-900">{currentBooking.customerName}</h4>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-slate-500 block">{currentBooking.date}</span>
                  <span className="font-bold text-xs text-blue-700">{currentBooking.startTime} - {currentBooking.endTime} WIB</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">Lapangan</span>
                  <span className="font-bold text-slate-800 line-clamp-1">{currentBooking.courtName}</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">Total Tarif Sewa</span>
                  <span className="font-bold text-slate-800">{formatRupiah(currentBooking.courtFee)}</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">DP Sudah Masuk</span>
                  <span className="font-bold text-emerald-600">{formatRupiah(currentBooking.dpAmount)}</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">Sisa Sewa Lapangan</span>
                  <span className="font-black text-amber-600">{formatRupiah(currentBooking.remainingBalance)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Optional Add-ons / Sewa Tambahan */}
          {currentBooking && (
            <div className="space-y-2.5 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>2. Tambahan Sewa Alat / F&B (Opsional)</span>
                </label>
                {addedItems.length > 0 && (
                  <span className="text-[11px] font-bold text-blue-700">
                    +{formatRupiah(addonsTotal)}
                  </span>
                )}
              </div>

              {/* Quick Add Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {COMMON_ADDONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleAddItem(item)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3 h-3 text-blue-600" />
                    <span>{item.name}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({formatRupiah(item.price)})</span>
                  </button>
                ))}
              </div>

              {/* Selected Addons List */}
              {addedItems.length > 0 && (
                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-1.5 text-xs">
                  <div className="font-bold text-slate-700 text-[11px]">Item Tambahan Terpilih:</div>
                  {addedItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-white p-2 rounded-xl border border-blue-100">
                      <span className="font-semibold text-slate-800">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-900">{formatRupiah(item.price * item.qty)}</span>
                        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 text-slate-600 hover:text-red-600 rounded cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-1 font-bold text-xs">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => handleAddItem(item)}
                            className="p-1 text-slate-600 hover:text-blue-600 rounded cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 3: Final Settlement Calculation & Payment Method */}
          {currentBooking && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                3. Rincian & Metode Pembayaran Pelunasan
              </label>

              {/* Final Amount Due Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 text-white space-y-2 shadow-md">
                <div className="flex justify-between text-xs text-blue-200">
                  <span>Sisa Pokok Sewa Lapangan:</span>
                  <span>{formatRupiah(remainingCourtFee)}</span>
                </div>
                {addonsTotal > 0 && (
                  <div className="flex justify-between text-xs text-blue-200">
                    <span>Tambahan Alat & F&B:</span>
                    <span>+{formatRupiah(addonsTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-emerald-300 pt-2 border-t border-blue-800">
                  <span>TOTAL WAJIB DILUNASI:</span>
                  <span>{formatRupiah(totalSettlementDue)}</span>
                </div>
              </div>

              {/* Payment Method Selector (Cash & QRIS only) */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'CASH', label: 'Cash / Tunai', icon: Banknote },
                  { id: 'QRIS', label: 'QRIS', icon: QrCode },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = paymentMethod === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPaymentMethod(item.id as PaymentMethod)}
                      className={`p-3 rounded-2xl border text-center flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-bold">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Cash Input */}
              {paymentMethod === 'CASH' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-700">
                      Uang Tunai Diterima
                    </label>
                    <span className="text-[11px] font-bold text-blue-700">
                      Kembalian: {formatRupiah(cashChange)}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cashReceived ? formatNumber(cashReceived) : ''}
                      onChange={(e) => setCashReceived(parseNumberInput(e.target.value))}
                      placeholder={formatNumber(totalSettlementDue) || '0'}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {quickNominals.map((nom) => (
                      <button
                        key={nom}
                        type="button"
                        onClick={() => setCashReceived(nom)}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-slate-700 text-[10px] font-bold border border-slate-200 transition-colors cursor-pointer"
                      >
                        {nom === totalSettlementDue ? 'Uang Pas' : formatRupiah(nom)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              disabled={!currentBooking}
              onClick={handleConfirmSettlement}
              className="flex-2 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Proses Pelunasan & Cetak Nota</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
