'use client';

import React, { useMemo } from 'react';
import { formatRupiah } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';
import { useTransactionStore } from '@/lib/store/useTransactionStore';

export const SalesChart: React.FC = () => {
  const { transactions } = useTransactionStore();

  // Compute last 7 days sales from real transaction data
  const days = useMemo(() => {
    const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const result: { day: string; amount: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = dayLabels[d.getDay()];

      const total = transactions
        .filter(
          (t) =>
            t.status === 'COMPLETED' && t.createdAt.startsWith(dateStr)
        )
        .reduce((sum, t) => sum + t.grandTotal, 0);

      result.push({ day: dayLabel, amount: total });
    }
    return result;
  }, [transactions]);

  const maxAmount = Math.max(...days.map((d) => d.amount), 1);
  const totalWeek = days.reduce((s, d) => s + d.amount, 0);
  const avgDaily = Math.round(totalWeek / 7);
  const peakAmount = Math.max(...days.map((d) => d.amount));

  // Growth vs previous day
  const today = days[days.length - 1]?.amount ?? 0;
  const yesterday = days[days.length - 2]?.amount ?? 0;
  const growth =
    yesterday > 0 ? (((today - yesterday) / yesterday) * 100).toFixed(1) : null;

  return (
    <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Tren Penjualan Produk (7 Hari Terakhir)</span>
          </h3>
          <p className="text-xs text-slate-500">Omzet penjualan toko kasir berdasarkan transaksi nyata</p>
        </div>

        {growth !== null && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-[#b92b10] border border-red-100 text-xs font-bold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{Number(growth) >= 0 ? '+' : ''}{growth}%</span>
          </div>
        )}
      </div>

      {/* Bar Chart Visualization */}
      <div className="h-44 pt-6 flex items-end justify-between gap-2 sm:gap-4 border-b border-slate-100 pb-2">
        {days.map((item, idx) => {
          const heightPct = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
          const isMax = item.amount === peakAmount && peakAmount > 0;
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
              {/* Tooltip on hover */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 px-2 py-1 rounded bg-slate-900 text-[10px] font-bold text-white shadow pointer-events-none whitespace-nowrap z-10">
                {formatRupiah(item.amount)}
              </div>

              <div className="w-full max-w-[36px] bg-slate-100 rounded-t-lg relative overflow-hidden h-full flex items-end">
                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full rounded-t-lg transition-all duration-500 ${
                    isMax
                      ? 'bg-gradient-to-t from-[#b92b10] to-[#ea580c]'
                      : 'bg-gradient-to-t from-slate-300 to-[#b92b10]/80 group-hover:from-[#b92b10] group-hover:to-[#ea580c]'
                  }`}
                ></div>
              </div>
              <span className="text-[11px] font-medium text-slate-500">{item.day}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 pt-3">
        <span>
          Rata-rata Harian:{' '}
          <strong className="text-slate-900 font-semibold">{formatRupiah(avgDaily)}</strong>
        </span>
        <span>
          Puncak:{' '}
          <strong className="text-emerald-600 font-semibold">{formatRupiah(peakAmount)}</strong>
        </span>
      </div>
    </div>
  );
};
