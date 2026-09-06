'use client';

import React, { useState, useEffect } from 'react';
import { CourtBooking, BookingStatus } from '@/types/booking';
import { PaymentMethod } from '@/types/pos';
import { useCourtBookingStore } from '@/lib/store/useCourtBookingStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { formatRupiah, formatNumber, parseNumberInput } from '@/lib/utils';
import { DAY_NAMES, getMemberDatesInMonth } from '@/lib/memberUtils';
import {
  X,
  User,
  Phone,
  Calendar,
  Clock,
  Banknote,
  QrCode,
  Check,
  Save,
  AlertCircle
} from 'lucide-react';

interface EditCourtBookingModalProps {
  isOpen: boolean;
  booking: CourtBooking | null;
  onClose: () => void;
  onSuccess?: (updated: CourtBooking) => void;
}

const SPORT_TYPES = [
  { id: 'Badminton', name: 'Badminton', icon: '🏸' },
  { id: 'Pickleball', name: 'Pickleball', icon: '🏓' },
];

const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '24:00'
];

export const EditCourtBookingModal: React.FC<EditCourtBookingModalProps> = ({
  isOpen,
  booking,
  onClose,
  onSuccess,
}) => {
  const { courts, loadCourts, updateBooking } = useCourtBookingStore();
  const { showToast } = useToastStore();

  useEffect(() => {
    if (courts.length === 0) {
      loadCourts();
    }
  }, [courts.length, loadCourts]);

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedSport, setSelectedSport] = useState('Badminton');
  const [memberType, setMemberType] = useState<'MEMBER' | 'INSIDENTIL'>('INSIDENTIL');
  const [selectedMemberDayIndex, setSelectedMemberDayIndex] = useState<number>(1);
  const [bookingDate, setBookingDate] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('21:00');
  const [courtCount, setCourtCount] = useState(1);
  const [selectedCourtIds, setSelectedCourtIds] = useState<string[]>([]);
  const [totalSewa, setTotalSewa] = useState<number>(0);
  const [dpAmount, setDpAmount] = useState<number>(0);
  const [dpPaymentMethod, setDpPaymentMethod] = useState<PaymentMethod>('QRIS');
  const [settlementPaymentMethod, setSettlementPaymentMethod] = useState<PaymentMethod>('QRIS');
  const [settlementPaidDate, setSettlementPaidDate] = useState<string>('');
  const [status, setStatus] = useState<BookingStatus>('DP_PAID');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (booking && isOpen) {
      setCustomerName(booking.customerName || '');
      setPhone(booking.phone || '');
      const isPickleball = booking.communityName?.toLowerCase().includes('pickleball');
      const sport = isPickleball ? 'Pickleball' : 'Badminton';
      setSelectedSport(sport);
      const isMem = booking.memberType === 'MEMBER' || booking.communityName?.toLowerCase().includes('member');
      const resolvedMemberType = sport === 'Badminton' && isMem ? 'MEMBER' : 'INSIDENTIL';
      setMemberType(resolvedMemberType);

      // Detect initial day index for member
      let initialDayIdx = 1;
      if (booking.memberDay) {
        const foundIdx = DAY_NAMES.indexOf(booking.memberDay);
        if (foundIdx !== -1) initialDayIdx = foundIdx;
      } else if (booking.communityName) {
        const foundDay = DAY_NAMES.findIndex((d) => booking.communityName?.toLowerCase().includes(d.toLowerCase()));
        if (foundDay !== -1) initialDayIdx = foundDay;
      } else if (booking.date) {
        const d = new Date(booking.date.includes('T') ? booking.date : `${booking.date}T00:00:00`);
        if (!isNaN(d.getDay())) initialDayIdx = d.getDay();
      }
      setSelectedMemberDayIndex(initialDayIdx);

      setBookingDate(booking.bookingDate || (booking.dpPaidAt ? booking.dpPaidAt.split('T')[0] : booking.date));
      setDate(booking.date || '');
      setStartTime(booking.startTime || '19:00');
      setEndTime(booking.endTime || '21:00');
      setTotalSewa(booking.totalAmount || booking.courtFee || 160000);
      setDpAmount(booking.dpAmount || 0);
      setDpPaymentMethod(booking.dpPaymentMethod || 'QRIS');
      setSettlementPaymentMethod(booking.settlementPaymentMethod || 'QRIS');
      const initSettle = booking.settlementPaidAt
        ? booking.settlementPaidAt.split('T')[0]
        : (booking.status === 'SETTLED' ? (booking.bookingDate || (booking.dpPaidAt ? booking.dpPaidAt.split('T')[0] : booking.date)) : new Date().toISOString().split('T')[0]);
      setSettlementPaidDate(initSettle);
      setStatus(booking.status);
      setNotes(booking.notes || '');

      // Identify selected courts
      const maxAllowed = sport === 'Pickleball' ? 2 : 4;
      const matchedCourts = courts.filter((c) => booking.courtName.includes(c.name.split(' ')[0] + ' ' + c.name.split(' ')[1]));
      if (matchedCourts.length > 0) {
        const ids = matchedCourts.slice(0, maxAllowed).map((c) => c.id);
        setSelectedCourtIds(ids);
        setCourtCount(ids.length);
      } else {
        const initial = courts.slice(0, 1).map((c) => c.id);
        setSelectedCourtIds(initial);
        setCourtCount(1);
      }
    }
  }, [booking, isOpen, courts]);

  // Calculate member schedule dynamically
  const memberSchedule = React.useMemo(() => {
    return getMemberDatesInMonth(date || new Date().toISOString().split('T')[0], selectedMemberDayIndex);
  }, [date, selectedMemberDayIndex]);

  const handleSelectMemberDay = (dayIdx: number) => {
    setSelectedMemberDayIndex(dayIdx);
    const schedule = getMemberDatesInMonth(date || new Date().toISOString().split('T')[0], dayIdx);
    if (schedule.dates.length > 0) {
      setDate(schedule.dates[0]);
    }
    if (!notes || notes.includes('Paket Member')) {
      setNotes(`Paket Member ${schedule.monthName} ${schedule.year}: ${schedule.sessionCount}x Pertemuan (Setiap ${schedule.dayName}: ${schedule.formattedDatesList})`);
    }
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    if (memberType === 'MEMBER' && newDate) {
      const d = new Date(newDate.includes('T') ? newDate : `${newDate}T00:00:00`);
      if (!isNaN(d.getDay())) {
        const dayIdx = d.getDay();
        setSelectedMemberDayIndex(dayIdx);
        const schedule = getMemberDatesInMonth(newDate, dayIdx);
        if (!notes || notes.includes('Paket Member')) {
          setNotes(`Paket Member ${schedule.monthName} ${schedule.year}: ${schedule.sessionCount}x Pertemuan (Setiap ${schedule.dayName}: ${schedule.formattedDatesList})`);
        }
      }
    }
  };

  const handleChangeMonth = (targetYear: number, targetMonthIndex: number) => {
    const cur = new Date(targetYear, targetMonthIndex, 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    let firstDate = '';
    while (cur.getMonth() === targetMonthIndex) {
      if (cur.getDay() === selectedMemberDayIndex) {
        firstDate = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`;
        break;
      }
      cur.setDate(cur.getDate() + 1);
    }
    if (!firstDate) {
      firstDate = `${targetYear}-${pad(targetMonthIndex + 1)}-01`;
    }
    setDate(firstDate);
    const schedule = getMemberDatesInMonth(firstDate, selectedMemberDayIndex);
    setNotes(`Paket Member ${schedule.monthName} ${schedule.year}: ${schedule.sessionCount}x Pertemuan (Setiap ${schedule.dayName}: ${schedule.formattedDatesList})`);
  };

  if (!isOpen || !booking) return null;

  const maxCourts = selectedSport === 'Pickleball' ? 2 : 4;
  const availableCourts = courts.slice(0, maxCourts);

  // Calculate Duration
  const startHour = parseInt(startTime.split(':')[0], 10);
  const endHour = parseInt(endTime.split(':')[0], 10);
  const calculatedDuration = Math.max(1, endHour > startHour ? endHour - startHour : 1);

  const baseRatePerHour = 75000;
  const remainingBalance = Math.max(0, totalSewa - (status === 'SETTLED' ? totalSewa : dpAmount));

  const handleSelectSport = (sportId: string) => {
    setSelectedSport(sportId);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      showToast('Harap isi nama customer');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCourtsNames = courts
        .filter((c) => selectedCourtIds.includes(c.id))
        .map((c) => c.name)
        .join(' & ') || `${courtCount} Lapangan (${selectedSport})`;

      const finalAmountPaid = status === 'SETTLED' ? totalSewa : dpAmount;
      const finalRemaining = Math.max(0, totalSewa - finalAmountPaid);

      const isMember = selectedSport === 'Badminton' && memberType === 'MEMBER';
      const finalCommunityName = selectedSport === 'Badminton'
        ? (isMember
            ? `Badminton (Member ${memberSchedule.sessionCount}x Pertemuan - Setiap ${memberSchedule.dayName})`
            : 'Badminton (Insidentil)')
        : 'Pickleball (Insidentil)';

      const autoScheduleNote = `Paket Member ${memberSchedule.monthName} ${memberSchedule.year}: ${memberSchedule.sessionCount}x Pertemuan (Setiap ${memberSchedule.dayName}: ${memberSchedule.formattedDatesList})`;

      let finalNotes: string | undefined = notes.trim() || undefined;
      if (isMember) {
        if (!finalNotes || finalNotes.includes('Paket Member')) {
          finalNotes = autoScheduleNote;
        }
      }

      const updated = await updateBooking(booking.id, {
        customerName: customerName.trim(),
        phone: phone.trim() || '0812-0000-0000',
        communityName: finalCommunityName,
        memberType: isMember ? 'MEMBER' : 'INSIDENTIL',
        memberDay: isMember ? memberSchedule.dayName : undefined,
        memberSessionsCount: isMember ? memberSchedule.sessionCount : undefined,
        memberDates: isMember ? memberSchedule.dates : undefined,
        bookingDate,
        date,
        dpPaidAt: bookingDate ? `${bookingDate}T12:00:00.000Z` : booking.dpPaidAt,
        courtId: selectedCourtIds[0] || booking.courtId || courts[0]?.id || '',
        courtName: selectedCourtsNames,
        courtPricePerHour: baseRatePerHour,
        startTime,
        endTime,
        durationHours: calculatedDuration,
        courtFee: totalSewa,
        totalAmount: totalSewa,
        dpAmount: dpAmount,
        dpPaymentMethod: dpPaymentMethod,
        settlementAmount: status === 'SETTLED' ? (dpAmount < totalSewa ? totalSewa - dpAmount : totalSewa) : undefined,
        settlementPaymentMethod: status === 'SETTLED' ? settlementPaymentMethod : undefined,
        settlementPaidAt: status === 'SETTLED' ? `${settlementPaidDate}T12:00:00.000Z` : undefined,
        amountPaidTotal: finalAmountPaid,
        remainingBalance: finalRemaining,
        status: status,
        notes: finalNotes,
      });

      showToast('Data booking berhasil diperbarui!');

      // Record Activity Log
      import('@/lib/db/activityLogs').then(({ recordActivityLog }) => {
        const { useShiftStore } = require('@/lib/store/useShiftStore');
        const activeCashier = useShiftStore.getState().cashierName || 'Yuli';
        recordActivityLog({
          staffName: activeCashier,
          role: 'Kasir',
          actionType: 'EDIT_BOOKING',
          title: 'Edit Data Booking Lapangan',
          details: `Kasir ${activeCashier} mengubah booking #${booking.id.slice(0, 8)} (${customerName.trim()} - ${selectedSport}). Tgl Main: ${date}, Jam: ${startTime}-${endTime}, Lapangan: ${selectedCourtsNames}, Total: ${formatRupiah(totalSewa)}, Status: ${status === 'SETTLED' ? 'LUNAS' : 'DP'}.`,
          metadata: {
            bookingId: booking.id,
            customerName: customerName.trim(),
            sport: selectedSport,
            totalSewa,
            dpAmount,
            status,
            date,
          }
        });
      });

      if (onSuccess) onSuccess(updated);
      onClose();
    } catch {
      showToast('Gagal memperbarui data booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Edit Transaksi Booking
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Perbaiki kesalahan nama, jadwal, nomor lapangan, atau pembayaran
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          
          {/* Customer Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-800 flex items-center gap-1">
                <span>Nama Customer</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nama pemesan..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-[#b92b10] focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-800">
                Nomor WhatsApp / HP
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-[#b92b10] focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Sport Selection */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800">
              Jenis Olahraga
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SPORT_TYPES.map((sport) => {
                const isSelected = selectedSport === sport.id;
                return (
                  <button
                    key={sport.id}
                    type="button"
                    onClick={() => handleSelectSport(sport.id)}
                    className={`py-2.5 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#b92b10] text-white border-[#b92b10] shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>{sport.icon}</span>
                    <span>{sport.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                );
              })}
            </div>

            {/* Kategori Sewa Khusus Badminton */}
            {selectedSport === 'Badminton' && (
              <div className="pt-1 space-y-2">
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setMemberType('MEMBER')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      memberType === 'MEMBER'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>👤 Member (Langganan)</span>
                    {memberType === 'MEMBER' && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setMemberType('INSIDENTIL')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      memberType === 'INSIDENTIL'
                        ? 'bg-[#b92b10] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>⚡ Insidentil (Biasa)</span>
                    {memberType === 'INSIDENTIL' && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                </div>

                {/* Khusus Member: Pilihan Hari & Ringkasan Jadwal Pertemuan */}
                {memberType === 'MEMBER' && (
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-blue-900">
                        Pilih Hari Rutin Mingguan:
                      </label>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        Setiap {DAY_NAMES[selectedMemberDayIndex]}
                      </span>
                    </div>

                    {/* Selector Hari 7 Hari */}
                    <div className="grid grid-cols-7 gap-1">
                      {DAY_NAMES.map((name, idx) => {
                        const isSelected = selectedMemberDayIndex === idx;
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => handleSelectMemberDay(idx)}
                            className={`py-1.5 text-center text-[10px] font-bold rounded-lg transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-100/50'
                            }`}
                          >
                            {name.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>

                    {/* Pemilih Bulan Paket Member */}
                    <div className="space-y-1.5 pt-1 border-t border-blue-200/60">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-blue-900">
                          Bulan Paket Main:
                        </label>
                        <span className="text-[10px] font-bold text-blue-800 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                          {memberSchedule.monthName} {memberSchedule.year}
                        </span>
                      </div>

                      {/* Tombol Pilihan Bulan */}
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { y: 2026, m: 6, label: 'Juli' },
                          { y: 2026, m: 7, label: 'Agustus' },
                          { y: 2026, m: 8, label: 'September' },
                          { y: 2026, m: 9, label: 'Oktober' },
                        ].map((b) => {
                          const isCurrent = memberSchedule.monthIndex === b.m && memberSchedule.year === b.y;
                          return (
                            <button
                              key={`${b.y}-${b.m}`}
                              type="button"
                              onClick={() => handleChangeMonth(b.y, b.m)}
                              className={`py-1 text-center text-[10px] font-bold rounded-lg transition-all cursor-pointer border ${
                                isCurrent
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs scale-102'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-100/50'
                              }`}
                            >
                              {b.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Tombol Pintas jika Jadwal masih di bulan Juli padahal Pelunasan di bulan September */}
                      {settlementPaidDate && new Date(settlementPaidDate).getMonth() !== memberSchedule.monthIndex && (
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date(settlementPaidDate);
                            handleChangeMonth(d.getFullYear(), d.getMonth());
                          }}
                          className="w-full mt-1 py-1.5 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300 flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs text-center"
                        >
                          <span>⚡ Jadwal masih {memberSchedule.monthName}! Klik untuk sinkron ke bulan September 2026</span>
                        </button>
                      )}
                    </div>

                    {/* Ringkasan Otomatis Jadwal Pertemuan */}
                    <div className="bg-white/90 p-2.5 rounded-xl border border-blue-100 text-[10px] text-blue-950 space-y-1">
                      <div className="font-bold text-blue-900 flex items-center justify-between">
                        <span>📅 Paket {memberSchedule.sessionCount}x Pertemuan</span>
                        <span className="text-slate-500 font-normal">{memberSchedule.monthName} {memberSchedule.year}</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed font-medium">
                        <span className="font-bold text-blue-800">Tanggal:</span> {memberSchedule.formattedDatesList}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tanggal Booking & Tanggal Main */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="font-bold text-slate-800 flex items-center gap-1">
                <span>Tanggal Booking / DP</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-[#b92b10] absolute left-3 top-2.5" />
                <input
                  type="date"
                  required
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-[#b92b10] cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span>Tanggal Main</span>
                  <span className="text-red-500">*</span>
                </span>
                {memberType === 'MEMBER' && (
                  <span className="text-[10px] text-blue-600 font-semibold">
                    (Pertemuan ke-1)
                  </span>
                )}
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-[#b92b10] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Jam Mulai & Jam Selesai */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="font-bold text-slate-800 flex items-center gap-1">
                <span>Jam Mulai</span>
                <span className="text-red-500">*</span>
              </label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-[#b92b10] cursor-pointer"
              >
                {TIME_OPTIONS.slice(0, -1).map((t) => (
                  <option key={t} value={t}>{t} WIB</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-800 flex items-center gap-1">
                <span>Jam Selesai</span>
                <span className="text-red-500">*</span>
              </label>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-[#b92b10] cursor-pointer"
              >
                {TIME_OPTIONS.slice(1).map((t) => (
                  <option key={t} value={t}>{t} WIB</option>
                ))}
              </select>
            </div>
          </div>

          {/* Court Selection */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800">
                Pilih Lapangan ({selectedCourtIds.length} dipilih, max {maxCourts}):
              </label>
              <span className="text-[11px] text-slate-500 font-semibold">
                Durasi: {calculatedDuration} Jam
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {availableCourts.map((court) => {
                const isChecked = selectedCourtIds.includes(court.id);
                return (
                  <button
                    key={court.id}
                    type="button"
                    onClick={() => handleToggleCourt(court.id)}
                    className={`p-2.5 rounded-xl border text-left font-bold flex items-center justify-between transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-red-50/60 border-[#b92b10] text-[#b92b10]'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>{court.name.split(' ')[0]} {court.name.split(' ')[1]}</span>
                    {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status & Payment Method */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-800 flex items-center justify-between">
                <span>Total Biaya Sewa (Rp) *</span>
                <span className="text-[11px] text-slate-400 font-normal">Ketik manual</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={totalSewa ? formatNumber(totalSewa) : ''}
                  onChange={(e) => setTotalSewa(parseNumberInput(e.target.value))}
                  placeholder="Contoh: 160.000"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-[#b92b10]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
              <div className="space-y-1">
                <label className="font-bold text-slate-800">Status Transaksi</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as BookingStatus)}
                  className="w-full py-2 px-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-[#b92b10] cursor-pointer"
                >
                  <option value="DP_PAID">DP Terbayar (Belum Lunas)</option>
                  <option value="SETTLED">Lunas (Selesai 100%)</option>
                  <option value="CANCELLED">Dibatalkan (Void)</option>
                </select>
              </div>

              {status === 'DP_PAID' && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 flex items-center justify-between">
                    <span>Nominal DP (Rp)</span>
                    <button
                      type="button"
                      onClick={() => setDpAmount(Math.round(totalSewa * 0.5))}
                      className="text-[10px] text-[#b92b10] hover:underline"
                    >
                      50%
                    </button>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={dpAmount ? formatNumber(dpAmount) : ''}
                    onChange={(e) => setDpAmount(parseNumberInput(e.target.value))}
                    placeholder="Contoh: 80.000"
                    className="w-full py-2 px-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-[#b92b10]"
                  />
                </div>
              )}
            </div>

            {/* Payment Method Option */}
            <div className="space-y-1 pt-1">
              <label className="font-bold text-slate-800">Metode Pembayaran</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'CASH', label: 'Tunai (Cash)', icon: Banknote },
                  { id: 'QRIS', label: 'QRIS', icon: QrCode },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = dpPaymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setDpPaymentMethod(m.id as PaymentMethod)}
                      className={`py-2 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#b92b10] text-white border-[#b92b10] shadow-2xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {status === 'DP_PAID' && (
              <div className="flex items-center justify-between text-[11px] pt-1 text-amber-700 font-bold">
                <span>Sisa Pelunasan:</span>
                <span>{formatRupiah(remainingBalance)}</span>
              </div>
            )}

            {status === 'SETTLED' && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                <label className="font-bold text-emerald-950 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Tanggal Pelunasan</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Lunas
                  </span>
                </label>
                <input
                  type="date"
                  value={settlementPaidDate}
                  onChange={(e) => setSettlementPaidDate(e.target.value)}
                  className="w-full py-2 px-2.5 bg-white border border-emerald-200 rounded-xl text-slate-900 font-bold text-xs focus:outline-none focus:border-emerald-700 cursor-pointer"
                />
                <p className="text-[10px] text-emerald-700 font-medium">
                  Tanggal pelunasan ini akan tercatat pada laporan kasir & omset harian.
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800">Catatan Tambahan (Opsional)</label>
              {memberType === 'MEMBER' && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {settlementPaidDate && new Date(settlementPaidDate).getMonth() !== memberSchedule.monthIndex && (
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(settlementPaidDate);
                        handleChangeMonth(d.getFullYear(), d.getMonth());
                      }}
                      className="text-[10px] text-amber-800 hover:text-amber-950 font-bold hover:underline cursor-pointer flex items-center gap-1 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300"
                    >
                      <span>⚡ Ubah ke September (Pelunasan)</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setNotes(`Paket Member ${memberSchedule.monthName} ${memberSchedule.year}: ${memberSchedule.sessionCount}x Pertemuan (Setiap ${memberSchedule.dayName}: ${memberSchedule.formattedDatesList})`)}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>🔄 Sinkronkan ke Jadwal {memberSchedule.monthName}</span>
                  </button>
                </div>
              )}
            </div>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Misal: Raket sewa, DP via transfer, etc..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#b92b10] focus:bg-white"
            />
            {memberType === 'MEMBER' && (
              <p className="text-[10px] text-slate-500">
                Catatan ini dicetak pada struk member. Bila tanggal atau hari main diubah, klik tombol sinkronkan di atas untuk memperbarui catatan otomatis ke bulan yang sesuai.
              </p>
            )}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 transition-colors cursor-pointer text-xs"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-2xl bg-[#b92b10] hover:bg-[#a0240d] text-white font-bold transition-colors cursor-pointer flex items-center gap-2 shadow-xs text-xs disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
