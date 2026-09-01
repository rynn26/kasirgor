'use client';

import React, { useMemo } from 'react';
import { formatRupiah } from '@/lib/utils';
import { Flame } from 'lucide-react';
import { useTransactionStore } from '@/lib/store/useTransactionStore';

export const TopProducts: React.FC = () => {
  const { transactions } = useTransactionStore();

  // Aggregate top products from real transaction data (last 7 days)
  const topProducts = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString().split('T')[0];

    const productMap: Record<
      string,
      { name: string; category: string; sold: number; revenue: number }
    > = {};

    transactions
      .filter((t) => t.status === 'COMPLETED' && t.createdAt >= cutoff)
      .forEach((t) => {
        t.items.forEach((item) => {
          const key = item.product.id || item.product.name;
          if (!productMap[key]) {
            productMap[key] = {
              name: item.product.name,
              category: item.product.category,
              sold: 0,
              revenue: 0,
            };
          }
          productMap[key].sold += item.quantity;
          productMap[key].revenue += item.product.price * item.quantity;
        });
      });

    const sorted = Object.values(productMap).sort((a, b) => b.sold - a.sold);
    const top5 = sorted.slice(0, 5);
    const maxSold = top5[0]?.sold ?? 1;

    return top5.map((p) => ({
      ...p,
      percentage: Math.round((p.sold / maxSold) * 100),
    }));
  }, [transactions]);

  if (topProducts.length === 0) {
    return (
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-[#ea580c]" />
          <h3 className="text-base font-bold text-slate-900">Produk Terlaris</h3>
        </div>
        <p className="text-xs text-slate-400 text-center py-6">
          Belum ada data transaksi untuk ditampilkan.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#ea580c]" />
            <span>Produk Terlaris</span>
          </h3>
          <p className="text-xs text-slate-500">Paling banyak dibeli pelanggan 7 hari terakhir</p>
        </div>
      </div>

      <div className="space-y-3.5">
        {topProducts.map((prod, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                  #{idx + 1}
                </span>
                <span className="font-semibold text-slate-800">{prod.name}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-900">{prod.sold} terjual</span>
                <span className="text-slate-500 ml-2">({formatRupiah(prod.revenue)})</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                style={{ width: `${prod.percentage}%` }}
                className={`h-full rounded-full ${
                  idx === 0
                    ? 'bg-gradient-to-r from-[#b92b10] to-[#ea580c]'
                    : idx === 1
                    ? 'bg-gradient-to-r from-orange-600 to-amber-400'
                    : 'bg-slate-400'
                }`}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
