'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { useAppDateStore } from '@/lib/store/useAppDateStore';
import { formatDate, formatRupiah } from '@/lib/utils';
import { Transaction } from '@/types/pos';
import { TransactionDetailModal } from '@/components/pos/TransactionDetailModal';
import {
  ArrowLeft,
  Search,
  Receipt,
  History as HistoryIcon,
  ChevronRight,
  Calendar,
  X,
} from 'lucide-react';

function formatShortDate(dateStr: string): string {
  if (!dateStr) return 'Pilih Tanggal';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    const date = new Date(y, m - 1, d);
    return `${d} ${date.toLocaleString('id-ID', { month: 'short' })} ${y}`;
  } catch {
    return dateStr;
  }
}

export default function HistoryPage() {
  const router = useRouter();
  const { transactions, loadTransactions } = useTransactionStore();
  const {
    selectedDate: globalSelectedDate,
    isCustomActive,
    setSelectedDate: setGlobalDate,
    resetToToday,
  } = useAppDateStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTransactions();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const m = params.get('method');
      if (m === 'CASH' || m === 'QRIS') {
        setMethodFilter(m);
      }
      const d = params.get('date');
      if (d) {
        setSelectedDate(d);
        setGlobalDate(d);
      } else if (isCustomActive && globalSelectedDate) {
        setSelectedDate(globalSelectedDate);
      }
    }
  }, [loadTransactions, isCustomActive, globalSelectedDate, setGlobalDate]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    if (newDate) {
      setGlobalDate(newDate);
    }
  };

  const handleClearDate = () => {
    setSelectedDate('');
  };

  const filtered = transactions.filter((tx) => {
    const matchSearch =
      tx.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.customerName && tx.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.tableOrCourtNumber && tx.tableOrCourtNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      tx.items.some((item) => item.product.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchMethod = methodFilter === 'ALL' || tx.paymentMethod === methodFilter;
    const matchDate = !selectedDate || tx.createdAt.startsWith(selectedDate);

    return matchSearch && matchMethod && matchDate;
  });

  return (
    <div className="min-h-full bg-[#f8fafc] p-3.5 sm:p-6 max-w-lg mx-auto space-y-4 pb-24">
      {/* ============================================================ */}
      {/* HEADER: ← Riwayat Transaksi */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 hover:text-[#b92b10] border border-slate-200 shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
              Riwayat Transaksi
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Klik nota untuk melihat rincian, edit, atau batalkan transaksi
            </p>
          </div>
        </div>

        <div className="px-3 py-1 rounded-full bg-red-50 border border-red-100 text-[#b92b10] text-xs font-black shrink-0">
          {filtered.length} Nota
        </div>
      </div>

      {/* ============================================================ */}
      {/* SEARCH & FILTER CONTROLS */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-3">
        {/* Search & Date Picker Row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nota, nama produk (misal: Indomie, Kopi)..."
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#b92b10] focus:bg-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Date Picker Pill */}
          <div className="relative shrink-0">
            <input
              ref={dateInputRef}
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              onClick={(e) => {
                try {
                  (e.currentTarget as HTMLInputElement).showPicker?.();
                } catch {}
              }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
              title={selectedDate ? `Tanggal: ${selectedDate}` : 'Filter Tanggal'}
            />
            <div
              className={`p-2.5 sm:px-3 py-2.5 rounded-2xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                selectedDate
                  ? 'bg-[#b92b10] text-white border-[#b92b10] shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0" />
              {selectedDate ? (
                <span className="text-[11px] font-semibold whitespace-nowrap">
                  {formatShortDate(selectedDate)}
                </span>
              ) : (
                <span className="text-[11px] hidden sm:inline text-slate-600 font-medium">Tanggal</span>
              )}
            </div>
          </div>

          {selectedDate && (
            <button
              type="button"
              onClick={handleClearDate}
              title="Hapus Filter Tanggal"
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Date Filter Active Indicator */}
        {selectedDate && (
          <div className="flex items-center justify-between px-1 text-xs pt-0.5">
            <span className="text-slate-500 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#b92b10] animate-pulse" />
              Tanggal: <strong className="text-slate-900 font-bold">{formatDate(selectedDate)}</strong>
            </span>
            <button
              type="button"
              onClick={handleClearDate}
              className="text-[11px] font-bold text-[#b92b10] hover:underline cursor-pointer"
            >
              Semua Tanggal
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          {[
            { id: 'ALL', label: 'Semua Metode' },
            { id: 'CASH', label: 'Tunai (Cash)' },
            { id: 'QRIS', label: 'QRIS' },
          ].map((tab) => {
            const isSelected = methodFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMethodFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#b92b10] text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* TRANSACTION LIST CARDS */}
      {/* ============================================================ */}
      <div className="space-y-2.5">
        {filtered.length > 0 ? (
          filtered.map((tx) => {
            const isCancelled = tx.status === 'CANCELLED';
            const itemSummary = tx.items && tx.items.length > 0
              ? tx.items.map((i) => `${i.product.name} (${i.quantity})`).join(', ')
              : 'Transaksi Kasir';

            return (
              <div
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className={`p-4 rounded-3xl bg-white hover:bg-slate-50 border transition-all flex items-center justify-between gap-3 cursor-pointer shadow-xs group ${
                  isCancelled
                    ? 'border-red-200/80 bg-red-50/20 opacity-80'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  {/* Badge Icon */}
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                    isCancelled
                      ? 'bg-red-50 text-red-500 border-red-200'
                      : 'bg-red-50 text-[#b92b10] border-red-100'
                  }`}>
                    <Receipt className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className={`font-bold text-sm sm:text-base truncate group-hover:text-[#b92b10] transition-colors ${
                        isCancelled ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}>
                        {itemSummary}
                      </h4>
                      {isCancelled && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-red-100 text-red-600">
                          VOID
                        </span>
                      )}
                    </div>
                    <p suppressHydrationWarning className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                      {isMounted ? formatDate(tx.createdAt, true) : '01 Sep 2026, 02:03:58'}
                      {tx.customerName ? ` • ${tx.customerName}` : ''}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center space-x-2">
                  <div>
                    <div className={`text-xs sm:text-sm font-black ${
                      isCancelled ? 'line-through text-slate-400' : 'text-slate-900'
                    }`}>
                      {formatRupiah(tx.grandTotal)}
                    </div>
                    <span className="text-[10px] font-bold text-[#b92b10] uppercase">
                      {tx.paymentMethod === 'CASH' ? 'Tunai' : tx.paymentMethod}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-2">
            <HistoryIcon className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-bold text-sm text-slate-800">Tidak Ada Riwayat Transaksi</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Tidak ditemukan nota transaksi yang sesuai dengan pencarian Anda.
            </p>
          </div>
        )}
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
}

