'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCourtBookingStore } from '@/lib/store/useCourtBookingStore';
import { useShiftStore } from '@/lib/store/useShiftStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { formatRupiah, formatNumber, parseNumberInput } from '@/lib/utils';
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
  CheckCircle2,
  Repeat,
  Tag
} from 'lucide-react';
import { BookingReceiptModal } from '@/components/booking/BookingReceiptModal';
import { BookingSuccessModal } from '@/components/booking/BookingSuccessModal';
import { getMemberDatesInMonth } from '@/lib/memberUtils';
import { useCourtPricingStore } from '@/lib/store/useCourtPricingStore';

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
  const { calculateBookingFee } = useCourtPricingStore();
  const { showToast } = useToastStore();

  // Load courts from Supabase on mount
  useEffect(() => {
    loadCourts();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedSport, setSelectedSport] = useState('Badminton');
  const [memberType, setMemberType] = useState<'MEMBER' | 'INSIDENTIL'>('INSIDENTIL');
  const [date, setDate] = useState(todayStr);
  const [selectedMemberDayIndex, setSelectedMemberDayIndex] = useState<number>(() => {
    const d = new Date();
    return d.getDay();
  });
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('21:00');
  const [courtCount, setCourtCount] = useState(1);
  const [selectedCourtIds, setSelectedCourtIds] = useState<string[]>([]);
  const [dpAmount, setDpAmount] = useState<number>(100000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('QRIS');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Auto calculate member weekly sessions in month
  const memberSchedule = React.useMemo(() => {
    return getMemberDatesInMonth(date, selectedMemberDayIndex);
  }, [date, selectedMemberDayIndex]);

  const handleSelectMemberDay = (dayIdx: number) => {
    setSelectedMemberDayIndex(dayIdx);
    const schedule = getMemberDatesInMonth(date, dayIdx);
    if (schedule.dates.length > 0) {
      setDate(schedule.dates[0]);
    }
  };

  const handleDateChange = (newDateStr: string) => {
    setDate(newDateStr);
    const d = new Date(newDateStr + 'T00:00:00');
    if (!isNaN(d.getDay())) {
      setSelectedMemberDayIndex(d.getDay());
    }
  };

  // Receipt and Success Modal State
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastCreatedBooking, setLastCreatedBooking] = useState<CourtBooking | null>(null);

  // Calculate Duration
  const startHour = parseInt(startTime.split(':')[0], 10);
  const endHour = parseInt(endTime.split(':')[0], 10);
  const calculatedDuration = Math.max(1, endHour > startHour ? endHour - startHour : 1);

  // State for manual total sewa, discount & DP
  const [totalSewa, setTotalSewa] = useState<number>(150000);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [baseRatePerHour, setBaseRatePerHour] = useState<number>(75000);
  const netTotalSewa = Math.max(0, totalSewa - (discountAmount || 0));
  const sisaPembayaran = Math.max(0, netTotalSewa - (dpAmount || 0));

  // Dynamic fee calculation based on time and month
  useEffect(() => {
    const firstCourt = courts.find((c) => selectedCourtIds.includes(c.id)) || courts[0];
    if (firstCourt) {
      const calc = calculateBookingFee(
        firstCourt.id,
        date,
        startTime,
        calculatedDuration,
        courtCount,
        firstCourt.pricePerHour
      );
      setBaseRatePerHour(calc.ratePerHour);
      if (memberType === 'MEMBER') {
        const sessionCount = memberSchedule.sessionCount || 4;
        setTotalSewa(calc.totalFee * sessionCount);
      } else {
        setTotalSewa(calc.totalFee);
      }
    }
  }, [selectedCourtIds, date, startTime, calculatedDuration, courtCount, memberType, memberSchedule.sessionCount]);

  // Calculate max courts and available courts depending on sport
  const maxCourts = selectedSport === 'Pickleball' ? 2 : 4;
  const availableCourts = courts.slice(0, maxCourts);

  // Auto-initialize selected court on courts loaded
  useEffect(() => {
    if (courts.length > 0 && selectedCourtIds.length === 0) {
      setSelectedCourtIds([courts[0].id]);
    }
  }, [courts]);

  const handleSelectSport = (sportId: string) => {
    setSelectedSport(sportId);
    if (sportId === 'Pickleball') {
      setMemberType('INSIDENTIL');
    }
    const newMax = sportId === 'Pickleball' ? 2 : 4;
    const newAvailable = courts.slice(0, newMax);
    const validSelected = selectedCourtIds.filter((id) => newAvailable.some((c) => c.id === id));

    if (validSelected.length === 0) {
      const defaultIds = newAvailable.slice(0, 1).map((c) => c.id);
      setSelectedCourtIds(defaultIds);
      setCourtCount(defaultIds.length || 1);
    } else {
      setSelectedCourtIds(validSelected);
      setCourtCount(validSelected.length);
    }
  };

  // Sync court count with court selections
  const handleToggleCourt = (courtId: string) => {
    if (selectedCourtIds.includes(courtId)) {
      if (selectedCourtIds.length > 1) {
        const next = selectedCourtIds.filter((id) => id !== courtId);
        setSelectedCourtIds(next);
        setCourtCount(next.length);
      }
    } else {
      if (selectedCourtIds.length < maxCourts) {
        const next = [...selectedCourtIds, courtId];
        setSelectedCourtIds(next);
        setCourtCount(next.length);
      }
    }
  };

  const handleCourtCountChange = (delta: number) => {
    const nextCount = Math.max(1, Math.min(maxCourts, courtCount + delta));
    setCourtCount(nextCount);
    setSelectedCourtIds(availableCourts.slice(0, nextCount).map((c) => c.id));
  };

  // Quick DP Percentage Helpers
  const handleSetDpPercent = (pct: number) => {
    const calculated = Math.round(totalSewa * pct);
    setDpAmount(calculated);
  };

  const cashChange = Math.max(0, (cashReceived || 0) - dpAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalCustomerName = customerName.trim() || 'Penyewa Umum';
    const finalPhone = phone.trim() || '-';
    const finalDp = dpAmount > 0 ? Math.min(dpAmount, netTotalSewa) : netTotalSewa;

    if (paymentMethod === 'CASH' && (cashReceived || 0) < finalDp) {
      setCashReceived(finalDp);
    }

    const selectedCourtsNames = courts
      .filter((c) => selectedCourtIds.includes(c.id))
      .map((c) => c.name)
      .join(' & ') || `${courtCount} Lapangan (${selectedSport})`;

    const finalCommunityName = selectedSport === 'Badminton' 
      ? (memberType === 'MEMBER' 
          ? `Badminton (Member ${memberSchedule.sessionCount}x Pertemuan - Setiap ${memberSchedule.dayName})` 
          : 'Badminton (Insidentil)') 
      : 'Pickleball (Insidentil)';

    const finalNotes = memberType === 'MEMBER'
      ? `Paket Member ${memberSchedule.monthName} ${memberSchedule.year}: ${memberSchedule.sessionCount}x Pertemuan (Setiap ${memberSchedule.dayName}: ${memberSchedule.formattedDatesList})${notes.trim() ? ` • ${notes.trim()}` : ''}`
      : (notes.trim() || undefined);

    const firstDate = memberType === 'MEMBER' && memberSchedule.dates.length > 0
      ? memberSchedule.dates[0]
      : date;

    const remaining = Math.max(0, netTotalSewa - finalDp);

    const newBooking = await addBooking({
      customerName: finalCustomerName,
      phone: finalPhone,
      communityName: finalCommunityName,
      memberType: selectedSport === 'Badminton' ? memberType : 'INSIDENTIL',
      memberDay: memberType === 'MEMBER' ? memberSchedule.dayName : undefined,
      memberSessionsCount: memberType === 'MEMBER' ? memberSchedule.sessionCount : undefined,
      memberDates: memberType === 'MEMBER' ? memberSchedule.dates : undefined,
      date: firstDate,
      courtId: selectedCourtIds[0] || courts[0]?.id || '',
      courtName: selectedCourtsNames,
      courtType: courts.find((c) => c.id === selectedCourtIds[0])?.type || courts[0]?.type || 'VIP Vinyl BWF',
      courtPricePerHour: baseRatePerHour,
      startTime,
      endTime,
      durationHours: calculatedDuration,
      courtFee: totalSewa,
      additionalItems: [],
      totalAmount: netTotalSewa,
      dpAmount: finalDp,
      dpPaymentMethod: paymentMethod,
      dpPaidAt: new Date().toISOString(),
      dpCashier: cashierName || 'Yuli',
      amountPaidTotal: finalDp,
      remainingBalance: remaining,
      status: remaining === 0 ? 'SETTLED' : 'DP_PAID',
      notes: finalNotes,
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
          <span className="text-xs font-bold text-slate-800">{cashierName || 'Yuli'}</span>
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
                  onClick={() => handleSelectSport(sport.id)}
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

        {/* 2b. Kategori Sewa Khusus Badminton (Member vs Insidentil) */}
        {selectedSport === 'Badminton' && (
          <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Kategori Sewa Badminton:
              </label>
              <span className="text-[10px] font-semibold text-slate-500">
                {memberType === 'MEMBER' ? 'Langganan Mingguan 1 Bulan' : 'Sekali Main / Insidentil'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMemberType('MEMBER')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  memberType === 'MEMBER'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>👤 Member (Rutin Tiap Minggu)</span>
                {memberType === 'MEMBER' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>

              <button
                type="button"
                onClick={() => setMemberType('INSIDENTIL')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  memberType === 'INSIDENTIL'
                    ? 'bg-[#b92b10] text-white border-[#b92b10] shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>⚡ Insidentil (Sekali Main)</span>
                {memberType === 'INSIDENTIL' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
            </div>

            {/* Pengaturan Jadwal Khusus Member Badminton */}
            {memberType === 'MEMBER' && (
              <div className="pt-2 border-t border-slate-200/80 space-y-2.5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>Pilih Hari Main Rutin (Tiap Minggu):</span>
                    <span className="text-blue-700 font-black">Hari {memberSchedule.dayName}</span>
                  </label>
                  <div className="grid grid-cols-7 gap-1">
                    {[
                      { idx: 1, label: 'Sen' },
                      { idx: 2, label: 'Sel' },
                      { idx: 3, label: 'Rab' },
                      { idx: 4, label: 'Kam' },
                      { idx: 5, label: 'Jum' },
                      { idx: 6, label: 'Sab' },
                      { idx: 0, label: 'Min' },
                    ].map((d) => (
                      <button
                        key={d.idx}
                        type="button"
                        onClick={() => handleSelectMemberDay(d.idx)}
                        className={`py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          selectedMemberDayIndex === d.idx
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Info Card Jadwal 1 Bulan Member */}
                <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/90 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-bold text-blue-900">
                    <span className="flex items-center gap-1.5">
                      <Repeat className="w-3.5 h-3.5 text-blue-600" />
                      <span>Paket {memberSchedule.sessionCount}x Pertemuan (1 Bulan)</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px]">
                      {memberSchedule.monthName} {memberSchedule.year}
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-800">
                    Rutin main tiap hari <strong>{memberSchedule.dayName}</strong>:
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {memberSchedule.dates.map((dt, i) => (
                      <span
                        key={dt}
                        className="px-2 py-1 rounded-md bg-white border border-blue-200 text-blue-950 font-bold text-[11px] shadow-2xs"
                      >
                        Pertemuan {i + 1}: {dt.split('-')[2]}/{dt.split('-')[1]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. Tanggal */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span>{memberType === 'MEMBER' ? 'Bulan & Tanggal Mulai Main' : 'Tanggal Main'}</span>
              <span className="text-red-500">*</span>
            </span>
            {memberType === 'MEMBER' && (
              <span className="text-[11px] text-blue-600 font-semibold">
                Periode Bulan: {memberSchedule.monthName} {memberSchedule.year}
              </span>
            )}
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="date"
              required
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
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
                disabled={courtCount >= maxCourts}
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

        {/* Total Sewa & Diskon Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Tarif Sewa Lapangan (Rp) *</span>
              <span className="text-[11px] text-slate-400 font-normal">Ketik manual</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                required
                value={totalSewa ? formatNumber(totalSewa) : ''}
                onChange={(e) => setTotalSewa(parseNumberInput(e.target.value))}
                placeholder="Contoh: 150.000"
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 focus:outline-none focus:border-[#b92b10] focus:bg-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-emerald-900 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                <span>Diskon / Potongan (Rp)</span>
              </span>
              {discountAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setDiscountAmount(0)}
                  className="text-[10px] text-rose-600 hover:underline font-bold"
                >
                  Hapus Diskon
                </button>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-emerald-600">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={discountAmount ? formatNumber(discountAmount) : ''}
                onChange={(e) => setDiscountAmount(parseNumberInput(e.target.value))}
                className="w-full pl-9 pr-3.5 py-2.5 bg-emerald-50/50 border border-emerald-200 rounded-2xl text-sm font-black text-emerald-950 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Total Bersih Banner (Jika Ada Diskon) */}
        {discountAmount > 0 && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900">
            <span className="font-medium">Total Tagihan Bersih (Setelah Diskon):</span>
            <span className="text-sm font-black text-emerald-700">{formatRupiah(netTotalSewa)}</span>
          </div>
        )}

        {/* 6. Nominal DP & Sisa Pembayaran */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span>Nominal DP</span>
                <span className="text-red-500">*</span>
              </span>
              <div className="flex items-center gap-1 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => handleSetDpPercent(0.5)}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  DP 50%
                </button>
                <button
                  type="button"
                  onClick={() => setDpAmount(netTotalSewa)}
                  className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 cursor-pointer"
                >
                  Lunas 100%
                </button>
              </div>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                required
                value={dpAmount ? formatNumber(dpAmount) : ''}
                onChange={(e) => setDpAmount(parseNumberInput(e.target.value))}
                placeholder="Contoh: 150.000"
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
                type="text"
                inputMode="numeric"
                value={cashReceived ? formatNumber(cashReceived) : ''}
                onChange={(e) => setCashReceived(parseNumberInput(e.target.value))}
                placeholder={formatNumber(dpAmount) || '0'}
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
