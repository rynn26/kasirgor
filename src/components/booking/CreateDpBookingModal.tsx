'use client';

import React, { useState, useEffect } from 'react';
import { useCourtBookingStore } from '@/lib/store/useCourtBookingStore';
import { useShiftStore } from '@/lib/store/useShiftStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { formatRupiah, formatNumber, parseNumberInput } from '@/lib/utils';
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
  CalendarCheck2,
  Repeat,
  Tag
} from 'lucide-react';
import { getMemberDatesInMonth } from '@/lib/memberUtils';
import { useCourtPricingStore } from '@/lib/store/useCourtPricingStore';

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
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
];

export const CreateDpBookingModal: React.FC<CreateDpBookingModalProps> = ({
  isOpen,
  initialCourtId,
  initialStartTime = '08:00',
  initialDate,
  initialMode = 'FULL',
  onClose,
  onSuccess,
}) => {
  const { courts, loadCourts, addBooking } = useCourtBookingStore();
  const { cashierName } = useShiftStore();
  const { calculateBookingFee } = useCourtPricingStore();
  const { showToast } = useToastStore();

  const todayStr = new Date().toISOString().split('T')[0];

  // Form State
  const [courtId, setCourtId] = useState(initialCourtId || courts[0]?.id || 'court-00001');
  const [courtCount, setCourtCount] = useState(1);
  const [bookingDate, setBookingDate] = useState(todayStr);
  const [date, setDate] = useState(initialDate || todayStr);
  const [selectedMemberDayIndex, setSelectedMemberDayIndex] = useState<number>(() => {
    const d = new Date();
    return d.getDay();
  });
  const [startTime, setStartTime] = useState(initialStartTime);
  const [durationHours, setDurationHours] = useState(2);
  
  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [memberType, setMemberType] = useState<'MEMBER' | 'INSIDENTIL'>('INSIDENTIL');

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

  // Payment info
  const [courtFee, setCourtFee] = useState<number>(160000);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('QRIS');
  const [cashReceived, setCashReceived] = useState<number>(0);

  const finalTotal = Math.max(0, courtFee - (discountAmount || 0));

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
  }, [initialCourtId, initialStartTime, initialDate, isOpen]);

  // Sync courtId when courts load from database
  useEffect(() => {
    if (courts.length > 0 && (!courtId || !courts.some((c) => c.id === courtId))) {
      setCourtId(courts[0].id);
    }
  }, [courts, courtId]);

  const selectedCourt = courts.find((c) => c.id === courtId) || courts[0];

  // Auto calculate fee dynamically based on court, date, startTime, and duration
  useEffect(() => {
    if (selectedCourt) {
      const calc = calculateBookingFee(
        selectedCourt.id,
        date,
        startTime,
        durationHours,
        courtCount,
        selectedCourt.pricePerHour
      );
      if (memberType === 'MEMBER') {
        const sessionCount = memberSchedule.sessionCount || 4;
        setCourtFee(calc.totalFee * sessionCount);
      } else {
        setCourtFee(calc.totalFee);
      }
    }
  }, [selectedCourt?.id, date, startTime, durationHours, courtCount, memberType, memberSchedule.sessionCount]);

  if (!isOpen) return null;

  const isPickleball = selectedCourt 
    ? (selectedCourt.type.toLowerCase().includes('pickleball') || selectedCourt.name.toLowerCase().includes('pickleball'))
    : false;

  // Calculate End Time
  const startHourNum = parseInt(startTime.split(':')[0], 10);
  const endHourNum = startHourNum + durationHours;
  const endTime = `${endHourNum < 10 ? '0' : ''}${endHourNum}:00`;

  const quickNominals = [
    finalTotal,
    50000,
    100000,
    150000,
    200000,
    300000,
  ].filter((v, i, a) => v > 0 && a.indexOf(v) === i && v >= finalTotal);

  const cashChange = Math.max(0, (cashReceived || 0) - finalTotal);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalCustomerName = customerName.trim() || 'Penyewa Umum';
    const finalPhone = phone.trim() || '-';

    if (finalTotal < 0) {
      showToast('Total biaya sewa tidak boleh negatif');
      return;
    }

    if (paymentMethod === 'CASH' && (cashReceived || 0) < finalTotal) {
      setCashReceived(finalTotal);
    }

    const courtNameLabel = courtCount === 1 
      ? selectedCourt?.name || 'Lapangan 1'
      : `${courtCount} Lapangan (${courts.slice(0, courtCount).map(c => c.name.split(' ')[0] + ' ' + c.name.split(' ')[1]).join(', ')})`;

    const finalCommunityName = isPickleball 
      ? 'Pickleball (Insidentil)' 
      : (memberType === 'MEMBER' 
          ? `Badminton (Member ${memberSchedule.sessionCount}x Pertemuan - Setiap ${memberSchedule.dayName})` 
          : 'Badminton (Insidentil)');

    const finalNotes = !isPickleball && memberType === 'MEMBER'
      ? `Paket Member ${memberSchedule.monthName} ${memberSchedule.year}: ${memberSchedule.sessionCount}x Pertemuan (Setiap ${memberSchedule.dayName}: ${memberSchedule.formattedDatesList})`
      : undefined;

    const firstDate = !isPickleball && memberType === 'MEMBER' && memberSchedule.dates.length > 0
      ? memberSchedule.dates[0]
      : date;

    const newBooking = await addBooking({
      customerName: finalCustomerName,
      phone: finalPhone,
      communityName: finalCommunityName,
      memberType: isPickleball ? 'INSIDENTIL' : memberType,
      memberDay: (!isPickleball && memberType === 'MEMBER') ? memberSchedule.dayName : undefined,
      memberSessionsCount: (!isPickleball && memberType === 'MEMBER') ? memberSchedule.sessionCount : undefined,
      memberDates: (!isPickleball && memberType === 'MEMBER') ? memberSchedule.dates : undefined,
      bookingDate,
      date: firstDate,
      courtId: selectedCourt?.id || courtId || '',
      courtName: courtNameLabel,
      courtType: selectedCourt?.type || 'VIP Vinyl BWF',
      courtPricePerHour: Math.round(finalTotal / (durationHours * courtCount || 1)),
      startTime,
      endTime,
      durationHours,
      courtFee,
      additionalItems: [],
      totalAmount: finalTotal,
      dpAmount: finalTotal,
      dpPaymentMethod: paymentMethod,
      dpPaidAt: bookingDate ? `${bookingDate}T${new Date().toTimeString().slice(0, 8)}.000Z` : new Date().toISOString(),
      dpCashier: cashierName || 'Yuli',
      settlementAmount: finalTotal,
      settlementPaymentMethod: paymentMethod,
      settlementPaidAt: new Date().toISOString(),
      settlementCashier: cashierName || 'Yuli',
      amountPaidTotal: finalTotal,
      remainingBalance: 0,
      status: 'SETTLED',
      notes: finalNotes,
    });

    showToast('Sewa lapangan LUNAS berhasil dicatat!');
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
                Sewa Langsung (Bayar Lunas)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Pilih lapangan, waktu main, dan penerimaan pembayaran
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
          
          {/* Section 1: Schedule & Duration */}
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>1. Waktu & Durasi Bermain</span>
            </label>

            {/* Tanggal Booking */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600">
                  Tanggal Booking
                </label>
                <span className="text-[10px] text-slate-400">
                  (Tgl pesan / bayar DP)
                </span>
              </div>
              <div className="relative">
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#b92b10]"
                />
              </div>
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
                <div>
                  <span className="font-semibold text-amber-900 block">
                    {startTime} - {endTime} WIB ({durationHours} Jam) • {courtCount} Lapangan
                  </span>
                  <span className="text-[10px] text-amber-800 font-medium">
                    {courtFee > 0 && `Tarif Waktu Otomatis: ${formatRupiah(courtFee)}`}
                  </span>
                </div>
              </div>
              <div className="font-bold text-amber-900 text-right">
                <span>{selectedCourt?.name.split(' ')[0]} {selectedCourt?.name.split(' ')[1]}</span>
                <span className="block text-[11px] font-black text-[#b92b10]">{formatRupiah(courtFee)}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Customer Identity */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>2. Informasi Penyewa</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Nama Pemesan <span className="text-red-500">*</span>
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

            {/* Kategori Sewa Khusus Badminton (Member vs Insidentil) */}
            {!isPickleball && (
              <div className="pt-1 space-y-2">
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setMemberType('MEMBER')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      memberType === 'MEMBER'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>👤 Member (Rutin Tiap Minggu)</span>
                    {memberType === 'MEMBER' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setMemberType('INSIDENTIL')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      memberType === 'INSIDENTIL'
                        ? 'bg-[#b92b10] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>⚡ Insidentil (Sekali Main)</span>
                    {memberType === 'INSIDENTIL' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                </div>

                {/* Pengaturan Jadwal Khusus Member Badminton */}
                {memberType === 'MEMBER' && (
                  <div className="p-3 bg-blue-50/90 border border-blue-200/90 rounded-xl space-y-2 text-xs animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-900">Pilih Hari Main Rutin:</span>
                      <span className="font-black text-blue-700">Setiap {memberSchedule.dayName}</span>
                    </div>
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
                          className={`py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            selectedMemberDayIndex === d.idx
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-white border border-blue-200 text-blue-900 hover:bg-blue-100'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>

                    <div className="pt-1 text-[11px] text-blue-900 font-medium">
                      <span>🏸 Paket {memberSchedule.sessionCount}x Pertemuan di Bulan <strong>{memberSchedule.monthName} {memberSchedule.year}</strong>:</span>
                      <div className="flex flex-wrap gap-1 mt-1 font-bold">
                        {memberSchedule.dates.map((dt, i) => (
                          <span key={dt} className="px-1.5 py-0.5 rounded bg-white text-blue-950 border border-blue-200 text-[10px]">
                            {i + 1}: {dt.split('-')[2]}/{dt.split('-')[1]}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Direct Payment (Lunas) */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>3. Total Biaya Sewa (Lunas)</span>
              <span className="text-emerald-700 text-[11px] font-bold">
                Kasir: {cashierName || 'Yuli'}
              </span>
            </label>

            {/* Manual Tarif Sewa & Diskon Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Tarif Sewa Lapangan (Rp) *</span>
                  <span className="text-[10px] text-slate-400 font-normal">Ketik manual</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="Contoh: 160.000"
                    value={courtFee ? formatNumber(courtFee) : ''}
                    onChange={(e) => setCourtFee(parseNumberInput(e.target.value))}
                    className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:border-[#b92b10]"
                  />
                </div>
              </div>

              {/* Input Diskon Manual */}
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl space-y-1.5">
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
                    className="w-full pl-10 pr-3 py-2 bg-white border border-emerald-200 rounded-xl text-sm font-black text-emerald-950 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Total Tagihan Bersih (Jika Ada Diskon) */}
            {discountAmount > 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 block">Tarif Awal: {formatRupiah(courtFee)} (Diskon: -{formatRupiah(discountAmount)})</span>
                  <span className="font-bold text-emerald-900">Total Tagihan Bersih:</span>
                </div>
                <span className="text-base font-black text-emerald-700">{formatRupiah(finalTotal)}</span>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-semibold text-slate-600 block">
                Metode Pembayaran
              </label>
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
                      className={`p-2.5 rounded-2xl border text-center flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#b92b10] text-white border-[#b92b10] shadow-xs font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-bold">{item.label}</span>
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
                    type="text"
                    inputMode="numeric"
                    value={cashReceived ? formatNumber(cashReceived) : ''}
                    onChange={(e) => setCashReceived(parseNumberInput(e.target.value))}
                    placeholder={formatNumber(finalTotal) || '0'}
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
                      {nom === finalTotal ? 'Uang Pas' : formatRupiah(nom)}
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
              <span>Simpan & Cetak Nota Lunas</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
