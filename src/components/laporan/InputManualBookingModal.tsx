'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Save, 
  Banknote, 
  QrCode, 
  CreditCard,
  CalendarCheck,
  CheckCircle2
} from 'lucide-react';
import { useCourtBookingStore } from '@/lib/store/useCourtBookingStore';
import { useCourtPricingStore } from '@/lib/store/useCourtPricingStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { formatRupiah, formatNumber, parseNumberInput } from '@/lib/utils';
import { PaymentMethod } from '@/types/pos';

interface InputManualBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const InputManualBookingModal: React.FC<InputManualBookingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { courts, loadCourts, addBooking } = useCourtBookingStore();
  const { calculateBookingFee, loadFromDb } = useCourtPricingStore();
  const { showToast } = useToastStore();

  const yesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const [selectedSport, setSelectedSport] = useState<'Badminton' | 'Pickleball'>('Badminton');
  const [memberType, setMemberType] = useState<'INSIDENTIL' | 'MEMBER'>('INSIDENTIL');
  const [date, setDate] = useState(yesterdayStr());
  const [bookingDate, setBookingDate] = useState(yesterdayStr());
  const [courtId, setCourtId] = useState('');
  const [startTime, setStartTime] = useState('19:00');
  const [durationHours, setDurationHours] = useState(2);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'SETTLED' | 'DP_PAID'>('SETTLED');
  const [totalAmount, setTotalAmount] = useState<string>('160000');
  const [dpAmount, setDpAmount] = useState<string>('50000');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashierName, setCashierName] = useState('Kasir');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('kasir_session');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          if (parsed.name) setCashierName(parsed.name);
        } catch {}
      }
    }
  }, []);

  useEffect(() => {
    loadFromDb();
    if (courts.length === 0) {
      loadCourts();
    } else if (!courtId && courts.length > 0) {
      setCourtId(courts[0].id);
    }
  }, [courts, courtId, loadCourts, loadFromDb]);

  useEffect(() => {
    if (isOpen) {
      const y = yesterdayStr();
      setDate(y);
      setBookingDate(y);
      setIsSubmitting(false);
      if (courts.length > 0 && !courtId) {
        setCourtId(courts[0].id);
      }
      if (typeof window !== 'undefined') {
        const session = localStorage.getItem('kasir_session');
        if (session) {
          try {
            const parsed = JSON.parse(session);
            if (parsed.name) setCashierName(parsed.name);
          } catch {}
        }
      }
    }
  }, [isOpen, courts, courtId]);

  const handleSelectSport = (sport: 'Badminton' | 'Pickleball') => {
    setSelectedSport(sport);
    if (sport === 'Pickleball') {
      setMemberType('INSIDENTIL');
      const pbCourt = courts.find((c, idx) => idx < 2 || c.name.includes('1') || c.name.includes('2'));
      if (pbCourt) setCourtId(pbCourt.id);
    }
  };

  const availableCourts = selectedSport === 'Pickleball'
    ? courts.filter((c, idx) => idx < 2 || c.name.includes('1') || c.name.includes('2') || c.name.toLowerCase().includes('pickleball'))
    : courts;

  // Recalculate default fee when court, duration, sport, or time changes
  const selectedCourt = courts.find((c) => c.id === courtId) || availableCourts[0] || courts[0];

  useEffect(() => {
    if (selectedCourt) {
      const fee = calculateBookingFee(
        selectedCourt.id,
        date,
        startTime,
        durationHours,
        1,
        selectedCourt.pricePerHour || 80000,
        selectedSport === 'Pickleball' ? 'insidentil' : (memberType === 'MEMBER' ? 'member' : 'insidentil'),
        selectedSport === 'Pickleball' ? 'pickleball' : 'badminton'
      );
      setTotalAmount(fee.toString());
    }
  }, [selectedCourt, date, startTime, durationHours, selectedSport, memberType, calculateBookingFee]);

  if (!isOpen) return null;

  // Compute end time
  const startHour = parseInt(startTime.split(':')[0]) || 19;
  const startMinute = startTime.split(':')[1] || '00';
  const endHour = (startHour + durationHours) % 24;
  const endTime = `${String(endHour).padStart(2, '0')}:${startMinute}`;

  const numTotal = Number(totalAmount) || 0;
  const numDp = Number(dpAmount) || 0;
  const isLunas = paymentStatus === 'SETTLED';
  const finalAmountPaid = isLunas ? numTotal : numDp;
  const remainingBalance = isLunas ? 0 : Math.max(0, numTotal - numDp);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      showToast('Silakan masukkan nama penyewa / pemesan');
      return;
    }

    if (numTotal <= 0) {
      showToast('Total tarif sewa harus lebih dari Rp 0');
      return;
    }

    setIsSubmitting(true);

    try {
      const courtName = selectedCourt?.name || 'Lapangan 1';
      const courtType = selectedCourt?.type || 'Karpet';
      const isPb = selectedSport === 'Pickleball';
      const finalCommunityName = isPb
        ? 'Pickleball (Insidentil)'
        : (memberType === 'MEMBER' ? 'Badminton (Member)' : 'Badminton (Insidentil)');

      await addBooking({
        customerName: customerName.trim(),
        phone: phone.trim() || '08xxxxxxxxxx',
        communityName: finalCommunityName,
        memberType: isPb ? 'INSIDENTIL' : memberType,
        bookingDate,
        date,
        courtId: selectedCourt?.id || courtId || '',
        courtName,
        courtType,
        courtPricePerHour: Math.round(numTotal / (durationHours || 1)),
        startTime,
        endTime,
        durationHours,
        courtFee: numTotal,
        totalAmount: numTotal,
        dpAmount: finalAmountPaid,
        dpPaymentMethod: paymentMethod,
        dpPaidAt: `${bookingDate}T${startTime}:00.000Z`,
        dpCashier: cashierName.trim() || 'Owner',
        settlementAmount: isLunas ? numTotal : undefined,
        settlementPaymentMethod: isLunas ? paymentMethod : undefined,
        settlementPaidAt: isLunas ? `${date}T${startTime}:00.000Z` : undefined,
        settlementCashier: isLunas ? (cashierName.trim() || 'Owner') : undefined,
        amountPaidTotal: finalAmountPaid,
        remainingBalance,
        status: isLunas ? 'SETTLED' : 'DP_PAID',
        notes: `[Input Manual Owner] ${selectedSport} - Main: ${date} (${startTime}-${endTime})`,
      });

      showToast(`Data sewa lapangan tanggal ${date} berhasil dicatat ke laporan!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Gagal mencatat sewa lapangan manual:', err);
      showToast('Gagal menyimpan data sewa lapangan. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md shadow-emerald-600/20">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wide">
                  Input Manual / Kemarin
                </span>
              </div>
              <h3 className="font-black text-base text-slate-900 leading-tight mt-0.5">
                Input Sewa Lapangan Kemarin / Manual
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          
          {/* Pilihan Cabang Olahraga: Badminton vs Pickleball */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 text-xs block">
              Cabang Olahraga
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => handleSelectSport('Badminton')}
                className={`py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  selectedSport === 'Badminton'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🏸 Badminton</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectSport('Pickleball')}
                className={`py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  selectedSport === 'Pickleball'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🏓 Pickleball</span>
              </button>
            </div>
          </div>

          {/* Kategori Khusus Badminton (Member vs Insidentil) */}
          {selectedSport === 'Badminton' ? (
            <div className="p-3 bg-blue-50/80 border border-blue-200/90 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-950 text-xs">
                  Kategori Sewa Badminton:
                </span>
                <span className="text-[10px] font-bold text-blue-700">
                  {memberType === 'MEMBER' ? 'Tarif Khusus Member' : 'Tarif Insidentil'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMemberType('MEMBER')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    memberType === 'MEMBER'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white border border-blue-200 text-blue-900 hover:bg-blue-50'
                  }`}
                >
                  <span>👤 Member (Paket Rutin)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMemberType('INSIDENTIL')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    memberType === 'INSIDENTIL'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>⚡ Insidentil (Sekali Main)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex items-center gap-2.5 text-amber-900">
              <span className="text-base">🏓</span>
              <div className="text-[11px] leading-tight">
                <strong className="block text-amber-950 font-bold">Pickleball — Insidentil (Sekali Main)</strong>
                <span className="text-amber-700">Khusus Lapangan 1 & 2 dengan tarif khusus Pickleball (tidak ada sistem member).</span>
              </div>
            </div>
          )}

          {/* Tanggal Booking vs Tanggal Main */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <span className="font-bold text-slate-800 text-xs block">
              1. Jadwal & Waktu Sewa
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">
                  Tanggal Booking / Pesan *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-emerald-600 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">
                  Tanggal Main Lapangan *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-emerald-600 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Jam & Lapangan */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="space-y-1 sm:col-span-1">
                <label className="text-[11px] font-semibold text-slate-600">
                  Lapangan
                </label>
                <select
                  value={courtId}
                  onChange={(e) => setCourtId(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {availableCourts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {selectedSport === 'Pickleball' ? '(Pickleball Line)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 sm:col-span-1">
                <label className="text-[11px] font-semibold text-slate-600">
                  Jam Mulai
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1 sm:col-span-1">
                <label className="text-[11px] font-semibold text-slate-600">
                  Durasi Sewa
                </label>
                <select
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value={1}>1 Jam</option>
                  <option value={2}>2 Jam</option>
                  <option value={3}>3 Jam</option>
                  <option value={4}>4 Jam</option>
                </select>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 font-medium">
              Jadwal main: <strong>{startTime} - {endTime} ({durationHours} Jam)</strong>
            </p>
          </div>

          {/* Informasi Penyewa */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <span className="font-bold text-slate-800 text-xs block">
              2. Data Penyewa
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">
                  Nama Penyewa / Tim *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Contoh: PB Rajawali / Bpk. Rudi"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">
                  No. WhatsApp (Opsional)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812xxxxxxxx"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Biaya & Pembayaran */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
            <span className="font-bold text-slate-800 text-xs block">
              3. Tarif & Status Pembayaran
            </span>

            <div className="grid grid-cols-2 gap-2 p-1 bg-white rounded-xl border border-emerald-200">
              <button
                type="button"
                onClick={() => setPaymentStatus('SETTLED')}
                className={`py-2 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  isLunas
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ✓ Lunas Langsung
              </button>

              <button
                type="button"
                onClick={() => setPaymentStatus('DP_PAID')}
                className={`py-2 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  !isLunas
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ⏱ Masih DP
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700">
                  Total Tarif Sewa (Rp) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={totalAmount ? formatNumber(totalAmount) : ''}
                  onChange={(e) => setTotalAmount(parseNumberInput(e.target.value).toString())}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-black text-slate-900 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {!isLunas && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">
                    Nominal DP Diterima (Rp)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={dpAmount ? formatNumber(dpAmount) : ''}
                    onChange={(e) => setDpAmount(parseNumberInput(e.target.value).toString())}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-emerald-700 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>

            {/* Metode Bayar & Petugas */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700">
                  Metode Bayar
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="CASH">Tunai (Cash)</option>
                  <option value="QRIS">QRIS</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700">
                  Nama Petugas
                </label>
                <input
                  type="text"
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Summary Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between shadow-md">
            <div>
              <span className="text-[11px] text-emerald-200 block font-medium">TOTAL PENDAPATAN MASUK</span>
              <span className="text-xs font-bold text-white">
                {isLunas ? 'LUNAS (100%)' : `DP Masuk (Sisa Rp ${remainingBalance.toLocaleString('id-ID')})`}
              </span>
            </div>
            <div className="text-xl font-black text-emerald-100">
              {formatRupiah(finalAmountPaid)}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Sewa ke Laporan'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
