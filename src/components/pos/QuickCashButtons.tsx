'use client';

import React from 'react';
import { formatRupiah } from '@/lib/utils';

interface QuickCashButtonsProps {
  grandTotal: number;
  onSelectAmount: (amount: number) => void;
  selectedAmount: number;
}

export const QuickCashButtons: React.FC<QuickCashButtonsProps> = ({
  grandTotal,
  onSelectAmount,
  selectedAmount,
}) => {
  // Preset nominal uang umum di Indonesia
  const nominalList = [10000, 20000, 50000, 100000, 200000];

  // Tambahkan opsi uang pas dan rounded up terdekat jika belum ada di list
  const nextRound50k = Math.ceil(grandTotal / 50000) * 50000;
  const nextRound100k = Math.ceil(grandTotal / 100000) * 100000;

  const quickOptions = Array.from(
    new Set([
      grandTotal,
      ...nominalList.filter((n) => n >= grandTotal),
      nextRound50k,
      nextRound100k,
    ])
  )
    .filter((n) => n > 0)
    .sort((a, b) => a - b)
    .slice(0, 6);

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
        Pilihan Cepat Nominal Uang (Tunai)
      </label>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onSelectAmount(grandTotal)}
          className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
            selectedAmount === grandTotal
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
              : 'bg-white border-slate-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300'
          }`}
        >
          Uang Pas
        </button>

        {quickOptions
          .filter((amount) => amount !== grandTotal)
          .map((amount) => {
            const isSelected = selectedAmount === amount;
            return (
              <button
                key={amount}
                type="button"
                onClick={() => onSelectAmount(amount)}
                className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#b92b10] border-[#b92b10] text-white shadow-xs'
                    : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50 hover:border-slate-400'
                }`}
              >
                {formatRupiah(amount)}
              </button>
            );
          })}
      </div>
    </div>
  );
};
