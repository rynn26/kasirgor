'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  ChevronRight, 
  Printer, 
  Plus, 
  Search, 
  Receipt,
  X,
  QrCode,
  Banknote
} from 'lucide-react';
import { fetchOpenMabarTransactions } from '@/lib/db/mabar';
import { OpenMabarTransaction, MabarSportType } from '@/types/academy';
import { OpenMabarReceiptModal } from '@/components/mabar/OpenMabarReceiptModal';
import { formatRupiah, formatDate } from '@/lib/utils';

interface OpenMabarReportSectionProps {
  dateRange: { start: string; end: string; label: string };
  isOwner?: boolean;
}

export const OpenMabarReportSection: React.FC<OpenMabarReportSectionProps> = ({
  dateRange,
  isOwner = true,
}) => {
  const [transactions, setTransactions] = useState<OpenMabarTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSport, setFilterSport] = useState<'ALL' | MabarSportType>('ALL');
  const [selectedMethodFilter, setSelectedMethodFilter] = useState<'ALL' | 'QRIS' | 'CASH'>('ALL');

  // Detail Modal for Payment Method (QRIS / Cash)
  const [detailModalMethod, setDetailModalMethod] = useState<'QRIS' | 'CASH' | null>(null);
  const [modalSearch, setModalSearch] = useState('');

  // Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState<OpenMabarTransaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetchOpenMabarTransactions().then((data) => {
      if (isMounted) {
        setTransactions(data);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter by date range (item.date or item.createdAt)
  const dateFiltered = useMemo(() => {
    const { start, end } = dateRange;
    return transactions.filter((item) => {
      const itemDate = item.date || item.createdAt.slice(0, 10);
      return itemDate >= start && itemDate <= end;
    });
  }, [transactions, dateRange]);

  // Aggregated KPIs
  const totalOmset = useMemo(() => {
    return dateFiltered.reduce((sum, item) => sum + item.totalAmount, 0);
  }, [dateFiltered]);

  const totalCash = useMemo(() => {
    return dateFiltered.reduce((sum, item) => sum + item.nominalCash, 0);
  }, [dateFiltered]);

  const totalQris = useMemo(() => {
    return dateFiltered.reduce((sum, item) => sum + item.nominalQris, 0);
  }, [dateFiltered]);

  const qrisPercent = totalOmset > 0 ? Math.round((totalQris / totalOmset) * 100) : 0;
  const cashPercent = totalOmset > 0 ? Math.round((totalCash / totalOmset) * 100) : 0;

  // Donut chart calculations
  const C = 238.76;
  const qrisStroke = `${(qrisPercent / 100) * C} ${C}`;
  const cashStroke = `${(cashPercent / 100) * C} ${C}`;
  const cashOffset = -((qrisPercent / 100) * C);

  // Filter list with search, sport, and method
  const displayList = useMemo(() => {
    return dateFiltered.filter((item) => {
      if (filterSport !== 'ALL' && item.sportType !== filterSport) return false;
      if (selectedMethodFilter === 'QRIS' && item.nominalQris <= 0) return false;
      if (selectedMethodFilter === 'CASH' && item.nominalCash <= 0) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          item.receiptNumber.toLowerCase().includes(q) ||
          item.date.includes(q) ||
          (item.cashierName && item.cashierName.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [dateFiltered, filterSport, selectedMethodFilter, searchQuery]);

  // Modal transactions filtered for the active method
  const modalTransactions = useMemo(() => {
    if (!detailModalMethod) return [];
    return dateFiltered.filter((item) => {
      const hasMethod = detailModalMethod === 'QRIS' ? item.nominalQris > 0 : item.nominalCash > 0;
      if (!hasMethod) return false;
      if (modalSearch.trim()) {
        const q = modalSearch.toLowerCase();
        return (
          item.receiptNumber.toLowerCase().includes(q) ||
          item.date.includes(q) ||
          (item.cashierName && item.cashierName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [dateFiltered, detailModalMethod, modalSearch]);

  const modalTotal = detailModalMethod === 'QRIS' ? totalQris : totalCash;

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      
      {/* 1. HERO CARD: TOTAL PENDAPATAN (Sesuai Desain Kasir GOR) */}
      <div className="w-full rounded-[24px] p-5 text-white shadow-md space-y-2 relative overflow-hidden bg-gradient-to-tr from-emerald-700 to-teal-800 shadow-emerald-700/20">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none blur-xl" />
        
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/80 block">
            Total Pendapatan Open Mabar
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-white text-[10px] font-bold">
            {dateRange.label}
          </span>
        </div>

        <div className="text-[30px] sm:text-[34px] font-black tracking-tight leading-none text-white pt-1">
          {formatRupiah(totalOmset)}
        </div>

        <div className="pt-0.5 flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-black/20 text-[#4ade80] text-xs font-bold inline-flex items-center gap-1">
            <span>✓</span> {dateFiltered.length} Sesi Mabar Tercatat
          </span>
        </div>
      </div>

      {/* 2. KARTU METODE PEMBAYARAN DENGAN DONUT CHART (Persis Tampilan Screenshot) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Metode Pembayaran Open Mabar
          </h3>
          {selectedMethodFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedMethodFilter('ALL')}
              className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Layout Donut Chart di kiri & Kartu QRIS / Cash di kanan */}
        <div className="grid grid-cols-2 items-center gap-4 pt-1">
          {/* Donut SVG */}
          <div className="flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
              {/* Background Ring */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#e2e8f0"
                strokeWidth="15"
              />
              {/* QRIS Segment */}
              {totalOmset > 0 && qrisPercent > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#059669"
                  strokeWidth="15"
                  strokeDasharray={qrisStroke}
                  strokeDashoffset={0}
                  className="transition-all duration-500 cursor-pointer hover:opacity-80"
                  onClick={() => setDetailModalMethod('QRIS')}
                />
              )}
              {/* Cash Segment */}
              {totalOmset > 0 && cashPercent > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#f59e0b"
                  strokeWidth="15"
                  strokeDasharray={cashStroke}
                  strokeDashoffset={cashOffset}
                  className="transition-all duration-500 cursor-pointer hover:opacity-80"
                  onClick={() => setDetailModalMethod('CASH')}
                />
              )}
            </svg>
          </div>

          {/* List Buttons QRIS & Cash */}
          <div className="space-y-2 text-xs font-semibold">
            {/* QRIS Button Card */}
            <button
              type="button"
              onClick={() => setDetailModalMethod('QRIS')}
              className="w-full text-left space-y-1 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/90 active:scale-[0.98] border border-slate-200/90 hover:border-slate-300 shadow-2xs transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-[#059669]" />
                  <span className="text-slate-800 font-bold group-hover:text-slate-950 transition-colors">
                    QRIS
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-black text-slate-900">{qrisPercent}%</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
                </div>
              </div>
              <div className="text-[11px] font-black pl-4 flex items-center justify-between text-emerald-700">
                <span>{formatRupiah(totalQris)}</span>
                <span className="text-[10px] font-semibold text-slate-400 group-hover:underline">
                  Lihat Rincian ›
                </span>
              </div>
            </button>

            {/* Cash (Tunai) Button Card */}
            <button
              type="button"
              onClick={() => setDetailModalMethod('CASH')}
              className="w-full text-left space-y-1 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/90 active:scale-[0.98] border border-slate-200/90 hover:border-slate-300 shadow-2xs transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-[#f59e0b]" />
                  <span className="text-slate-800 font-bold group-hover:text-slate-950 transition-colors">
                    Cash (Tunai)
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-black text-slate-900">{cashPercent}%</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
                </div>
              </div>
              <div className="text-[11px] font-black pl-4 flex items-center justify-between text-emerald-700">
                <span>{formatRupiah(totalCash)}</span>
                <span className="text-[10px] font-semibold text-slate-400 group-hover:underline">
                  Lihat Rincian ›
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 3. QUICK LINK KE RIWAYAT & INPUT BARU */}
      <div className="grid grid-cols-2 gap-2.5">
        <Link
          href="/booking/mabar/history?from=laporan"
          className="w-full py-3 px-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-between shadow-2xs transition-all group cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <Receipt className="w-4 h-4" />
            </div>
            <span>Riwayat Nota</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
        </Link>

        <Link
          href="/booking/mabar?from=laporan"
          className="w-full py-3 px-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-between shadow-sm shadow-emerald-700/20 transition-all group cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-white/20 text-white">
              <Plus className="w-4 h-4" />
            </div>
            <span>Input Mabar</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-white/70 group-hover:text-white" />
        </Link>
      </div>

      {/* 4. DAFTAR RINCIAN TRANSAKSI MABAR */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setFilterSport('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterSport === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({dateFiltered.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterSport('BADMINTON')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterSport === 'BADMINTON'
                  ? 'bg-[#c5221f] text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Badminton
            </button>
            <button
              type="button"
              onClick={() => setFilterSport('PICKLEBALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterSport === 'PICKLEBALL'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Pickleball
            </button>
          </div>

          <div className="relative min-w-[180px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari sesi mabar / nota..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="space-y-2 pt-1">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400 font-medium">
              Memuat data...
            </div>
          ) : displayList.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Tidak ada data pemasukan mabar pada filter ini.
            </div>
          ) : (
            displayList.map((item) => {
              const isBadminton = item.sportType === 'BADMINTON';

              return (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-between gap-3 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                        Open Mabar {item.sportType}
                      </h4>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                        isBadminton ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'
                      }`}>
                        {isBadminton ? 'Badminton' : 'Pickleball'}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-500 mt-0.5">
                      <span>{formatDate(item.date, false)}</span>
                      <span className="mx-1">•</span>
                      <span>Cash: {formatRupiah(item.nominalCash)}</span>
                      <span className="mx-1">•</span>
                      <span>QRIS: {formatRupiah(item.nominalQris)}</span>
                      <span className="mx-1">•</span>
                      <span>Kasir: {item.cashierName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-black text-emerald-700 block">
                      {formatRupiah(item.totalAmount)}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReceipt(item);
                        setIsReceiptOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs cursor-pointer"
                      title="Lihat Struk"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL RINCIAN METODE PEMBAYARAN (QRIS / CASH) */}
      {detailModalMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header Modal */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  detailModalMethod === 'QRIS' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  {detailModalMethod === 'QRIS' ? <QrCode className="w-5 h-5" /> : <Banknote className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base leading-tight">
                    Rincian Pembayaran {detailModalMethod === 'QRIS' ? 'QRIS' : 'Cash (Tunai)'}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                    Open Mabar • {dateRange.label}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDetailModalMethod(null);
                  setModalSearch('');
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Total Ringkasan Banner */}
            <div className="p-4 sm:px-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Terkumpul ({detailModalMethod})
                </span>
                <span className="text-xl font-black text-emerald-700">
                  {formatRupiah(modalTotal)}
                </span>
              </div>
              <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
                {modalTransactions.length} Sesi
              </span>
            </div>

            {/* Search Bar */}
            <div className="p-4 sm:px-5 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari sesi atau nomor nota..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-100 border border-transparent rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* List Transaksi */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1">
              {modalTransactions.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  Tidak ada sesi mabar dengan metode {detailModalMethod} yang ditemukan.
                </div>
              ) : (
                modalTransactions.map((tx) => {
                  const nominal = detailModalMethod === 'QRIS' ? tx.nominalQris : tx.nominalCash;
                  return (
                    <div
                      key={tx.id}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs text-slate-900">
                            Open Mabar {tx.sportType}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {formatDate(tx.date, false)}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                          <span>Nota: {tx.receiptNumber}</span>
                          <span>•</span>
                          <span>Kasir: {tx.cashierName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-xs font-black text-emerald-700 block">
                            {formatRupiah(nominal)}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            Total: {formatRupiah(tx.totalAmount)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReceipt(tx);
                            setIsReceiptOpen(true);
                          }}
                          className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                          title="Cetak Struk"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setDetailModalMethod(null);
                  setModalSearch('');
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Struk */}
      <OpenMabarReceiptModal
        isOpen={isReceiptOpen}
        transaction={selectedReceipt}
        onClose={() => setIsReceiptOpen(false)}
      />
    </div>
  );
};
