'use client';

import React, { useState, useEffect } from 'react';
import { useCourtBookingStore } from '@/lib/store/useCourtBookingStore';
import { useShiftStore } from '@/lib/store/useShiftStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { formatRupiah } from '@/lib/utils';
import { PaymentMethod, CourtBooking } from '@/types/booking';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  CreditCard, 
  QrCode, 
  Banknote, 
  Building2, 
  Check, 
  Sparkles,
  Info,
  CalendarCheck2
} from 'lucide-react';

interface CreateDpBookingModalProps {
  isOpen: boolean;
  initialCourtId?: string;
  initialStartTime?: string;
  initialDate?: string;
  initialMode?: 'DP' | 'FULL';
  onClose: () => void;
  onSuccess: (booking: CourtBooking) => void;
}

const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
];

export const CreateDpBookingModal: React.FC<CreateDpBookingModalProps> = ({
  isOpen,
  initialCourtId,
  initialStartTime = '08:00',
  initialDate,
  initialMode = 'DP',
  onClose,
  onSuccess,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const { addBooking, courts, loadCourts } = useCourtBookingStore();
  const { cashierName } = useShiftStore();
  const { showToast } = useToastStore();

  // Form State
  const [courtId, setCourtId] = useState(initialCourtId || courts[0]?.id || 'court-00001');
  const [courtCount, setCourtCount] = useState(1);
  const [date, setDate] = useState(initialDate || todayStr);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [durationHours, setDurationHours] = useState(2);
  
  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [communityName, setCommunityName] = useState('');

  // Payment info
  const [paymentType, setPaymentType] = useState<'DP_50' | 'DP_CUSTOM' | 'FULL'>(
    initialMode === 'FULL' ? 'FULL' : 'DP_50'
  );
  const [customDpAmount, setCustomDpAmount] = useState<number>(50000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('QRIS');
  const [cashReceived, setCashReceived] = useState<number>(0);

  // Load courts if not yet loaded
  useEffect(() => {
    if (courts.length === 0) {
      loadCourts();
    }
  }, [courts.length, loadCourts]);

  // Sync props if modal re-opens
  useEffect(() => {
    if (initialCourtId) setCourtId(initialCourtId);
    if (initialStartTime) setStartTime(initialStartTime);
    setDate(initialDate || todayStr);
    if (initialMode) setPaymentType(initialMode === 'FULL' ? 'FULL' : 'DP_50');
  }, [initialCourtId, initialStartTime, initialDate, initialMode, isOpen]);

  if (!isOpen) return null;

  const selectedCourt = courts.find((c) => c.id === courtId) || courts[0] || {
    id: 'court-00001',
    name: 'Lapangan 1 (VIP Vinyl BWF)',
    type: 'VIP Vinyl BWF',
    pricePerHour: 80000,
  };
  const courtPricePerHour = selectedCourt ? selectedCourt.pricePerHour : 80000;
  const courtFee = courtPricePerHour * durationHours * courtCount;

  // Calculate End Time
  const startHourNum = parseInt(startTime.split(':')[0], 10);
  const endHourNum = startHourNum + durationHours;
  const endTime = `${endHourNum < 10 ? '0' : ''}${endHourNum}:00`;

  // Calculate DP amount
  let dpAmountToPay = 0;
  if (paymentType === 'FULL') {
    dpAmountToPay = courtFee;
  } else if (paymentType === 'DP_50') {
    dpAmountToPay = Math.round(courtFee * 0.5);
  } else {
    dpAmountToPay = Math.min(courtFee, Math.max(0, customDpAmount));
  }

  const remainingBalance = Math.max(0, courtFee - dpAmountToPay);
  const isFullSettled = remainingBalance === 0;

  const quickNominals = [
    dpAmountToPay,
    50000,
    100000,
    150000,
    200000,
    300000,
  ].filter((v, i, a) => v > 0 && a.indexOf(v) === i && v >= dpAmountToPay);

  const cashChange = Math.max(0, (cashReceived || 0) - dpAmountToPay);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      showToast('Harap isi nama penyewa lapangan');
      return;
    }

    if (!phone.trim()) {
      showToast('Harap isi nomor telepon / WhatsApp');
      return;
    }

    if (paymentMethod === 'CASH' && (cashReceived || 0) < dpAmountToPay) {
      showToast('Nominal uang tunai yang diterima kurang');
      return;
    }

    const courtNameLabel = courtCount === 1 
      ? selectedCourt.name 
      : `${courtCount} Lapangan (${courts.slice(0, courtCount).map(c => c.name.split(' ')[0] + ' ' + c.name.split(' ')[1]).join(', ')})`;

    const newBooking = await addBooking({
      customerName: customerName.trim(),
      phone: phone.trim(),
      communityName: communityName.trim() || undefined,
      date,
      courtId: selectedCourt.id,
      courtName: courtNameLabel,
      courtType: selectedCourt.type,
      courtPricePerHour,
      startTime,
      endTime,
      durationHours,
      courtFee,
      additionalItems: [],
      totalAmount: courtFee,
      dpAmount: dpAmountToPay,
      dpPaymentMethod: paymentMethod,
      dpPaidAt: new Date().toISOString(),
      dpCashier: cashierName || 'Kasir',
      amountPaidTotal: dpAmountToPay,
      remainingBalance,
      status: isFullSettled ? 'SETTLED' : 'DP_PAID',
    });

    showToast(isFullSettled ? 'Sewa lapangan LUNAS berhasil dicatat!' : 'DP Booking lapangan berhasil dicatat!');
    onSuccess(newBooking);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#b92b10] to-[#e64a19] text-white flex items-center justify-center shadow-md shadow-[#b92b10]/20">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base sm:text-lg leading-tight">
                {paymentType === 'FULL' ? 'Sewa Langsung (Bayar Lunas)' : 'Catat DP Booking Lapangan'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Pilih lapangan, waktu main, dan penerimaan uang muka
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Section 1: Court & Schedule */}
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>1. Pilih Lapangan & Waktu Bermain</span>
            </label>

            {/* Court Selection Radio Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
              {courts.map((court) => {
                const isSelected = court.id === courtId;
                return (
                  <button
                    key={court.id}
                    type="button"
                    onClick={() => setCourtId(court.id)}
                    className={`p-3 rounded-2xl text-left border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-red-50/50 border-[#b92b10] shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {court.type}
                      </span>
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-[#b92b10] text-white flex items-center justify-center text-[10px]">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-xs sm:text-sm text-slate-900 mt-1.5 line-clamp-1">
                      {court.name}
                    </div>
                    <div className="text-xs font-black text-[#b92b10] mt-0.5">
                      {formatRupiah(court.pricePerHour)}/jam
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Date, Start Time, Court Count & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Tanggal Main
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#b92b10]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Jam Mulai
                </label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#b92b10] cursor-pointer"
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time} WIB
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Jumlah Lapangan & Durasi Sewa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Jumlah Lapangan
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {[1, 2, 3, 4].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setCourtCount(cnt)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        courtCount === cnt
                          ? 'bg-[#b92b10] text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {cnt} Lap
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Durasi Sewa
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {[1, 2, 3, 4].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => setDurationHours(hrs)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        durationHours === hrs
                          ? 'bg-[#b92b10] text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {hrs} Jam
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Schedule Highlight Banner */}
            <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-700" />
                <span className="font-semibold text-amber-900">
                  {startTime} - {endTime} WIB ({durationHours} Jam) • {courtCount} Lapangan
                </span>
              </div>
              <div className="font-black text-amber-950 text-sm">
                Total Sewa: {formatRupiah(courtFee)}
              </div>
            </div>
          </div>

          {/* Section 2: Customer Identity */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>2. Informasi Penyewa / Komunitas</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Nama Pemesan / PJ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#b92b10]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  No. WhatsApp / HP <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    placeholder="0812-xxxx-xxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#b92b10]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Nama Klub / Komunitas (Opsional)
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Contoh: PB Smash Ceria"
                  value={communityName}
                  onChange={(e) => setCommunityName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#b92b10]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Down Payment & Payment Method */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>3. Pembayaran Uang Muka (DP) / Pelunasan</span>
              <span className="text-emerald-700 text-[11px] font-bold">
                Kasir: {cashierName || 'Andi'}
              </span>
            </label>

            {/* Payment Type Selection Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setPaymentType('DP_50')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                  paymentType === 'DP_50'
                    ? 'bg-white text-[#b92b10] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                DP 50% ({formatRupiah(courtFee * 0.5)})
              </button>

              <button
                type="button"
                onClick={() => setPaymentType('DP_CUSTOM')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                  paymentType === 'DP_CUSTOM'
                    ? 'bg-white text-[#b92b10] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                DP Nominal Lain
              </button>

              <button
                type="button"
                onClick={() => setPaymentType('FULL')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                  paymentType === 'FULL'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bayar Lunas (100%)
              </button>
            </div>

            {/* Custom DP Input if active */}
            {paymentType === 'DP_CUSTOM' && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 block">
                  Ketik Nominal Uang Muka (DP)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min={0}
                    max={courtFee}
                    value={customDpAmount || ''}
                    onChange={(e) => setCustomDpAmount(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:border-[#b92b10]"
                  />
                </div>
              </div>
            )}

            {/* Financial Summary Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-2 shadow-md">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Total Tarif Sewa:</span>
                <span className="font-bold text-white">{formatRupiah(courtFee)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-emerald-400">
                <span>Nominal Diterima Sekarang:</span>
                <span>{formatRupiah(dpAmountToPay)}</span>
              </div>
              <div className="flex justify-between text-xs text-amber-300 pt-1.5 border-t border-slate-700">
                <span>Sisa Pelunasan di Lokasi:</span>
                <span className="font-bold">
                  {remainingBalance > 0 ? formatRupiah(remainingBalance) : 'LUNAS (Rp 0)'}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-semibold text-slate-600 block">
                Metode Pembayaran Sekarang
              </label>
              {/* Payment Method Selector (QRIS & Cash only) */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'QRIS', label: 'QRIS', icon: QrCode },
                  { id: 'CASH', label: 'Cash / Tunai', icon: Banknote },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = paymentMethod === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPaymentMethod(item.id as PaymentMethod)}
                      className={`p-2.5 rounded-2xl border text-center flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[11px] font-bold">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* If Cash: Quick Cash and Change */}
            {paymentMethod === 'CASH' && (
              <div className="p-3 bg-red-50/50 border border-red-100 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-700">
                    Uang Tunai Diterima
                  </label>
                  <span className="text-[11px] font-bold text-[#b92b10]">
                    Kembalian: {formatRupiah(cashChange)}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    value={cashReceived || ''}
                    onChange={(e) => setCashReceived(Number(e.target.value))}
                    placeholder={dpAmountToPay.toString()}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:border-[#b92b10]"
                  />
                </div>
                {/* Quick cash pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {quickNominals.map((nom) => (
                    <button
                      key={nom}
                      type="button"
                      onClick={() => setCashReceived(nom)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-red-50 text-slate-700 text-[10px] font-bold border border-slate-200 transition-colors cursor-pointer"
                    >
                      {nom === dpAmountToPay ? 'Uang Pas' : formatRupiah(nom)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

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
              type="submit"
              className="flex-2 py-3 px-4 rounded-2xl bg-[#b92b10] hover:bg-[#a3250d] text-white font-bold text-xs shadow-lg shadow-[#b92b10]/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Simpan & Cetak Bukti DP</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
