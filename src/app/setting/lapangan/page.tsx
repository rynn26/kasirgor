'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCourtBookingStore } from '@/lib/store/useCourtBookingStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { formatRupiah } from '@/lib/utils';
import { Court, CourtType } from '@/types/booking';
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
} from 'lucide-react';

const COURT_TYPES: CourtType[] = ['VIP Vinyl BWF', 'Standar Karpet', 'Parket Kayu'];

interface EditState {
  name: string;
  type: CourtType;
  pricePerHour: number;
  description: string;
  isAvailable: boolean;
}

export default function SettingLapanganPage() {
  const { courts, loadCourts, updateCourt, isLoading } = useCourtBookingStore();
  const { showToast } = useToastStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCourts();
  }, []);

  const handleStartEdit = (court: Court) => {
    setEditingId(court.id);
    setEditState({
      name: court.name,
      type: court.type,
      pricePerHour: court.pricePerHour,
      description: court.description || '',
      isAvailable: court.isAvailable,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditState(null);
  };

  const handleSave = async (courtId: string) => {
    if (!editState) return;
    if (!editState.name.trim()) {
      showToast('Nama lapangan tidak boleh kosong');
      return;
    }
    if (editState.pricePerHour <= 0) {
      showToast('Harga harus lebih dari Rp 0');
      return;
    }
    setSaving(true);
    try {
      await updateCourt(courtId, {
        name: editState.name.trim(),
        type: editState.type,
        pricePerHour: editState.pricePerHour,
        description: editState.description.trim(),
        isAvailable: editState.isAvailable,
      });
      showToast('Data lapangan berhasil disimpan!');
      setEditingId(null);
      setEditState(null);
    } catch {
      showToast('Gagal menyimpan. Cek koneksi dan coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAvailable = async (court: Court) => {
    try {
      await updateCourt(court.id, { isAvailable: !court.isAvailable });
      showToast(
        !court.isAvailable
          ? `${court.name} diaktifkan`
          : `${court.name} dinonaktifkan`
      );
    } catch {
      showToast('Gagal mengubah status lapangan');
    }
  };

  const typeColor: Record<CourtType, string> = {
    'VIP Vinyl BWF': 'bg-amber-100 text-amber-800',
    'Standar Karpet': 'bg-blue-100 text-blue-800',
    'Parket Kayu': 'bg-emerald-100 text-emerald-800',
  };

  return (
    <div className="min-h-full bg-[#f8fafc] p-3.5 sm:p-5 max-w-xl mx-auto space-y-4 pb-28">

      {/* Header */}
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
                Setting Lapangan
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Atur nama, tipe, harga, dan status lapangan GOR
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => loadCourts()}
          disabled={isLoading}
          className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Info Banner */}
      <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-800">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
        <span>
          Perubahan harga berlaku untuk booking <strong>baru</strong> saja. Booking yang sudah tercatat tidak berubah.
        </span>
      </div>

      {/* Court Cards */}
      <div className="space-y-3">
        {isLoading && courts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mb-3" />
            <span className="text-sm font-semibold">Memuat data lapangan...</span>
          </div>
        ) : (
          courts.map((court, idx) => {
            const isEditing = editingId === court.id;

            return (
              <div
                key={court.id}
                className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden ${
                  isEditing
                    ? 'border-[#b92b10] shadow-md shadow-[#b92b10]/10'
                    : 'border-slate-200 shadow-xs'
                }`}
              >
                {/* Card Header */}
                <div className="p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Number Badge */}
                    <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center font-black text-lg shadow-xs ${
                      court.isAvailable
                        ? 'bg-gradient-to-br from-[#b92b10] to-[#e64a19] text-white'
                        : 'bg-slate-200 text-slate-400'
                    }`}>
                      {idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-black text-sm text-slate-900 truncate">
                          {court.name}
                        </h2>
                        {!court.isAvailable && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                            Nonaktif
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeColor[court.type] || 'bg-slate-100 text-slate-700'}`}>
                          {court.type}
                        </span>
                        <span className="font-black text-[#b92b10] text-xs">
                          {formatRupiah(court.pricePerHour)}<span className="text-slate-400 font-semibold">/jam</span>
                        </span>
                      </div>
                      {court.description && (
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{court.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleAvailable(court)}
                      disabled={isEditing}
                      title={court.isAvailable ? 'Nonaktifkan' : 'Aktifkan'}
                      className="p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {court.isAvailable
                        ? <ToggleRight className="w-6 h-6 text-emerald-600" />
                        : <ToggleLeft className="w-6 h-6 text-slate-400" />}
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
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Edit Form */}
                {isEditing && editState && (
                  <div className="px-4 pb-4 border-t border-slate-100 space-y-3 pt-3">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Edit Detail Lapangan</p>

                    {/* Nama */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Nama Lapangan</label>
                      <input
                        type="text"
                        value={editState.name}
                        onChange={(e) => setEditState({ ...editState, name: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#b92b10] focus:bg-white transition-all"
                        placeholder="Contoh: Lapangan 1 (VIP Vinyl BWF)"
                      />
                    </div>

                    {/* Tipe */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Tipe Lapangan</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {COURT_TYPES.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setEditState({ ...editState, type: t })}
                            className={`py-2 px-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer text-center ${
                              editState.type === t
                                ? 'bg-[#b92b10] text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Harga */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Harga per Jam</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={editState.pricePerHour || ''}
                          onChange={(e) => setEditState({ ...editState, pricePerHour: Number(e.target.value) })}
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:border-[#b92b10] focus:bg-white transition-all"
                          placeholder="80000"
                        />
                      </div>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {[50000, 60000, 75000, 80000, 100000].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setEditState({ ...editState, pricePerHour: p })}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                              editState.pricePerHour === p
                                ? 'bg-[#b92b10] text-white border-[#b92b10]'
                                : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {formatRupiah(p)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Deskripsi */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Deskripsi (Opsional)</label>
                      <input
                        type="text"
                        value={editState.description}
                        onChange={(e) => setEditState({ ...editState, description: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#b92b10] focus:bg-white transition-all"
                        placeholder="Contoh: Karpet BWF Hijau, LED 1000 Lux"
                      />
                    </div>

                    {/* Status Toggle */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
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
                        {editState.isAvailable
                          ? <ToggleRight className="w-8 h-8 text-emerald-600" />
                          : <ToggleLeft className="w-8 h-8 text-slate-400" />}
                      </button>
                    </div>

                    {/* Buttons */}
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
                        {saving ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Summary */}
      {courts.length > 0 && !editingId && (
        <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs">
          <p className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">Ringkasan Lapangan</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-2xl font-black text-slate-900">{courts.length}</p>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Total</p>
            </div>
            <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100">
              <p className="text-2xl font-black text-emerald-700">
                {courts.filter(c => c.isAvailable).length}
              </p>
              <p className="text-[10px] font-semibold text-emerald-500 mt-0.5">Aktif</p>
            </div>
            <div className="p-2.5 rounded-2xl bg-red-50 border border-red-100">
              <p className="text-2xl font-black text-red-600">
                {courts.filter(c => !c.isAvailable).length}
              </p>
              <p className="text-[10px] font-semibold text-red-400 mt-0.5">Nonaktif</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
