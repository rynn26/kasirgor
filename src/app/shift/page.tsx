'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useShiftStore, SHIFT_OPTIONS, ShiftInfo, AppUnit } from '@/lib/store/useShiftStore';
import { 
  Sun, 
  Moon, 
  Play, 
  ArrowLeft, 
  User, 
  Calendar, 
  Clock, 
  Banknote,
  Store,
  CalendarCheck,
  CheckCircle2,
  Coffee
} from 'lucide-react';

export default function ShiftSelectionPage() {
  const router = useRouter();
  const { 
    selectedUnit, 
    selectedShift, 
    setUnit, 
    selectShift, 
    startShift 
  } = useShiftStore();

  const [step, setStep] = useState<'SELECT_SHIFT' | 'SELECT_UNIT' | 'START_SHIFT'>('SELECT_SHIFT');
  const [cashierName, setCashierName] = useState('Yuli');
  const [chosenShift, setChosenShift] = useState<ShiftInfo>(selectedShift || SHIFT_OPTIONS[0]);
  const [chosenUnit, setChosenUnit] = useState<AppUnit>('POS_TOKO');
  const [openingCashInput, setOpeningCashInput] = useState('500000');
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('kasir_session');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          if (parsed.name || parsed.user) {
            setCashierName(parsed.name || parsed.user);
          }
        } catch {}
      }
    }

    const now = new Date();
    setCurrentDateStr(
      new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(now)
    );
    setCurrentTimeStr(
      now.toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB'
    );
  }, []);

  // Step 1 handler
  const handleChooseShift = (shift: ShiftInfo) => {
    setChosenShift(shift);
    selectShift(shift);
    setStep('SELECT_UNIT');
  };

  // Step 2 handler
  const handleChooseUnit = (unit: AppUnit) => {
    setChosenUnit(unit);
    setUnit(unit);
    setStep('START_SHIFT');
  };

  // Step 3 handler
  const handleStartShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cashNum = Number(openingCashInput.replace(/\D/g, '')) || 0;
    startShift(cashierName, cashNum);

    if (chosenUnit === 'BOOKING_LAPANGAN') {
      router.push('/booking');
    } else {
      router.push('/kasir');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
      {/* Step Indicator Progress Bar */}
      <div className="w-full max-w-md mb-3 px-2 flex items-center justify-between text-xs font-bold text-slate-400">
        <span className={step === 'SELECT_SHIFT' ? 'text-[#eb4b2b] font-black' : 'text-slate-600'}>
          1. Pilih Shift
        </span>
        <span>&rarr;</span>
        <span className={step === 'SELECT_UNIT' ? 'text-[#eb4b2b] font-black' : step === 'START_SHIFT' ? 'text-slate-600' : 'text-slate-400'}>
          2. Pilih Unit (Kantin / Booking)
        </span>
        <span>&rarr;</span>
        <span className={step === 'START_SHIFT' ? 'text-[#eb4b2b] font-black' : 'text-slate-400'}>
          3. Kas Awal
        </span>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
        
        {/* ============================================================ */}
        {/* STEP 1: PILIH SHIFT DULU (SHIFT SELECTION) */}
        {/* ============================================================ */}
        {step === 'SELECT_SHIFT' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Top Bar */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Kembali ke Login"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="font-bold text-base text-slate-900 tracking-tight">
                  Pilih Jadwal Shift
                </h2>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-800">{cashierName}</p>
                  <p className="text-[10px] text-slate-400">Kasir Bertugas</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-red-50 text-[#eb4b2b] font-bold text-xs flex items-center justify-center">
                  {cashierName.slice(0, 2).toUpperCase()}
                </div>
              </div>
            </div>

            {/* Title & Description */}
            <div className="text-center space-y-1 pt-1">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Pilih Shift Kerja Anda
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Silakan pilih jadwal shift operasional yang akan Anda jalankan hari ini.
              </p>
            </div>

            {/* Shift Cards List */}
            <div className="space-y-3.5 pt-1">
              {SHIFT_OPTIONS.map((shift) => {
                const isMorning = shift.id === 'SHIFT_PAGI';
                const Icon = isMorning ? Sun : Moon;

                return (
                  <div
                    key={shift.id}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-[#eb4b2b]/60 bg-white shadow-2xs space-y-3 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#eb4b2b] border border-orange-100 flex items-center justify-center">
                          <Icon className="w-5 h-5 stroke-2" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">
                            {shift.name}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {shift.timeRange} WIB
                          </p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold">
                        Tersedia
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleChooseShift(shift)}
                      className="w-full py-3 px-4 rounded-xl bg-[#eb4b2b] hover:bg-[#d43a1c] active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#eb4b2b]/20 transition-all cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Pilih {shift.name}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 2: BARU PILIH KANTIN (POS JUALAN) / BOOKING LAPANGAN */}
        {/* ============================================================ */}
        {step === 'SELECT_UNIT' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setStep('SELECT_SHIFT')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="font-bold text-base text-slate-900">
                  Pilih Unit Tugas
                </h2>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-800">{chosenShift.name}</p>
                <p className="text-[10px] text-slate-400">{chosenShift.timeRange}</p>
              </div>
            </div>

            <div className="text-center space-y-1 pt-1">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Pilih Layanan Kasir
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Tentukan apakah Anda bertugas di Kantin / Kasir Toko atau di Layanan Booking Lapangan.
              </p>
            </div>

            {/* 2 Big Unit Selection Cards */}
            <div className="space-y-3 pt-1">
              {/* Unit 1: Kantin / Kasir POS Jualan */}
              <button
                type="button"
                onClick={() => handleChooseUnit('POS_TOKO')}
                className="w-full p-5 rounded-2xl border-2 border-slate-200 hover:border-[#eb4b2b] bg-white hover:bg-red-50/30 transition-all text-left flex items-center space-x-4 cursor-pointer group shadow-xs hover:shadow-md"
              >
                <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#eb4b2b] border border-red-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Store className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-base text-slate-900 group-hover:text-[#eb4b2b] transition-colors">
                    Kantin & Kasir POS Jualan
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Penjualan makanan, minuman, shuttlecock, kantin & perlengkapan olahraga.
                  </p>
                </div>
              </button>

              {/* Unit 2: Booking Lapangan */}
              <button
                type="button"
                onClick={() => handleChooseUnit('BOOKING_LAPANGAN')}
                className="w-full p-5 rounded-2xl border-2 border-slate-200 hover:border-emerald-600 bg-white hover:bg-emerald-50/30 transition-all text-left flex items-center space-x-4 cursor-pointer group shadow-xs hover:shadow-md"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <CalendarCheck className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-base text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Booking Lapangan
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Jadwal sewa lapangan badminton, check-in, dan reservasi member GOR.
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 3: START SHIFT & MODAL AWAL */}
        {/* ============================================================ */}
        {step === 'START_SHIFT' && (
          <form onSubmit={handleStartShiftSubmit} className="space-y-5 animate-in fade-in duration-200">
            {/* Header */}
            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Mulai Sesi Shift
              </h3>
              <p className="text-xs text-slate-500">
                Konfirmasi rincian tugas dan masukkan modal kas awal.
              </p>
            </div>

            {/* Shift Metadata Box */}
            <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Nama Kasir Jaga</span>
                <div className="flex items-center gap-1.5">
                  {['Yuli', 'Asfia'].map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setCashierName(name)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        cashierName === name
                          ? 'bg-[#eb4b2b] text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Jadwal Shift</span>
                <span className="font-bold text-slate-900 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {chosenShift.name} ({chosenShift.timeRange})
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Tanggal</span>
                <span className="font-bold text-slate-900">{currentDateStr || '01 Sep 2026'}</span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Jam Mulai</span>
                <span className="font-bold text-slate-900">{currentTimeStr || '08:00 WIB'}</span>
              </div>

              <div className="flex justify-between items-center text-slate-600 pt-1.5 border-t border-slate-200/80">
                <span>Unit Layanan</span>
                <span className="font-black text-[#eb4b2b]">
                  {chosenUnit === 'BOOKING_LAPANGAN' ? '🏸 Booking Lapangan' : '🛍️ Kantin & Kasir POS'}
                </span>
              </div>
            </div>

            {/* Modal Awal Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                Modal Kas Awal di Laci (Rp)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                  Rp
                </span>
                <input
                  type="text"
                  required
                  value={
                    openingCashInput
                      ? Number(openingCashInput.replace(/\D/g, '')).toLocaleString('id-ID')
                      : ''
                  }
                  onChange={(e) => setOpeningCashInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="500.000"
                  className="w-full pl-10 pr-3.5 py-3 bg-white border border-slate-300 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:border-[#eb4b2b] focus:ring-2 focus:ring-[#eb4b2b]/15"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Hitung uang fisik di laci kasir sebelum memulai transaksi.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-2xl bg-[#eb4b2b] hover:bg-[#d43a1c] active:scale-[0.99] text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-[#eb4b2b]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>MULAI BERTUGAS</span>
              </button>

              <button
                type="button"
                onClick={() => setStep('SELECT_UNIT')}
                className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
              >
                Kembali
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
