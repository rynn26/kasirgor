'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCourtBookingStore } from '@/lib/store/useCourtBookingStore';
import { useShiftStore } from '@/lib/store/useShiftStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { formatRupiah } from '@/lib/utils';
import { CourtBooking, PaymentMethod } from '@/types/booking';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Clock, 
  Plus, 
  Minus, 
  QrCode, 
  Banknote, 
  Building2, 
  CreditCard, 
  Check, 
  X, 
  Info,
  Phone,
  Sparkles,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { BookingReceiptModal } from '@/components/booking/BookingReceiptModal';
import { BookingSuccessModal } from '@/components/booking/BookingSuccessModal';

const SPORT_TYPES = [
  { id: 'Badminton', name: 'Badminton', icon: '🏸' },
  { id: 'Pickleball', name: 'Pickleball', icon: '🏓' },
];

const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '24:00'
];

export default function InputDpBookingPage() {
  const router = useRouter();
  const { addBooking, courts, loadCourts } = useCourtBookingStore();
  const { cashierName, selectedShift } = useShiftStore();
  const { showToast } = useToastStore();

  // Load courts from Supabase on mount
  useEffect(() => {
    loadCourts();
  }, []);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedSport, setSelectedSport] = useState('Badminton');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('21:00');
  const [courtCount, setCourtCount] = useState(1);
  const [selectedCourtIds, setSelectedCourtIds] = useState<string[]>([]);
  const [dpAmount, setDpAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('QRIS');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Receipt and Success Modal State
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastCreatedBooking, setLastCreatedBooking] = useState<CourtBooking | null>(null);

  // Calculate Duration
  const startHour = parseInt(startTime.split(':')[0], 10);
  const endHour = parseInt(endTime.split(':')[0], 10);
  const calculatedDuration = Math.max(1, endHour > startHour ? endHour - startHour : 1);

  // Price per hour default (e.g. Rp 85.000 / court / hour for Badminton, 75.000 for Pickleball)
  const baseRatePerHour = selectedSport === 'Badminton' ? 85000 : 75000;
  const totalSewa = baseRatePerHour * calculatedDuration * courtCount;
  const sisaPembayaran = Math.max(0, totalSewa - (dpAmount || 0));

  // Sync court count with court selections
  const handleToggleCourt = (courtId: string) => {
    if (selectedCourtIds.includes(courtId)) {
      if (selectedCourtIds.length > 1) {
        const next = selectedCourtIds.filter((id) => id !== courtId);
        setSelectedCourtIds(next);
        setCourtCount(next.length);
      }
    } else {
      const next = [...selectedCourtIds, courtId];
      setSelectedCourtIds(next);
      setCourtCount(next.length);
    }
  };

  const handleCourtCountChange = (delta: number) => {
    const nextCount = Math.max(1, Math.min(4, courtCount + delta));
    setCourtCount(nextCount);
    setSelectedCourtIds(courts.slice(0, nextCount).map((c) => c.id));
  };

  // Quick DP Percentage Helpers
  const handleSetDpPercent = (pct: number) => {
    const calculated = Math.round(totalSewa * pct);
    setDpAmount(calculated);
  };

  const cashChange = Math.max(0, (cashReceived || 0) - dpAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      showToast('Harap isi nama customer');
      return;
    }

    if (dpAmount <= 0) {
      showToast('Nominal DP harus lebih besar dari Rp 0');
      return;
    }

    if (dpAmount > totalSewa) {
      showToast('Nominal DP tidak boleh melebihi total sewa');
      return;
    }

    if (paymentMethod === 'CASH' && (cashReceived || 0) < dpAmount) {
      showToast('Uang tunai yang diterima kurang dari nominal DP');
      return;
    }

    const selectedCourtsNames = courts
      .filter((c) => selectedCourtIds.includes(c.id))
      .map((c) => c.name)
      .join(' & ') || `${courtCount} Lapangan (${selectedSport})`;

    const newBooking = await addBooking({
      customerName: customerName.trim(),
      phone: phone.trim() || '0812-0000-0000',
      communityName: `${selectedSport} Community`,
      date,
      courtId: selectedCourtIds[0] || 'court-1',
      courtName: selectedCourtsNames,
      courtType: 'VIP Vinyl BWF',
      courtPricePerHour: baseRatePerHour,
      startTime,
      endTime,
      durationHours: calculatedDuration,
      courtFee: totalSewa,
      additionalItems: [],
      totalAmount: totalSewa,
      dpAmount,
      dpPaymentMethod: paymentMethod,
      dpPaidAt: new Date().toISOString(),
      dpCashier: cashierName || 'Andi',
      amountPaidTotal: dpAmount,
      remainingBalance: sisaPembayaran,
      status: sisaPembayaran === 0 ? 'SETTLED' : 'DP_PAID',
      notes: notes.trim() || undefined,
    });

    setLastCreatedBooking(newBooking);
    setIsSuccessOpen(true);
    showToast('DP Booking lapangan berhasil disimpan!');
  };

  return (
    <div className="min-h-full bg-[#f8fafc] p-3.5 sm:p-5 max-w-xl mx-auto space-y-4 pb-28">
      
      {/* Top Header Card with Back Button */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            href="/booking"
            className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-[#b92b10] border border-slate-200 transition-colors cursor-pointer flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#b92b10] text-white text-[10px] font-black flex items-center justify-center">
                2
              </span>
              <h1 className="font-black text-base sm:text-lg text-slate-900 leading-tight">
                DP Booking Lapangan
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Isi data booking dan nominal DP sesuai pembayaran customer
            </p>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <span className="text-[10px] text-slate-400 font-semibold block">Kasir</span>
          <span className="text-xs font-bold text-slate-800">{cashierName || 'Andi'}</span>
        </div>
      </div>

      {/* Main Booking Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        
        {/* 1. Nama Customer */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
            <span>Nama Customer</span>
            <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              placeholder="Masukkan nama pemesan"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full pl-3.5 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:border-[#b92b10] focus:bg-white transition-all"
            />
            {customerName && (
              <button
                type="button"
                onClick={() => setCustomerName('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 2. Jenis Olahraga */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
            <span>Jenis Olahraga</span>
            <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {SPORT_TYPES.map((sport) => {
              const isSelected = selectedSport === sport.id;
              return (
                <button
                  key={sport.id}
                  type="button"
                  onClick={() => setSelectedSport(sport.id)}
                  className={`py-3 px-4 rounded-2xl border font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#b92b10] text-white border-[#b92b10] shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span className="text-base">{sport.icon}</span>
                  <span>{sport.name}</span>
                  {isSelected && <Check className="w-4 h-4 stroke-[3] ml-1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Tanggal */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
            <span>Tanggal Main</span>
            <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-[#b92b10] focus:bg-white cursor-pointer"
            />
          </div>
        </div>

        {/* 4. Jam Mulai & Jam Selesai */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <span>Jam Mulai</span>
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full appearance-none pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-[#b92b10] cursor-pointer"
              >
                {TIME_OPTIONS.slice(0, -1).map((t) => (
                  <option key={t} value={t}>{t} WIB</option>
                ))}
              </select>
              <Clock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <span>Jam Selesai</span>
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full appearance-none pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-[#b92b10] cursor-pointer"
              >
                {TIME_OPTIONS.slice(1).map((t) => (
                  <option key={t} value={t}>{t} WIB</option>
                ))}
              </select>
              <Clock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* 5. Jumlah Lapangan & Durasi */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <span>Jumlah Lapangan</span>
              <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1 justify-between">
              <button
                type="button"
                onClick={() => handleCourtCountChange(-1)}
                disabled={courtCount <= 1}
                className="w-9 h-9 rounded-xl bg-white disabled:opacity-40 text-slate-800 font-black text-sm flex items-center justify-center border border-slate-200 shadow-2xs hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>

              <span className="font-black text-base text-slate-900">
                {courtCount}
              </span>

              <button
                type="button"
                onClick={() => handleCourtCountChange(1)}
                disabled={courtCount >= 4}
                className="w-9 h-9 rounded-xl bg-white disabled:opacity-40 text-slate-800 font-black text-sm flex items-center justify-center border border-slate-200 shadow-2xs hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800">
              Durasi Main
            </label>
            <div className="h-[46px] flex items-center justify-center bg-slate-100/80 border border-slate-200 rounded-2xl px-3 text-sm font-black text-slate-800">
              {calculatedDuration} Jam ({startTime} - {endTime})
            </div>
          </div>
        </div>

        {/* Pilih Lapangan Spesifik Chip Selector */}
        <div className="space-y-1.5 pt-1">
          <label className="text-[11px] font-semibold text-slate-600 block">
            Pilihan Nomor Lapangan ({selectedCourtIds.length} dipilih):
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {courts.map((court) => {
              const isChecked = selectedCourtIds.includes(court.id);
              return (
                <button
                  key={court.id}
                  type="button"
                  onClick={() => handleToggleCourt(court.id)}
                  className={`p-2 rounded-xl border text-left text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-red-50/60 border-[#b92b10] text-[#b92b10]'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <span className="truncate">{court.name.split(' ')[0]} {court.name.split(' ')[1]}</span>
                  {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Total Sewa Highlight Box */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Tagihan Sewa</span>
            <span className="text-xs text-slate-300">
              {courtCount} Lapangan × {calculatedDuration} Jam @ {formatRupiah(baseRatePerHour)}
            </span>
          </div>
          <div className="text-lg font-black text-white">
            {formatRupiah(totalSewa)}
          </div>
        </div>

        {/* 6. Nominal DP & Sisa Pembayaran */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <span>Nominal DP</span>
                <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => handleSetDpPercent(0.5)}
                className="text-[10px] font-bold text-[#b92b10] hover:underline cursor-pointer"
              >
                Set 50% ({formatRupiah(totalSewa * 0.5)})
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Rp</span>
              <input
                type="number"
                min={0}
                max={totalSewa}
                required
                value={dpAmount || ''}
                onChange={(e) => setDpAmount(Number(e.target.value))}
                placeholder="150.000"
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 focus:outline-none focus:border-[#b92b10] focus:bg-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800">
              Sisa Pembayaran (Pelunasan)
            </label>
            <div className="h-[46px] flex items-center justify-between bg-amber-50/80 border border-amber-200 rounded-2xl px-3.5">
              <span className="text-xs font-semibold text-amber-800">Belum Lunas:</span>
              <span className="text-sm font-black text-amber-950">
                {sisaPembayaran === 0 ? 'LUNAS' : formatRupiah(sisaPembayaran)}
              </span>
            </div>
          </div>
        </div>

        {/* 7. Metode Pembayaran (Hanya QRIS dan Cash) */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
            <span>Metode Pembayaran</span>
            <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { id: 'QRIS', label: 'QRIS', icon: QrCode },
              { id: 'CASH', label: 'Cash', icon: Banknote },
            ].map((item) => {
              const isSelected = paymentMethod === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPaymentMethod(item.id as PaymentMethod)}
                  className={`py-3 px-4 rounded-2xl border font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {isSelected && <Check className="w-4 h-4 stroke-[3] ml-1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Jika Tunai: Input Uang Diterima & Kembalian */}
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
                placeholder={dpAmount.toString()}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:border-[#b92b10]"
              />
            </div>
          </div>
        )}

        {/* 8. Catatan (Opsional) */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-800">
            Catatan (Opsional)
          </label>
          <input
            type="text"
            placeholder="Contoh: DP untuk 2 lapangan"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#b92b10] focus:bg-white"
          />
        </div>

        {/* 9. Tombol Submit Simpan DP */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-3.5 px-4 rounded-2xl bg-[#b92b10] hover:bg-[#a3250d] active:scale-[0.99] text-white font-black text-sm sm:text-base shadow-lg shadow-[#b92b10]/25 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            <span>Simpan DP</span>
          </button>
        </div>
      </form>

      {/* Success Confirmation Modal (Step 6) */}
      <BookingSuccessModal
        isOpen={isSuccessOpen}
        booking={lastCreatedBooking}
        mode="DP"
        onClose={() => {
          setIsSuccessOpen(false);
          router.push('/booking');
        }}
        onViewReceipt={() => {
          setIsSuccessOpen(false);
          setIsReceiptOpen(true);
        }}
        onNewTransaction={() => {
          setIsSuccessOpen(false);
          router.push('/booking');
        }}
      />

      {/* Thermal Receipt Modal */}
      <BookingReceiptModal
        isOpen={isReceiptOpen}
        booking={lastCreatedBooking}
        onClose={() => {
          setIsReceiptOpen(false);
          router.push('/booking');
        }}
      />
    </div>
  );
}
