'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  Users2, 
  Calendar, 
  Check, 
  CheckCircle2, 
  History 
} from 'lucide-react';
import { useShiftStore } from '@/lib/store/useShiftStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { createOpenMabarTransaction } from '@/lib/db/mabar';
import { MabarSportType } from '@/types/academy';
import { formatRupiah } from '@/lib/utils';
import { getJakartaToday } from '@/lib/bookingUtils';

export default function OpenMabarPage() {
  const router = useRouter();
  const { cashierName, selectedShift } = useShiftStore();
  const { showToast } = useToastStore();

  const handleBack = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('from') === 'laporan' || document.referrer.includes('/laporan')) {
        router.push('/laporan?unit=mabar');
        return;
      }
      if (window.history.length > 1) {
        router.back();
        return;
      }
    }
    router.push('/booking');
  };

  const todayJakarta = getJakartaToday();

  // Form State
  const [sportType, setSportType] = useState<MabarSportType>('BADMINTON');
  const [date, setDate] = useState(todayJakarta);
  const [nominalCash, setNominalCash] = useState<number>(0);
  const [nominalQris, setNominalQris] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Total calculation: Cash + QRIS
  const totalAmount = useMemo(() => {
    return (nominalCash || 0) + (nominalQris || 0);
  }, [nominalCash, nominalQris]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (totalAmount <= 0) {
      showToast('Mohon masukkan nominal cash atau QRIS yang valid!');
      return;
    }

    setIsSubmitting(true);
    try {
      const activeCashier = cashierName || 'Yuli';
      const activeShift = selectedShift?.name || (activeCashier.toLowerCase() === 'asfia' ? 'Shift Sore - Malam' : 'Shift Pagi - Siang');

      await createOpenMabarTransaction({
        sportType,
        date,
        nominalCash: nominalCash || 0,
        nominalQris: nominalQris || 0,
        totalAmount,
        cashierName: activeCashier,
        shift: activeShift,
      });

      showToast(`Pemasukan Open Mabar ${sportType === 'BADMINTON' ? 'Badminton' : 'Pickleball'} berhasil disimpan!`);
      // Langsung reset nominal input tanpa struk
      setNominalCash(0);
      setNominalQris(0);
    } catch (err) {
      console.error('Error saving open mabar transaction:', err);
      showToast('Gagal menyimpan transaksi. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
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
          <span>Open Mabar</span>
        </button>

        <Link
          href="/booking/mabar/history"
          className="px-3 py-1.5 rounded-2xl bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
        >
          <History className="w-3.5 h-3.5" />
          <span>Riwayat Pemasukan</span>
        </Link>
      </div>

      {/* Main Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
        
        {/* Banner Card */}
        <div className="p-4 rounded-2xl flex items-center gap-3.5 border border-pink-100 bg-pink-50/70">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white bg-gradient-to-tr from-pink-500 to-rose-600 shadow-md shadow-pink-600/20">
            <Users2 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="font-black text-sm tracking-wide text-pink-600">
              OPEN MABAR
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Catat pemasukan open mabar
            </p>
          </div>
        </div>

        {/* Jenis Mabar (Badminton vs Pickleball) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-black text-slate-800">
            Jenis Mabar <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* Badminton */}
            <button
              type="button"
              onClick={() => setSportType('BADMINTON')}
              className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                sportType === 'BADMINTON'
                  ? 'bg-[#c5221f] text-white border-[#c5221f] shadow-md shadow-red-600/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🏸</span>
                <span className="text-xs font-black">Badminton</span>
              </div>
              {sportType === 'BADMINTON' && (
                <Check className="w-4 h-4 stroke-[3] text-white shrink-0 ml-1" />
              )}
            </button>

            {/* Pickleball */}
            <button
              type="button"
              onClick={() => setSportType('PICKLEBALL')}
              className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                sportType === 'PICKLEBALL'
                  ? 'bg-[#c5221f] text-white border-[#c5221f] shadow-md shadow-red-600/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🏓</span>
                <span className="text-xs font-black">Pickleball</span>
              </div>
              {sportType === 'PICKLEBALL' && (
                <Check className="w-4 h-4 stroke-[3] text-white shrink-0 ml-1" />
              )}
            </button>
          </div>
        </div>

        {/* Tanggal Mabar */}
        <div className="space-y-1.5">
          <label className="block text-xs font-black text-slate-800">
            Tanggal <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50/80 border border-slate-200 text-sm text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all cursor-pointer"
            />
            <Calendar className="w-4 h-4 text-rose-500 absolute left-4 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Nominal Cash (Rp) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-black text-slate-800">
            Nominal Cash (Rp)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
              Rp
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={nominalCash ? nominalCash.toLocaleString('id-ID') : ''}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '');
                setNominalCash(raw ? parseInt(raw, 10) : 0);
              }}
              placeholder="Masukkan nominal cash"
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50/80 border border-slate-200 text-sm text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
            />
          </div>
        </div>

        {/* Nominal QRIS (Rp) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-black text-slate-800">
            Nominal QRIS (Rp)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
              Rp
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={nominalQris ? nominalQris.toLocaleString('id-ID') : ''}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '');
                setNominalQris(raw ? parseInt(raw, 10) : 0);
              }}
              placeholder="Masukkan nominal QRIS"
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50/80 border border-slate-200 text-sm text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
            />
          </div>
        </div>

        {/* Total Pembayaran (Green Box) */}
        <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between">
          <span className="text-xs font-black text-emerald-900">
            Total Pembayaran
          </span>
          <span className="text-base sm:text-lg font-black text-emerald-700">
            {formatRupiah(totalAmount)}
          </span>
        </div>

        {/* Tombol Simpan Pembayaran */}
        <button
          type="submit"
          disabled={isSubmitting || totalAmount <= 0}
          className="w-full py-4 rounded-2xl bg-[#c5221f] hover:bg-[#a51b18] text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/25 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        >
          <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
          <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Pembayaran'}</span>
        </button>
      </form>
    </div>
  );
}
