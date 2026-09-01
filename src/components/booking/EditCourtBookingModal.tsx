'use client';

import React, { useState, useEffect } from 'react';
import { CourtBooking, PaymentMethod, BookingStatus } from '@/types/booking';
import { useCourtBookingStore } from '@/lib/store/useCourtBookingStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { formatRupiah, formatNumber, parseNumberInput } from '@/lib/utils';
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
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('21:00');
  const [courtCount, setCourtCount] = useState(1);
  const [selectedCourtIds, setSelectedCourtIds] = useState<string[]>([]);
  const [totalSewa, setTotalSewa] = useState<number>(0);
  const [dpAmount, setDpAmount] = useState<number>(0);
  const [dpPaymentMethod, setDpPaymentMethod] = useState<PaymentMethod>('QRIS');
  const [settlementPaymentMethod, setSettlementPaymentMethod] = useState<PaymentMethod>('QRIS');
  const [status, setStatus] = useState<BookingStatus>('DP_PAID');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (booking) {
      setCustomerName(booking.customerName || '');
      setPhone(booking.phone || '');
      const isPickleball = booking.communityName?.includes('Pickleball') || booking.courtName.toLowerCase().includes('pickleball');
      const sport = isPickleball ? 'Pickleball' : 'Badminton';
      setSelectedSport(sport);
      const isMem = booking.memberType === 'MEMBER' || booking.communityName?.toLowerCase().includes('member');
      setMemberType(sport === 'Badminton' && isMem ? 'MEMBER' : 'INSIDENTIL');
      setDate(booking.date || '');
      setStartTime(booking.startTime || '19:00');
      setEndTime(booking.endTime || '21:00');
      setTotalSewa(booking.totalAmount || booking.courtFee || 160000);
      setDpAmount(booking.dpAmount || 0);
      setDpPaymentMethod(booking.dpPaymentMethod || 'QRIS');
      setSettlementPaymentMethod(booking.settlementPaymentMethod || 'QRIS');
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

      const updated = await updateBooking(booking.id, {
        customerName: customerName.trim(),
        phone: phone.trim() || '0812-0000-0000',
        communityName: selectedSport === 'Badminton'
          ? (memberType === 'MEMBER' ? 'Badminton (Member)' : 'Badminton (Insidentil)')
          : 'Pickleball (Insidentil)',
        memberType: selectedSport === 'Badminton' ? memberType : 'INSIDENTIL',
        date,
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
        settlementPaymentMethod: status === 'SETTLED' ? settlementPaymentMethod : undefined,
        amountPaidTotal: finalAmountPaid,
        remainingBalance: finalRemaining,
        status: status,
        notes: notes.trim() || undefined,
      });

      showToast('Data booking berhasil diperbarui!');
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
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <span>Edit Transaksi Booking</span>
              <span className="font-mono text-xs text-slate-500 font-medium">({booking.bookingCode})</span>
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
              <div className="pt-1">
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
              </div>
            )}
          </div>

          {/* Date, Start Time & End Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <label className="font-bold text-slate-800 flex items-center gap-1">
                <span>Tanggal</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-[#b92b10] cursor-pointer"
                />
              </div>
            </div>

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
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800">Catatan Tambahan (Opsional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Misal: Raket sewa, DP via transfer, etc..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#b92b10] focus:bg-white"
            />
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
