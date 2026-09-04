'use client';

import React, { useState } from 'react';
import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { formatDate, formatRupiah } from '@/lib/utils';
import { Transaction } from '@/types/pos';
import { TransactionDetailModal } from '@/components/pos/TransactionDetailModal';
import { Receipt, ArrowUpRight, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const RecentTransactionsTable: React.FC = () => {
  const { transactions, loadTransactions } = useTransactionStore();
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const recentList = transactions.slice(0, 4);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Transaksi Kasir Terkini</h3>
          <p className="text-xs text-slate-500 mt-0.5">Daftar penjualan produk terbaru yang selesai diproses</p>
        </div>
        <Link
          href="/history"
          className="text-xs font-bold text-[#b92b10] hover:underline flex items-center gap-1"
        >
          <span>Lihat Semua</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Responsive Cards (No Horizontal Scroll) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {recentList.map((tx) => (
          <div
            key={tx.id}
            onClick={() => setSelectedTx(tx)}
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 transition-all flex items-center justify-between gap-3 cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-[#b92b10] border border-red-100 flex items-center justify-center shrink-0">
                <Receipt className="w-5 h-5" />
              </div>

              <div className="min-w-0">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate group-hover:text-[#b92b10] transition-colors">
                  {tx.items && tx.items.length > 0
                    ? tx.items.map((i) => `${i.product.name} (${i.quantity}x)`).join(', ')
                    : (tx.customerName || 'Pelanggan Umum')}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {formatDate(tx.createdAt, true)}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs sm:text-sm font-black text-slate-900 block">
                {formatRupiah(tx.grandTotal)}
              </span>
              <span className="text-[10px] font-bold text-[#b92b10] uppercase">
                {tx.paymentMethod}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Transaction Detail, Edit & Void Modal */}
      <TransactionDetailModal
        isOpen={Boolean(selectedTx)}
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
        onUpdated={() => loadTransactions()}
      />
    </div>
  );
};
