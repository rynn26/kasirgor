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
  Coffee,
  ChevronRight
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
            const name = parsed.name || parsed.user;
            setCashierName(name);
            if (name.toLowerCase() === 'asfia' && (!selectedShift || selectedShift.id === 'SHIFT_PAGI')) {
              setChosenShift(SHIFT_OPTIONS[1]);
              selectShift(SHIFT_OPTIONS[1]);
            }
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
    selectShift(chosenShift);
    startShift(cashierName, 0);

    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('kasir_session');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          parsed.shift = chosenShift.name;
          parsed.name = cashierName;
          localStorage.setItem('kasir_session', JSON.stringify(parsed));
        } catch {}
      }
      window.dispatchEvent(new Event('shift_change'));
    }

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
          3. Konfirmasi Mulai
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
                  <User className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Quick Helper Banner */}
            <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200/70 flex items-start space-x-2.5">
              <Calendar className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-800 leading-relaxed">
                <p className="font-bold">Penugasan Shift Kasir</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  <strong>Yuli</strong> ditugaskan pada Shift Pagi (08:00 - 17:00), sedangkan <strong>Asfia</strong> pada Shift Sore (17:00 - 23:00).
                </p>
              </div>
            </div>

            {/* Shift List Cards */}
            <div className="space-y-3">
              {SHIFT_OPTIONS.map((shift) => {
                const isSelected = chosenShift.id === shift.id;
                const isMorning = shift.id === 'SHIFT_PAGI';

                return (
                  <button
                    key={shift.id}
                    type="button"
                    onClick={() => handleChooseShift(shift)}
                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between cursor-pointer group shadow-xs hover:shadow-md ${
                      isSelected
                        ? 'border-[#eb4b2b] bg-red-50/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-[#eb4b2b] text-white shadow-md shadow-[#eb4b2b]/20'
                          : isMorning 
                            ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-100'
                            : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'
                      }`}>
                        {isMorning ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-black text-sm text-slate-900 group-hover:text-[#eb4b2b] transition-colors">
                            {shift.name}
                          </h4>
                          {isMorning && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                              Pagi
                            </span>
                          )}
                          {!isMorning && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-md">
                              Malam
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {shift.timeRange} WIB
                        </p>
                      </div>
                    </div>

                    <ChevronRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${
                      isSelected ? 'text-[#eb4b2b]' : 'text-slate-300'
                    }`} />
                  </button>
                );
              })}
            </div>

            {/* Direct Switch to Previous / Active Session */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => router.push(selectedUnit === 'BOOKING_LAPANGAN' ? '/booking' : '/kasir')}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <span>Sudah punya shift aktif? Lewati pemilihan</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 2: PILIH UNIT LAYANAN (UNIT SELECTION) */}
        {/* ============================================================ */}
        {step === 'SELECT_UNIT' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Top Bar with Back Button to Step 1 */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setStep('SELECT_SHIFT')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Kembali ke Pilih Shift"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="font-bold text-base text-slate-900 tracking-tight">
                    Pilih Unit Kerja Kasir
                  </h2>
                </div>
              </div>
              <span className="text-xs font-bold px-2 py-1 bg-red-50 text-[#eb4b2b] rounded-lg">
                {chosenShift.name}
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Pilih menu utama yang akan dibuka kasir saat memulai sesi tugas:
            </p>

            {/* Units Cards List */}
            <div className="space-y-3">
              {/* Unit 1: POS Toko & Kantin */}
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
        {/* STEP 3: START SHIFT & KONFIRMASI MULAI */}
        {/* ============================================================ */}
        {step === 'START_SHIFT' && (
          <form onSubmit={handleStartShiftSubmit} className="space-y-5 animate-in fade-in duration-200">
            {/* Header */}
            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Mulai Sesi Shift
              </h3>
              <p className="text-xs text-slate-500">
                Konfirmasi rincian tugas sebelum memulai pelayanan kasir.
              </p>
            </div>

            {/* Shift Metadata Box */}
            <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Nama Kasir Jaga</span>
                <span className="font-bold text-slate-900">{cashierName}</span>
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
                <span className="font-bold text-slate-900">{currentDateStr}</span>
              </div>

              <div className="flex justify-between items-center text-slate-600 pt-1.5 border-t border-slate-200/80">
                <span>Unit Layanan</span>
                <span className="font-black text-[#eb4b2b]">
                  {chosenUnit === 'BOOKING_LAPANGAN' ? '🏸 Booking Lapangan' : '🛍️ Kantin & Kasir POS'}
                </span>
              </div>
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
