'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCourtBookingStore } from '@/lib/store/useCourtBookingStore';
import { useCourtPricingStore, TimeSlotPricing, DEFAULT_PRICING } from '@/lib/store/useCourtPricingStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { formatRupiah, formatNumber, parseNumberInput } from '@/lib/utils';
import { Court } from '@/types/booking';
import {
  ArrowLeft,
  Pencil,
  X,
  ToggleLeft,
  ToggleRight,
  Layers,
  Save,
  RefreshCw,
  AlertCircle,
  Calendar,
  Clock,
  Sun,
  Moon,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface EditState {
  name: string;
  isAvailable: boolean;
  dayPrice: number;
  dayStart: string;
  dayEnd: string;
  nightPrice: number;
  nightStart: string;
  nightEnd: string;
  memberDayPrice: number;
  memberNightPrice: number;
}

interface PickleballEditState {
  dayPrice: number;
  nightPrice: number;
}

export default function SettingLapanganPage() {
  const { courts, loadCourts, updateCourt, isLoading } = useCourtBookingStore();
  const {
    rules,
    selectedMonthKey,
    setSelectedMonthKey,
    setCourtPricing,
    applyToAllCourts,
    getPricing,
    deleteMonthRule,
    loadFromDb,
  } = useCourtPricingStore();
  const { showToast } = useToastStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  // Pickleball separate edit state
  const [pbEditingId, setPbEditingId] = useState<string | null>(null);
  const [pbEditState, setPbEditState] = useState<PickleballEditState | null>(null);
  const [pbSaving, setPbSaving] = useState(false);

  // Quick Global Apply State
  const [isQuickApplyOpen, setIsQuickApplyOpen] = useState(false);
  const [quickPricing, setQuickPricing] = useState<TimeSlotPricing>({ ...DEFAULT_PRICING });

  // Current month string (YYYY-MM)
  const currentMonthStr = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    loadCourts();
    loadFromDb(); // Fetch pricing rules from Supabase
  }, []);

  // Format month key for display
  const formatMonthDisplay = (key: string) => {
    if (key === 'ALL') return 'Semua Bulan (Standar)';
    const [year, month] = key.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(date);
  };

  const handleStartEdit = (court: Court) => {
    const currentPricing = getPricing(court.id, selectedMonthKey);
    setEditingId(court.id);
    setEditState({
      name: court.name,
      isAvailable: court.isAvailable,
      dayPrice: currentPricing.dayPrice,
      dayStart: currentPricing.dayStart,
      dayEnd: currentPricing.dayEnd,
      nightPrice: currentPricing.nightPrice,
      nightStart: currentPricing.nightStart,
      nightEnd: currentPricing.nightEnd,
      memberDayPrice: currentPricing.memberDayPrice ?? currentPricing.dayPrice,
      memberNightPrice: currentPricing.memberNightPrice ?? currentPricing.nightPrice,
    });
  };

  const handleStartPickleballEdit = (courtId: string) => {
    const currentPricing = getPricing(courtId, selectedMonthKey);
    setPbEditingId(courtId);
    setPbEditState({
      dayPrice: currentPricing.pickleballDayPrice ?? currentPricing.dayPrice,
      nightPrice: currentPricing.pickleballNightPrice ?? currentPricing.nightPrice,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditState(null);
  };

  const handleCancelPickleball = () => {
    setPbEditingId(null);
    setPbEditState(null);
  };

  const handleSave = async (courtId: string) => {
    if (!editState) return;
    if (!editState.name.trim()) {
      showToast('Nama lapangan tidak boleh kosong');
      return;
    }
    if (editState.dayPrice <= 0 || editState.nightPrice <= 0 || editState.memberDayPrice <= 0 || editState.memberNightPrice <= 0) {
      showToast('Harga sewa harus lebih dari Rp 0');
      return;
    }

    setSaving(true);
    try {
      // 1. Save pricing (Badminton only — Pickleball handled separately)
      const currentPricing = getPricing(courtId, selectedMonthKey);
      setCourtPricing(courtId, selectedMonthKey, {
        dayPrice: editState.dayPrice,
        dayStart: editState.dayStart,
        dayEnd: editState.dayEnd,
        afternoonPrice: editState.nightPrice,
        afternoonStart: editState.nightStart,
        afternoonEnd: editState.nightEnd,
        nightPrice: editState.nightPrice,
        nightStart: editState.nightStart,
        nightEnd: editState.nightEnd,
        memberDayPrice: editState.memberDayPrice,
        memberNightPrice: editState.memberNightPrice,
        // Preserve pickleball pricing unchanged
        pickleballDayPrice: currentPricing.pickleballDayPrice,
        pickleballNightPrice: currentPricing.pickleballNightPrice,
      });

      // 2. Sync court base price
      const avgRate = Math.round((editState.dayPrice + editState.nightPrice) / 2);
      await updateCourt(courtId, {
        name: editState.name.trim(),
        type: 'Karpet',
        pricePerHour: editState.nightPrice || avgRate,
        isAvailable: editState.isAvailable,
      });

      showToast(`Harga ${editState.name} berhasil disimpan!`);
      setEditingId(null);
      setEditState(null);
    } catch {
      showToast('Gagal menyimpan ke server, namun tarif lokal tersimpan.');
      setEditingId(null);
      setEditState(null);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePickleball = async (courtId: string, label: string, altCourtId?: string) => {
    if (!pbEditState) return;
    if (pbEditState.dayPrice <= 0 || pbEditState.nightPrice <= 0) {
      showToast('Harga sewa harus lebih dari Rp 0');
      return;
    }
    setPbSaving(true);
    try {
      const currentPricing = getPricing(courtId, selectedMonthKey);
      await setCourtPricing(courtId, selectedMonthKey, {
        ...currentPricing,
        pickleballDayPrice: pbEditState.dayPrice,
        pickleballNightPrice: pbEditState.nightPrice,
      });
      if (altCourtId && altCourtId !== courtId) {
        const altPricing = getPricing(altCourtId, selectedMonthKey);
        await setCourtPricing(altCourtId, selectedMonthKey, {
          ...altPricing,
          pickleballDayPrice: pbEditState.dayPrice,
          pickleballNightPrice: pbEditState.nightPrice,
        });
      }
      showToast(`Harga Pickleball ${label} berhasil disimpan!`);
      setPbEditingId(null);
      setPbEditState(null);
    } catch {
      showToast('Gagal menyimpan tarif Pickleball.');
      setPbEditingId(null);
      setPbEditState(null);
    } finally {
      setPbSaving(false);
    }
  };

  const pickleballCourts = [
    {
      id: courts[0]?.id || 'PICKLEBALL_A',
      altId: 'PICKLEBALL_A',
      code: 'A',
      name: 'Lapangan A',
      subName: courts[0]?.name ? `Menggunakan area ${courts[0].name}` : 'Area Pickleball A',
    },
    {
      id: courts[1]?.id || 'PICKLEBALL_B',
      altId: 'PICKLEBALL_B',
      code: 'B',
      name: 'Lapangan B',
      subName: courts[1]?.name ? `Menggunakan area ${courts[1].name}` : 'Area Pickleball B',
    },
  ];

  const handleApplyToAll = () => {
    if (courts.length === 0) return;
    const courtIds = courts.map((c) => c.id);
    applyToAllCourts(selectedMonthKey, quickPricing, courtIds);
    showToast(`Tarif waktu berhasil diterapkan ke semua (${courts.length}) lapangan!`);
    setIsQuickApplyOpen(false);
  };

  const handleToggleAvailable = async (court: Court) => {
    try {
      await updateCourt(court.id, { isAvailable: !court.isAvailable });
      showToast(!court.isAvailable ? `${court.name} diaktifkan` : `${court.name} dinonaktifkan`);
    } catch {
      showToast('Gagal mengubah status lapangan');
    }
  };

  return (
    <div className="min-h-full bg-[#f8fafc] p-3.5 sm:p-5 max-w-xl mx-auto space-y-4 pb-28">
      {/* Top Header */}
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
              <div className="w-6 h-6 rounded-xl bg-gradient-to-tr from-[#b92b10] to-[#e64a19] text-white flex items-center justify-center">
                <Layers className="w-3 h-3" />
              </div>
              <h1 className="font-black text-base sm:text-lg text-slate-900 leading-tight">
                Setting Harga Lapangan
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Atur harga per waktu (Pagi-Sore &amp; Sore-Malam) &amp; per bulan
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => loadCourts()}
          disabled={isLoading}
          className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors cursor-pointer"
          title="Segarkan Data"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Month Selector Filter Bar */}
      <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-[#b92b10]" />
            <span>Pilih Periode Bulan</span>
          </div>
          <span className="text-[10px] font-bold text-slate-400">
            {formatMonthDisplay(selectedMonthKey)}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setSelectedMonthKey('ALL')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-left flex flex-col justify-center cursor-pointer ${
              selectedMonthKey === 'ALL'
                ? 'bg-[#b92b10] text-white border-[#b92b10] shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <span>Semua Bulan</span>
            <span className={`text-[10px] font-normal ${selectedMonthKey === 'ALL' ? 'text-red-100' : 'text-slate-400'}`}>
              Tarif Standar
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMonthKey(currentMonthStr)}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-left flex flex-col justify-center cursor-pointer ${
              selectedMonthKey === currentMonthStr
                ? 'bg-[#b92b10] text-white border-[#b92b10] shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <span>Bulan Ini</span>
            <span className={`text-[10px] font-normal ${selectedMonthKey === currentMonthStr ? 'text-red-100' : 'text-slate-400'}`}>
              {formatMonthDisplay(currentMonthStr)}
            </span>
          </button>

          <div className="col-span-2 sm:col-span-1 relative flex items-center">
            <input
              type="month"
              value={selectedMonthKey === 'ALL' ? '' : selectedMonthKey}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedMonthKey(e.target.value);
                }
              }}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#b92b10] cursor-pointer"
              title="Pilih Bulan Khusus"
            />
          </div>
        </div>

        {selectedMonthKey !== 'ALL' && (
          <div className="flex items-center justify-between pt-1 text-[11px] text-amber-700 bg-amber-50/80 p-2 rounded-xl border border-amber-200/80">
            <span>
              Sedang mengatur harga khusus untuk <strong>{formatMonthDisplay(selectedMonthKey)}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                deleteMonthRule(selectedMonthKey);
                showToast(`Aturan khusus untuk ${formatMonthDisplay(selectedMonthKey)} dihapus.`);
              }}
              className="text-[10px] font-bold text-red-600 hover:underline cursor-pointer"
            >
              Reset ke Standar
            </button>
          </div>
        )}
      </div>

      {/* Quick Action: Terapkan ke Semua Lapangan */}
      <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50/60 rounded-3xl border border-amber-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-900 leading-tight">
                Terapkan ke Semua Lapangan
              </h2>
              <p className="text-[10px] text-slate-500">
                Ubah harga Pagi-Sore dan Sore-Malam untuk seluruh lapangan sekaligus
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsQuickApplyOpen(!isQuickApplyOpen)}
            className="text-xs font-bold text-amber-800 bg-white border border-amber-200 hover:bg-amber-100/50 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            {isQuickApplyOpen ? 'Tutup' : 'Atur Sekarang'}
          </button>
        </div>

        {isQuickApplyOpen && (
          <div className="p-3.5 bg-white rounded-2xl border border-amber-200 space-y-3.5 animate-in fade-in duration-150">
            <p className="text-[11px] font-bold text-slate-600">
              Masukkan harga sewa serentak ({formatMonthDisplay(selectedMonthKey)}):
            </p>

            {/* Quick Apply: 4 inputs in 2 sections */}
            <div className="space-y-2.5">
              {/* Insidentil */}
              <div className="p-2.5 rounded-xl bg-orange-50/60 border border-orange-200 space-y-1.5">
                <div className="text-[10px] font-black text-orange-700 uppercase tracking-wider">⚡ Insidentil</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
                      <Sun className="w-3 h-3" /><span>Pagi-Sore</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-[10px] font-bold text-slate-400">Rp</span>
                      <input type="text" inputMode="numeric" value={quickPricing.dayPrice ? formatNumber(quickPricing.dayPrice) : ''}
                        onChange={(e) => setQuickPricing({ ...quickPricing, dayPrice: parseNumberInput(e.target.value) })}
                        className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-800" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600">
                      <Moon className="w-3 h-3" /><span>Sore-Malam</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-[10px] font-bold text-slate-400">Rp</span>
                      <input type="text" inputMode="numeric" value={quickPricing.nightPrice ? formatNumber(quickPricing.nightPrice) : ''}
                        onChange={(e) => setQuickPricing({ ...quickPricing, nightPrice: parseNumberInput(e.target.value) })}
                        className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-800" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Member */}
              <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1.5">
                <div className="text-[10px] font-black text-blue-700 uppercase tracking-wider">👤 Member</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
                      <Sun className="w-3 h-3" /><span>Pagi-Sore</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-[10px] font-bold text-slate-400">Rp</span>
                      <input type="text" inputMode="numeric" value={quickPricing.memberDayPrice ? formatNumber(quickPricing.memberDayPrice) : ''}
                        onChange={(e) => setQuickPricing({ ...quickPricing, memberDayPrice: parseNumberInput(e.target.value) })}
                        className="w-full pl-7 pr-2 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-black text-slate-800" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600">
                      <Moon className="w-3 h-3" /><span>Sore-Malam</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-[10px] font-bold text-slate-400">Rp</span>
                      <input type="text" inputMode="numeric" value={quickPricing.memberNightPrice ? formatNumber(quickPricing.memberNightPrice) : ''}
                        onChange={(e) => setQuickPricing({ ...quickPricing, memberNightPrice: parseNumberInput(e.target.value) })}
                        className="w-full pl-7 pr-2 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-black text-slate-800" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Pickleball */}
              <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1.5">
                <div className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">🏓 Pickleball</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
                      <Sun className="w-3 h-3" /><span>Pagi-Sore</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-[10px] font-bold text-slate-400">Rp</span>
                      <input type="text" inputMode="numeric" value={quickPricing.pickleballDayPrice ? formatNumber(quickPricing.pickleballDayPrice) : ''}
                        onChange={(e) => setQuickPricing({ ...quickPricing, pickleballDayPrice: parseNumberInput(e.target.value) })}
                        className="w-full pl-7 pr-2 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-black text-slate-800" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600">
                      <Moon className="w-3 h-3" /><span>Sore-Malam</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-[10px] font-bold text-slate-400">Rp</span>
                      <input type="text" inputMode="numeric" value={quickPricing.pickleballNightPrice ? formatNumber(quickPricing.pickleballNightPrice) : ''}
                        onChange={(e) => setQuickPricing({ ...quickPricing, pickleballNightPrice: parseNumberInput(e.target.value) })}
                        className="w-full pl-7 pr-2 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-black text-slate-800" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyToAll}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#b92b10] to-[#e64a19] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#b92b10]/20 hover:opacity-95 transition-opacity cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan & Terapkan ke Seluruh Lapangan</span>
            </button>
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-800">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
        <span>
          Tarif waktu (Pagi-Sore &amp; Sore-Malam) akan otomatis diterapkan saat kasir memilih jam booking di jadwal.
        </span>
      </div>

      {/* Header Seksi Badminton */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-xl bg-[#b92b10] text-white flex items-center justify-center text-xs shadow-xs">
            🏸
          </div>
          <div>
            <h2 className="font-black text-sm text-slate-900 leading-tight">
              Lapangan Badminton
            </h2>
            <p className="text-[10px] text-slate-500">
              Tarif Insidentil &amp; Member (Lapangan 1 - {courts.length || 4})
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-[#b92b10]">
          {courts.length} Lapangan
        </span>
      </div>

      {/* Court Cards List */}
      <div className="space-y-3">
        {isLoading && courts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mb-3" />
            <span className="text-sm font-semibold">Memuat data lapangan...</span>
          </div>
        ) : (
          courts.map((court, idx) => {
            const isEditing = editingId === court.id;
            const courtPricing = getPricing(court.id, selectedMonthKey);

            return (
              <div
                key={court.id}
                className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden ${
                  isEditing
                    ? 'border-[#b92b10] shadow-md shadow-[#b92b10]/10'
                    : 'border-slate-200 shadow-xs'
                }`}
              >
                {/* Card Header Summary */}
                <div className="p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center font-black text-lg shadow-xs ${
                        court.isAvailable
                          ? 'bg-gradient-to-br from-[#b92b10] to-[#e64a19] text-white'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-black text-sm text-slate-900 truncate">{court.name}</h2>
                        {!court.isAvailable && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                            Nonaktif
                          </span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Karpet
                        </span>
                      </div>

                      {/* 4 Price Badges: Insidentil + Member */}
                      <div className="mt-2 space-y-1.5">
                        {/* Header row */}
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="text-[9px] font-black text-slate-500 uppercase tracking-wider pl-0.5">⚡ Insidentil</div>
                          <div className="text-[9px] font-black text-blue-500 uppercase tracking-wider pl-0.5">👤 Member</div>
                        </div>
                        {/* Pagi-Sore row */}
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="p-1.5 rounded-xl bg-amber-50 border border-amber-100 text-left">
                            <div className="flex items-center gap-1 text-[9px] font-bold text-amber-700">
                              <Sun className="w-2.5 h-2.5" />
                              <span>Pagi-Sore</span>
                            </div>
                            <p className="text-[11px] font-black text-slate-900 leading-tight">
                              {formatRupiah(courtPricing.dayPrice)}
                            </p>
                          </div>
                          <div className="p-1.5 rounded-xl bg-blue-50 border border-blue-100 text-left">
                            <div className="flex items-center gap-1 text-[9px] font-bold text-blue-700">
                              <Sun className="w-2.5 h-2.5" />
                              <span>Pagi-Sore</span>
                            </div>
                            <p className="text-[11px] font-black text-slate-900 leading-tight">
                              {formatRupiah(courtPricing.memberDayPrice)}
                            </p>
                          </div>
                        </div>
                        {/* Sore-Malam row */}
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="p-1.5 rounded-xl bg-indigo-50 border border-indigo-100 text-left">
                            <div className="flex items-center gap-1 text-[9px] font-bold text-indigo-700">
                              <Moon className="w-2.5 h-2.5" />
                              <span>Sore-Malam</span>
                            </div>
                            <p className="text-[11px] font-black text-slate-900 leading-tight">
                              {formatRupiah(courtPricing.nightPrice)}
                            </p>
                          </div>
                          <div className="p-1.5 rounded-xl bg-blue-50 border border-blue-100 text-left">
                            <div className="flex items-center gap-1 text-[9px] font-bold text-blue-700">
                              <Moon className="w-2.5 h-2.5" />
                              <span>Sore-Malam</span>
                            </div>
                            <p className="text-[11px] font-black text-slate-900 leading-tight">
                              {formatRupiah(courtPricing.memberNightPrice)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleAvailable(court)}
                      disabled={isEditing}
                      title={court.isAvailable ? 'Nonaktifkan' : 'Aktifkan'}
                      className="p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {court.isAvailable ? (
                        <ToggleRight className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-400" />
                      )}
                    </button>

                    {isEditing ? (
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(court)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-[#b92b10]/10 hover:text-[#b92b10] text-slate-600 transition-colors cursor-pointer"
                        title="Edit Tarif Lapangan"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Edit Form Panel */}
                {isEditing && editState && (
                  <div className="px-4 pb-4 border-t border-slate-100 space-y-3.5 pt-3 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Edit Detail {court.name} ({formatMonthDisplay(selectedMonthKey)})
                      </p>
                    </div>

                    {/* Nama Lapangan */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Nama Lapangan
                      </label>
                      <input
                        type="text"
                        value={editState.name}
                        onChange={(e) => setEditState({ ...editState, name: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#b92b10]"
                        placeholder="Contoh: Lapangan 1"
                      />
                    </div>

                    {/* 4 Price Inputs: Insidentil & Member */}
                    <div className="space-y-2.5">

                      {/* === INSIDENTIL === */}
                      <div className="p-3 bg-orange-50/50 rounded-2xl border border-orange-200 space-y-2">
                        <div className="text-[10px] font-black text-orange-700 uppercase tracking-wider flex items-center gap-1">
                          <span>⚡ Insidentil</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {/* Pagi-Sore Insidentil */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-amber-700 flex items-center gap-1">
                              <Sun className="w-3 h-3" /> Pagi-Sore
                            </label>
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-[10px] font-bold text-slate-400">Rp</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={editState.dayPrice ? formatNumber(editState.dayPrice) : ''}
                                onChange={(e) => setEditState({ ...editState, dayPrice: parseNumberInput(e.target.value) })}
                                className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:border-[#b92b10]"
                              />
                            </div>
                          </div>
                          {/* Sore-Malam Insidentil */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-indigo-700 flex items-center gap-1">
                              <Moon className="w-3 h-3" /> Sore-Malam
                            </label>
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-[10px] font-bold text-slate-400">Rp</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={editState.nightPrice ? formatNumber(editState.nightPrice) : ''}
                                onChange={(e) => setEditState({ ...editState, nightPrice: parseNumberInput(e.target.value) })}
                                className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:border-[#b92b10]"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* === MEMBER === */}
                      <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-2">
                        <div className="text-[10px] font-black text-blue-700 uppercase tracking-wider flex items-center gap-1">
                          <span>👤 Member</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {/* Pagi-Sore Member */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-amber-700 flex items-center gap-1">
                              <Sun className="w-3 h-3" /> Pagi-Sore
                            </label>
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-[10px] font-bold text-slate-400">Rp</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={editState.memberDayPrice ? formatNumber(editState.memberDayPrice) : ''}
                                onChange={(e) => setEditState({ ...editState, memberDayPrice: parseNumberInput(e.target.value) })}
                                className="w-full pl-7 pr-2 py-1.5 bg-white border border-blue-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>
                          {/* Sore-Malam Member */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-indigo-700 flex items-center gap-1">
                              <Moon className="w-3 h-3" /> Sore-Malam
                            </label>
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-[10px] font-bold text-slate-400">Rp</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={editState.memberNightPrice ? formatNumber(editState.memberNightPrice) : ''}
                                onChange={(e) => setEditState({ ...editState, memberNightPrice: parseNumberInput(e.target.value) })}
                                className="w-full pl-7 pr-2 py-1.5 bg-white border border-blue-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Status Lapangan */}
                    <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-200">
                      <div>
                        <p className="text-xs font-bold text-slate-700">Status Lapangan</p>
                        <p className="text-[11px] text-slate-400">
                          {editState.isAvailable ? 'Aktif — bisa dibooking' : 'Nonaktif — tidak bisa dibooking'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditState({ ...editState, isAvailable: !editState.isAvailable })}
                        className="cursor-pointer"
                      >
                        {editState.isAvailable ? (
                          <ToggleRight className="w-8 h-8 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-slate-400" />
                        )}
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="flex-1 py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSave(court.id)}
                        disabled={saving}
                        className="flex-[2] py-2.5 px-4 rounded-2xl bg-[#b92b10] hover:bg-[#a3250d] text-white font-bold text-xs shadow-lg shadow-[#b92b10]/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70"
                      >
                        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>{saving ? 'Menyimpan...' : 'Simpan Tarif'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Seksi Khusus: Lapangan Pickleball (Lapangan A & Lapangan B) */}
      <div className="space-y-3 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs shadow-xs">
              🏓
            </div>
            <div>
              <h2 className="font-black text-sm text-slate-900 leading-tight">
                Lapangan Pickleball
              </h2>
              <p className="text-[10px] text-slate-500">
                Tarif khusus sewa lapangan Pickleball (Lapangan A &amp; Lapangan B)
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            2 Lapangan
          </span>
        </div>

        {/* Pickleball Cards: Lapangan A & Lapangan B */}
        <div className="space-y-3">
          {pickleballCourts.map((pb) => {
            const isEditing = pbEditingId === pb.id;
            const pbPricing = getPricing(pb.id, selectedMonthKey);
            const dayPrice = pbPricing.pickleballDayPrice || pbPricing.dayPrice || 60000;
            const nightPrice = pbPricing.pickleballNightPrice || pbPricing.nightPrice || 85000;

            return (
              <div
                key={pb.id}
                className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden ${
                  isEditing
                    ? 'border-emerald-600 shadow-md shadow-emerald-600/10'
                    : 'border-slate-200 shadow-xs'
                }`}
              >
                {/* Pickleball Card Header Summary */}
                <div className="p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center font-black text-lg shadow-xs bg-gradient-to-br from-emerald-600 to-teal-600 text-white">
                      {pb.code}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-black text-sm text-slate-900 truncate">
                          {pb.name}
                        </h2>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Pickleball
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{pb.subName}</p>

                      {/* Pickleball Price Badges (Pagi-Sore & Sore-Malam) */}
                      <div className="grid grid-cols-2 gap-1.5 mt-2">
                        <div className="p-1.5 rounded-xl bg-amber-50 border border-amber-100 text-left">
                          <div className="flex items-center gap-1 text-[9px] font-bold text-amber-700">
                            <Sun className="w-2.5 h-2.5" />
                            <span>Pagi-Sore</span>
                          </div>
                          <p className="text-[11px] font-black text-slate-900 leading-tight">
                            {formatRupiah(dayPrice)}
                          </p>
                          <span className="text-[8px] text-slate-400">07:00 - 18:00</span>
                        </div>

                        <div className="p-1.5 rounded-xl bg-indigo-50 border border-indigo-100 text-left">
                          <div className="flex items-center gap-1 text-[9px] font-bold text-indigo-700">
                            <Moon className="w-2.5 h-2.5" />
                            <span>Sore-Malam</span>
                          </div>
                          <p className="text-[11px] font-black text-slate-900 leading-tight">
                            {formatRupiah(nightPrice)}
                          </p>
                          <span className="text-[8px] text-slate-400">18:00 - 24:00</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isEditing ? (
                      <button
                        type="button"
                        onClick={handleCancelPickleball}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartPickleballEdit(pb.id)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition-colors cursor-pointer"
                        title={`Edit Tarif ${pb.name}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Pickleball Edit Form Panel */}
                {isEditing && pbEditState && (
                  <div className="px-4 pb-4 border-t border-slate-100 space-y-3.5 pt-3 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Edit Tarif {pb.name} ({formatMonthDisplay(selectedMonthKey)})
                      </p>
                    </div>

                    <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-2">
                      <div className="text-[10px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                        <span>⚡ Tarif Insidentil Pickleball</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Pagi-Sore Pickleball */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-amber-700 flex items-center gap-1">
                            <Sun className="w-3 h-3" /> Pagi-Sore (07:00 - 18:00)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2 top-1.5 text-[10px] font-bold text-slate-400">Rp</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={pbEditState.dayPrice ? formatNumber(pbEditState.dayPrice) : ''}
                              onChange={(e) => setPbEditState({ ...pbEditState, dayPrice: parseNumberInput(e.target.value) })}
                              className="w-full pl-7 pr-2 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>

                        {/* Sore-Malam Pickleball */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-indigo-700 flex items-center gap-1">
                            <Moon className="w-3 h-3" /> Sore-Malam (18:00 - 24:00)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2 top-1.5 text-[10px] font-bold text-slate-400">Rp</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={pbEditState.nightPrice ? formatNumber(pbEditState.nightPrice) : ''}
                              onChange={(e) => setPbEditState({ ...pbEditState, nightPrice: parseNumberInput(e.target.value) })}
                              className="w-full pl-7 pr-2 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCancelPickleball}
                        className="flex-1 py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSavePickleball(pb.id, pb.name, pb.altId)}
                        disabled={pbSaving}
                        className="flex-[2] py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70"
                      >
                        {pbSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>{pbSaving ? 'Menyimpan...' : 'Simpan Tarif'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Box */}
      {courts.length > 0 && !editingId && (
        <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs">
          <p className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">
            Ringkasan Lapangan & Tarif
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-2xl font-black text-slate-900">{courts.length}</p>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Total Lapangan</p>
            </div>
            <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100">
              <p className="text-2xl font-black text-emerald-700">
                {courts.filter((c) => c.isAvailable).length}
              </p>
              <p className="text-[10px] font-semibold text-emerald-500 mt-0.5">Aktif</p>
            </div>
            <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-100">
              <p className="text-sm font-black text-amber-800 mt-1 truncate">
                {formatMonthDisplay(selectedMonthKey)}
              </p>
              <p className="text-[10px] font-semibold text-amber-600 mt-0.5">Periode Aktif</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
