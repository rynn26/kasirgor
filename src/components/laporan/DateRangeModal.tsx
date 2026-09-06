'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, X, Check, Clock, ChevronRight } from 'lucide-react';

interface DateRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
  onApply: (start: string, end: string) => void;
  accentColor?: 'red' | 'emerald';
}

const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const DateRangeModal: React.FC<DateRangeModalProps> = ({
  isOpen,
  onClose,
  startDate,
  endDate,
  onApply,
  accentColor = 'emerald',
}) => {
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);

  useEffect(() => {
    if (isOpen) {
      setTempStart(startDate);
      setTempEnd(endDate);
    }
  }, [isOpen, startDate, endDate]);

  if (!isOpen) return null;

  const now = new Date();
  const today = fmt(now);

  const applyPreset = (s: string, e: string) => {
    setTempStart(s);
    setTempEnd(e);
  };

  // Quick preset calculations
  const presets = [
    {
      label: 'Hari Ini',
      action: () => applyPreset(today, today),
    },
    {
      label: 'Kemarin',
      action: () => {
        const y = new Date(now);
        y.setDate(now.getDate() - 1);
        const yStr = fmt(y);
        applyPreset(yStr, yStr);
      },
    },
    {
      label: '30 Hari Terakhir',
      action: () => {
        const past = new Date(now);
        past.setDate(now.getDate() - 29);
        applyPreset(fmt(past), today);
      },
    },
    {
      label: '1 s/d Hari Ini',
      action: () => {
        const y = now.getFullYear();
        const m = pad(now.getMonth() + 1);
        applyPreset(`${y}-${m}-01`, today);
      },
    },
    {
      label: '7 Hari Terakhir',
      action: () => {
        const past = new Date(now);
        past.setDate(now.getDate() - 6);
        applyPreset(fmt(past), today);
      },
    },
    {
      label: 'Bulan Ini Full',
      action: () => {
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        applyPreset(fmt(first), fmt(last));
      },
    },
  ];

  const handleConfirm = () => {
    if (!tempStart) return;
    const finalEnd = tempEnd || tempStart;
    const [s, e] = tempStart <= finalEnd ? [tempStart, finalEnd] : [finalEnd, tempStart];
    onApply(s, e);
    onClose();
  };

  // Calculate day count
  const dStart = new Date(tempStart);
  const dEnd = new Date(tempEnd || tempStart);
  const diffDays =
    tempStart && tempEnd
      ? Math.max(1, Math.round((Math.abs(dEnd.getTime() - dStart.getTime()) / (1000 * 3600 * 24))) + 1)
      : 1;

  const isRed = accentColor === 'red';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isRed ? 'bg-red-50 text-[#a62512]' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900">Pilih Periode Tanggal</h3>
              <p className="text-[11px] text-slate-500 font-medium">Tentukan rentang tanggal laporan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Quick Presets */}
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
              Pilihan Cepat
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={p.action}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold text-left transition-all flex items-center justify-between group cursor-pointer"
                >
                  <span className="truncate">{p.label}</span>
                  <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-slate-600 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Inputs */}
          <div className="space-y-3 pt-1 border-t border-slate-100">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Rentang Tanggal Kustom
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Dari Tanggal:
                </label>
                <input
                  type="date"
                  value={tempStart}
                  onChange={(e) => setTempStart(e.target.value)}
                  className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:bg-white transition-all ${
                    isRed ? 'focus:border-red-500' : 'focus:border-emerald-600'
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Sampai Tanggal:
                </label>
                <input
                  type="date"
                  value={tempEnd}
                  onChange={(e) => setTempEnd(e.target.value)}
                  className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:bg-white transition-all ${
                    isRed ? 'focus:border-red-500' : 'focus:border-emerald-600'
                  }`}
                />
              </div>
            </div>

            {/* Summary preview pill */}
            <div className="flex items-center justify-between bg-slate-100/70 px-3 py-2 rounded-xl text-xs font-medium text-slate-600">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Durasi: <strong>{diffDays} Hari</strong></span>
              </div>
              <span className="text-[11px] text-slate-500">
                {tempStart} s/d {tempEnd || tempStart}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center gap-2 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs text-white shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              isRed
                ? 'bg-[#a62512] hover:bg-red-700 shadow-red-600/20'
                : 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-700/20'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Terapkan Periode</span>
          </button>
        </div>
      </div>
    </div>
  );
};
