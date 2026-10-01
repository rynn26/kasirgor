'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  Users, 
  Calendar, 
  Sun, 
  Moon, 
  Check, 
  CheckCircle2, 
  QrCode, 
  Banknote, 
  History, 
  Sparkles,
  UserCheck,
  User
} from 'lucide-react';
import { useShiftStore } from '@/lib/store/useShiftStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { createAcademyTransaction } from '@/lib/db/academy';
import { AcademyTransaction, AcademyProgram, AcademyCategory, AcademyPackage, AcademySessionTime } from '@/types/academy';
import { AcademyReceiptModal } from '@/components/academy/AcademyReceiptModal';
import { formatRupiah } from '@/lib/utils';
import { getJakartaToday } from '@/lib/bookingUtils';

export default function AcademyBookingPage() {
  const router = useRouter();
  const { cashierName, selectedShift } = useShiftStore();
  const { showToast } = useToastStore();

  const todayJakarta = getJakartaToday();

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [program, setProgram] = useState<AcademyProgram>('BADMINTON');

  // Badminton fields
  const [category, setCategory] = useState<AcademyCategory>('ANAK');
  const [pack, setPack] = useState<AcademyPackage>('4X');
  
  // Month selector (Default to current month & year in Indonesian)
  const currentMonthLabel = useMemo(() => {
    const d = new Date();
    return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(d);
  }, []);
  const [trainingMonth, setTrainingMonth] = useState(currentMonthLabel);

  // Pickleball fields
  const [sessionTime, setSessionTime] = useState<AcademySessionTime>('PAGI_SIANG');
  const [periodStart, setPeriodStart] = useState(todayJakarta);
  const [periodEnd, setPeriodEnd] = useState(todayJakarta);
  const [customPickleballFee, setCustomPickleballFee] = useState<number>(0);

  // Financials & Payment
  const [dpAmount, setDpAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'QRIS' | 'CASH'>('QRIS');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receipt Modal State
  const [savedTransaction, setSavedTransaction] = useState<AcademyTransaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Dynamic fee calculation for Badminton
  const feeAmount = useMemo(() => {
    if (program === 'BADMINTON') {
      if (category === 'ANAK') {
        return pack === '4X' ? 200000 : 250000;
      } else {
        // DEWASA
        return pack === '4X' ? 250000 : 300000;
      }
    } else {
      // PICKLEBALL
      return customPickleballFee || 0;
    }
  }, [program, category, pack, customPickleballFee]);

  // Remaining balance
  const remainingAmount = useMemo(() => {
    const rem = feeAmount - dpAmount;
    return rem > 0 ? rem : 0;
  }, [feeAmount, dpAmount]);

  // DP quick chips
  const handleQuickDp = (type: 'DP0' | 'DP50' | 'LUNAS') => {
    if (type === 'DP0') {
      setDpAmount(0);
    } else if (type === 'DP50') {
      setDpAmount(Math.round(feeAmount * 0.5));
    } else if (type === 'LUNAS') {
      setDpAmount(feeAmount);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      showToast('Mohon masukkan nama peserta!');
      return;
    }

    if (feeAmount <= 0) {
      showToast('Mohon isi tarif pelatihan yang valid!');
      return;
    }

    setIsSubmitting(true);
    try {
      const activeCashier = cashierName || 'Yuli';
      const activeShift = selectedShift?.name || (activeCashier.toLowerCase() === 'asfia' ? 'Shift Sore - Malam' : 'Shift Pagi - Siang');

      const created = await createAcademyTransaction({
        customerName: customerName.trim(),
        program,
        category: program === 'BADMINTON' ? category : undefined,
        package: program === 'BADMINTON' ? pack : undefined,
        trainingMonth: program === 'BADMINTON' ? trainingMonth : undefined,
        sessionTime: program === 'PICKLEBALL' ? sessionTime : undefined,
        periodStart: program === 'PICKLEBALL' ? periodStart : undefined,
        periodEnd: program === 'PICKLEBALL' ? periodEnd : undefined,
        feeAmount,
        dpAmount,
        remainingAmount,
        paymentMethod,
        status: remainingAmount === 0 ? 'LUNAS' : 'DP_PAID',
        cashierName: activeCashier,
        shift: activeShift,
      });

      showToast('Pembayaran Sinyo Academy berhasil disimpan!');
      setSavedTransaction(created);
      setIsReceiptOpen(true);
    } catch (err) {
      console.error('Error saving academy transaction:', err);
      showToast('Gagal menyimpan transaksi. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setCustomerName('');
    setDpAmount(0);
    setCustomPickleballFee(0);
    setIsReceiptOpen(false);
  };

  const handleBack = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('from') === 'laporan' || document.referrer.includes('/laporan')) {
        router.push('/laporan?unit=academy');
        return;
      }
      if (window.history.length > 1) {
        router.back();
        return;
      }
    }
    router.push('/booking');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-3.5 sm:p-5 lg:p-6 pb-24 max-w-xl mx-auto space-y-4">
      
      {/* Top Bar Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 text-slate-700 hover:text-slate-900 font-bold text-base transition-colors cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
            <ChevronLeft className="w-5 h-5" />
          </div>
          <span>Pembayaran Sinyo Academy</span>
        </button>

        <Link
          href="/booking/academy/history"
          className="px-3 py-1.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
        >
          <History className="w-3.5 h-3.5" />
          <span>Riwayat Nota</span>
        </Link>
      </div>

      {/* Main Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
        
        {/* Banner Card */}
        <div className={`p-4 rounded-2xl flex items-center gap-3.5 border transition-all ${
          program === 'BADMINTON' 
            ? 'bg-purple-50/70 border-purple-100' 
            : 'bg-emerald-50/70 border-emerald-100'
        }`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md ${
            program === 'BADMINTON' 
              ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-purple-600/20' 
              : 'bg-gradient-to-tr from-emerald-600 to-teal-600 shadow-emerald-600/20'
          }`}>
            <Users className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h2 className={`font-black text-sm tracking-wide ${
              program === 'BADMINTON' ? 'text-purple-700' : 'text-emerald-800'
            }`}>
              SINYO ACADEMY
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {program === 'BADMINTON' 
                ? 'Pembayaran pelatihan bulutangkis atau pickleball' 
                : 'Pembayaran pelatihan pickleball'}
            </p>
          </div>
        </div>

        {/* Input Nama Peserta */}
        <div className="space-y-1.5">
          <label className="block text-xs font-black text-slate-800">
            Nama <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Masukkan nama"
            className="w-full px-4 py-3 rounded-2xl bg-slate-50/80 border border-slate-200 text-sm text-slate-800 font-medium placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Program Academy Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-black text-slate-800">
            Program Academy <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* Badminton */}
            <button
              type="button"
              onClick={() => {
                setProgram('BADMINTON');
              }}
              className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                program === 'BADMINTON'
                  ? 'bg-[#c5221f] text-white border-[#c5221f] shadow-md shadow-red-600/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🏸</span>
                <span className="text-xs font-black leading-tight">
                  Sinyo Badminton Academy
                </span>
              </div>
              {program === 'BADMINTON' && (
                <Check className="w-4 h-4 stroke-[3] text-white shrink-0 ml-1" />
              )}
            </button>

            {/* Pickleball */}
            <button
              type="button"
              onClick={() => {
                setProgram('PICKLEBALL');
              }}
              className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                program === 'PICKLEBALL'
                  ? 'bg-[#15803d] text-white border-[#15803d] shadow-md shadow-emerald-700/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🏓</span>
                <span className="text-xs font-black leading-tight">
                  Sinyo Pickleball Academy
                </span>
              </div>
              {program === 'PICKLEBALL' && (
                <Check className="w-4 h-4 stroke-[3] text-white shrink-0 ml-1" />
              )}
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CONDITIONAL: BADMINTON FIELDS */}
        {/* ============================================================ */}
        {program === 'BADMINTON' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Kategori Peserta (Anak vs Dewasa) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-800">
                Kategori Peserta <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Anak */}
                <button
                  type="button"
                  onClick={() => setCategory('ANAK')}
                  className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    category === 'ANAK'
                      ? 'bg-[#c5221f] text-white border-[#c5221f] shadow-md shadow-red-600/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      category === 'ANAK' ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-600'
                    }`}>
                      👶
                    </div>
                    <div>
                      <div className="text-xs font-black leading-tight">Anak</div>
                      <div className={`text-[10px] ${category === 'ANAK' ? 'text-white/80' : 'text-slate-400'}`}>
                        Usia 6 - 13 tahun
                      </div>
                    </div>
                  </div>
                  {category === 'ANAK' && (
                    <Check className="w-4 h-4 stroke-[3] text-white shrink-0" />
                  )}
                </button>

                {/* Dewasa */}
                <button
                  type="button"
                  onClick={() => setCategory('DEWASA')}
                  className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    category === 'DEWASA'
                      ? 'bg-[#c5221f] text-white border-[#c5221f] shadow-md shadow-red-600/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      category === 'DEWASA' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'
                    }`}>
                      🧑
                    </div>
                    <div>
                      <div className="text-xs font-black leading-tight">Dewasa</div>
                      <div className={`text-[10px] ${category === 'DEWASA' ? 'text-white/80' : 'text-slate-400'}`}>
                        Usia 14 tahun+
                      </div>
                    </div>
                  </div>
                  {category === 'DEWASA' && (
                    <Check className="w-4 h-4 stroke-[3] text-white shrink-0" />
                  )}
                </button>
              </div>
            </div>

            {/* Paket Pelatihan (4x vs 5x Pertemuan) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-800">
                Paket Pelatihan <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* 4x Pertemuan */}
                <button
                  type="button"
                  onClick={() => setPack('4X')}
                  className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    pack === '4X'
                      ? 'bg-[#c5221f] text-white border-[#c5221f] shadow-md shadow-red-600/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="text-xs font-black">4x Pertemuan</div>
                    <div className={`text-[11px] font-bold ${pack === '4X' ? 'text-white/90' : 'text-slate-500'}`}>
                      {category === 'ANAK' ? 'Rp 200.000 / bulan' : 'Rp 250.000 / bulan'}
                    </div>
                  </div>
                  {pack === '4X' && (
                    <Check className="w-4 h-4 stroke-[3] text-white shrink-0 ml-1" />
                  )}
                </button>

                {/* 5x Pertemuan */}
                <button
                  type="button"
                  onClick={() => setPack('5X')}
                  className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    pack === '5X'
                      ? 'bg-[#c5221f] text-white border-[#c5221f] shadow-md shadow-red-600/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="text-xs font-black">5x Pertemuan</div>
                    <div className={`text-[11px] font-bold ${pack === '5X' ? 'text-white/90' : 'text-slate-500'}`}>
                      {category === 'ANAK' ? 'Rp 250.000 / bulan' : 'Rp 300.000 / bulan'}
                    </div>
                  </div>
                  {pack === '5X' && (
                    <Check className="w-4 h-4 stroke-[3] text-white shrink-0 ml-1" />
                  )}
                </button>
              </div>
            </div>

            {/* Bulan Latihan */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-800">
                Bulan Latihan <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={trainingMonth}
                  onChange={(e) => setTrainingMonth(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50/80 border border-slate-200 text-sm text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="Misal: September 2026"
                />
                <Calendar className="w-4 h-4 text-rose-500 absolute left-4 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* CONDITIONAL: PICKLEBALL FIELDS */}
        {/* ============================================================ */}
        {program === 'PICKLEBALL' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Waktu Latihan */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-800">
                Waktu Latihan <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Pagi - Siang */}
                <button
                  type="button"
                  onClick={() => setSessionTime('PAGI_SIANG')}
                  className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    sessionTime === 'PAGI_SIANG'
                      ? 'bg-[#15803d] text-white border-[#15803d] shadow-md shadow-emerald-700/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sun className={`w-5 h-5 ${sessionTime === 'PAGI_SIANG' ? 'text-amber-300' : 'text-amber-500'}`} />
                    <div>
                      <div className="text-xs font-black">Pagi - Siang</div>
                      <div className={`text-[10px] ${sessionTime === 'PAGI_SIANG' ? 'text-white/80' : 'text-slate-400'}`}>
                        08.00 - 17.00
                      </div>
                    </div>
                  </div>
                  {sessionTime === 'PAGI_SIANG' && (
                    <Check className="w-4 h-4 stroke-[3] text-white shrink-0" />
                  )}
                </button>

                {/* Sore - Malam */}
                <button
                  type="button"
                  onClick={() => setSessionTime('SORE_MALAM')}
                  className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    sessionTime === 'SORE_MALAM'
                      ? 'bg-[#15803d] text-white border-[#15803d] shadow-md shadow-emerald-700/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Moon className={`w-5 h-5 ${sessionTime === 'SORE_MALAM' ? 'text-indigo-200' : 'text-indigo-500'}`} />
                    <div>
                      <div className="text-xs font-black">Sore - Malam</div>
                      <div className={`text-[10px] ${sessionTime === 'SORE_MALAM' ? 'text-white/80' : 'text-slate-400'}`}>
                        17.00 - 23.00
                      </div>
                    </div>
                  </div>
                  {sessionTime === 'SORE_MALAM' && (
                    <Check className="w-4 h-4 stroke-[3] text-white shrink-0" />
                  )}
                </button>
              </div>
            </div>

            {/* Periode Latihan (Tanggal Mulai - Tanggal Selesai) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-800">
                Periode Latihan <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 items-center">
                <div className="relative">
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200 text-xs text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200 text-xs text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tarif Pelatihan (Rp) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-black text-slate-800">
              Tarif Pelatihan (Rp)
            </label>
            <span className="text-[11px] text-slate-400 font-medium">
              {program === 'BADMINTON'
                ? `Harga untuk kategori ${category === 'ANAK' ? 'Anak' : 'Dewasa'}`
                : 'Isi sesuai ketentuan'}
            </span>
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
              Rp
            </span>
            {program === 'BADMINTON' ? (
              <input
                type="text"
                readOnly
                value={feeAmount ? feeAmount.toLocaleString('id-ID') : '0'}
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-100/80 border border-slate-200 text-sm text-slate-900 font-bold cursor-not-allowed select-none"
              />
            ) : (
              <input
                type="text"
                inputMode="numeric"
                value={customPickleballFee ? customPickleballFee.toLocaleString('id-ID') : ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  setCustomPickleballFee(raw ? parseInt(raw, 10) : 0);
                }}
                placeholder="Masukkan nominal"
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50/80 border border-slate-200 text-sm text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            )}
          </div>
        </div>

        {/* Nominal DP (Rp) + Quick Chips */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-black text-slate-800">
              Nominal DP (Rp) <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickDp('DP0')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wide transition-colors ${
                  dpAmount === 0 
                    ? 'bg-amber-200 text-amber-900 font-extrabold' 
                    : 'bg-amber-100/70 hover:bg-amber-100 text-amber-800'
                }`}
              >
                DP 0
              </button>
              <button
                type="button"
                onClick={() => handleQuickDp('DP50')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wide transition-colors ${
                  dpAmount > 0 && dpAmount === Math.round(feeAmount * 0.5)
                    ? 'bg-blue-200 text-blue-900 font-extrabold'
                    : 'bg-blue-100/70 hover:bg-blue-100 text-blue-800'
                }`}
              >
                DP 50%
              </button>
              <button
                type="button"
                onClick={() => handleQuickDp('LUNAS')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wide transition-colors ${
                  dpAmount > 0 && dpAmount === feeAmount
                    ? 'bg-emerald-200 text-emerald-900 font-extrabold'
                    : 'bg-emerald-100/70 hover:bg-emerald-100 text-emerald-800'
                }`}
              >
                Lunas 100%
              </button>
            </div>
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
              Rp
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={dpAmount ? dpAmount.toLocaleString('id-ID') : ''}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '');
                const num = raw ? parseInt(raw, 10) : 0;
                setDpAmount(Math.min(num, feeAmount));
              }}
              placeholder="Masukkan nominal DP"
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50/80 border border-slate-200 text-sm text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Sisa Pembayaran Highlight Box */}
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-between">
          <span className="text-xs font-black text-amber-900">
            Sisa Pembayaran
          </span>
          <span className="text-base sm:text-lg font-black text-[#b92b10]">
            {formatRupiah(remainingAmount)}
          </span>
        </div>

        {/* Metode Pembayaran (QRIS vs Cash) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-black text-slate-800">
            Metode Pembayaran <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* QRIS */}
            <button
              type="button"
              onClick={() => setPaymentMethod('QRIS')}
              className={`p-3 rounded-2xl border text-center flex items-center justify-center gap-2 transition-all cursor-pointer ${
                paymentMethod === 'QRIS'
                  ? 'bg-[#15803d] text-white border-[#15803d] shadow-md shadow-emerald-700/20 font-black'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 font-bold'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span className="text-xs">QRIS</span>
              {paymentMethod === 'QRIS' && (
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              )}
            </button>

            {/* Cash */}
            <button
              type="button"
              onClick={() => setPaymentMethod('CASH')}
              className={`p-3 rounded-2xl border text-center flex items-center justify-center gap-2 transition-all cursor-pointer ${
                paymentMethod === 'CASH'
                  ? 'bg-[#15803d] text-white border-[#15803d] shadow-md shadow-emerald-700/20 font-black'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 font-bold'
              }`}
            >
              <Banknote className="w-4 h-4" />
              <span className="text-xs">Cash</span>
              {paymentMethod === 'CASH' && (
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              )}
            </button>
          </div>
        </div>

        {/* Tombol Simpan Pembayaran */}
        <button
          type="submit"
          disabled={isSubmitting || !customerName.trim()}
          className="w-full py-4 rounded-2xl bg-[#c5221f] hover:bg-[#a51b18] text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/25 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        >
          <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
          <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Pembayaran'}</span>
        </button>
      </form>

      {/* Struk / Modal Nota */}
      <AcademyReceiptModal
        isOpen={isReceiptOpen}
        transaction={savedTransaction}
        onClose={handleResetForm}
      />
    </div>
  );
}
