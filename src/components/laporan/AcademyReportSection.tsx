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
  Banknote,
  CheckCircle2
} from 'lucide-react';
import { fetchAcademyTransactions } from '@/lib/db/academy';
import { AcademyTransaction, AcademyProgram } from '@/types/academy';
import { AcademyReceiptModal } from '@/components/academy/AcademyReceiptModal';
import { AcademySettlementModal } from '@/components/academy/AcademySettlementModal';
import { formatRupiah, formatDate } from '@/lib/utils';
import { toJakartaDateString } from '@/lib/bookingUtils';

interface AcademyReportSectionProps {
  dateRange: { start: string; end: string; label: string };
  isOwner?: boolean;
}

interface AcademyPaymentItem {
  id: string; // unique item id
  transaction: AcademyTransaction;
  type: 'DP' | 'PELUNASAN' | 'LUNAS_LANGSUNG';
  amount: number;
  method: 'QRIS' | 'CASH';
  date: string; // YYYY-MM-DD
  timeStr?: string;
}

export const AcademyReportSection: React.FC<AcademyReportSectionProps> = ({
  dateRange,
  isOwner = true,
}) => {
  const [transactions, setTransactions] = useState<AcademyTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProgram, setFilterProgram] = useState<'ALL' | AcademyProgram>('ALL');
  const [selectedMethodFilter, setSelectedMethodFilter] = useState<'ALL' | 'QRIS' | 'CASH'>('ALL');

  // Detail Modal for Payment Method (QRIS / Cash)
  const [detailModalMethod, setDetailModalMethod] = useState<'QRIS' | 'CASH' | null>(null);
  const [modalSearch, setModalSearch] = useState('');

  // Settlement Modal (Lunasi)
  const [settleTarget, setSettleTarget] = useState<AcademyTransaction | null>(null);

  // Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState<AcademyTransaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const loadData = () => {
    setIsLoading(true);
    fetchAcademyTransactions().then((data) => {
      setTransactions(data);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Split transactions into individual cashflow payments (DP & Pelunasan) within [start, end]
  const paymentItemsInPeriod = useMemo(() => {
    const { start, end } = dateRange;
    const items: AcademyPaymentItem[] = [];

    transactions.forEach((tx) => {
      const dpDate = toJakartaDateString(tx.createdAt);
      const isDpInPeriod = dpDate >= start && dpDate <= end;

      // 1. Porsi DP (atau bayar lunas langsung saat pendaftaran)
      if (isDpInPeriod && tx.dpAmount > 0) {
        const isDirectLunas = tx.remainingAmount === 0 && !tx.settledAt;
        items.push({
          id: `${tx.id}_dp`,
          transaction: tx,
          type: isDirectLunas ? 'LUNAS_LANGSUNG' : 'DP',
          amount: tx.dpAmount,
          method: tx.paymentMethod,
          date: dpDate,
        });
      }

      // 2. Porsi Pelunasan (jika ada dan tanggal pelunasan masuk rentang periode)
      if (tx.settledAt && (tx.settlementAmount || 0) > 0) {
        const settleDate = toJakartaDateString(tx.settledAt);
        if (settleDate >= start && settleDate <= end) {
          items.push({
            id: `${tx.id}_settle`,
            transaction: tx,
            type: 'PELUNASAN',
            amount: tx.settlementAmount || 0,
            method: tx.settlementPaymentMethod || tx.paymentMethod,
            date: settleDate,
          });
        }
      }
    });

    return items;
  }, [transactions, dateRange]);

  // Aggregated KPIs
  const totalOmset = useMemo(() => {
    return paymentItemsInPeriod.reduce((sum, item) => sum + item.amount, 0);
  }, [paymentItemsInPeriod]);

  const qrisAmount = useMemo(() => {
    return paymentItemsInPeriod
      .filter((i) => i.method === 'QRIS')
      .reduce((sum, item) => sum + item.amount, 0);
  }, [paymentItemsInPeriod]);

  const cashAmount = useMemo(() => {
    return paymentItemsInPeriod
      .filter((i) => i.method === 'CASH')
      .reduce((sum, item) => sum + item.amount, 0);
  }, [paymentItemsInPeriod]);

  const qrisPercent = totalOmset > 0 ? Math.round((qrisAmount / totalOmset) * 100) : 0;
  const cashPercent = totalOmset > 0 ? Math.round((cashAmount / totalOmset) * 100) : 0;

  // Donut chart calculations (C = 2 * PI * 38 = 238.76)
  const C = 238.76;
  const qrisStroke = `${(qrisPercent / 100) * C} ${C}`;
  const cashStroke = `${(cashPercent / 100) * C} ${C}`;
  const cashOffset = -((qrisPercent / 100) * C);

  // List of transactions for this period (either registered in period or settled in period)
  const relevantTransactions = useMemo(() => {
    const { start, end } = dateRange;
    return transactions.filter((item) => {
      const dpDate = item.createdAt.slice(0, 10);
      const isDp = dpDate >= start && dpDate <= end;
      const isSettle = item.settledAt && item.settledAt.slice(0, 10) >= start && item.settledAt.slice(0, 10) <= end;
      return isDp || isSettle;
    });
  }, [transactions, dateRange]);

  // Filter list with search, program, and method
  const displayList = useMemo(() => {
    return relevantTransactions.filter((item) => {
      if (filterProgram !== 'ALL' && item.program !== filterProgram) return false;
      if (selectedMethodFilter !== 'ALL') {
        const hasMethod = item.paymentMethod === selectedMethodFilter || item.settlementPaymentMethod === selectedMethodFilter;
        if (!hasMethod) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          item.customerName.toLowerCase().includes(q) ||
          item.receiptNumber.toLowerCase().includes(q) ||
          (item.cashierName && item.cashierName.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [relevantTransactions, filterProgram, selectedMethodFilter, searchQuery]);

  // Transactions filtered for the Payment Detail Modal
  const modalPaymentItems = useMemo(() => {
    if (!detailModalMethod) return [];
    return paymentItemsInPeriod.filter((item) => {
      if (item.method !== detailModalMethod) return false;
      if (modalSearch.trim()) {
        const q = modalSearch.toLowerCase();
        return (
          item.transaction.customerName.toLowerCase().includes(q) ||
          item.transaction.receiptNumber.toLowerCase().includes(q) ||
          (item.transaction.cashierName && item.transaction.cashierName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [paymentItemsInPeriod, detailModalMethod, modalSearch]);

  const modalTotal = detailModalMethod === 'QRIS' ? qrisAmount : cashAmount;

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      
      {/* 1. HERO CARD: TOTAL PENDAPATAN (Sesuai Desain Kasir GOR) */}
      <div className="w-full rounded-[24px] p-5 text-white shadow-md space-y-2 relative overflow-hidden bg-gradient-to-tr from-emerald-700 to-teal-800 shadow-emerald-700/20">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none blur-xl" />
        
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/80 block">
            Total Pendapatan Sinyo Academy
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
            <span>✓</span> {paymentItemsInPeriod.length} Pembayaran ({relevantTransactions.length} Siswa)
          </span>
        </div>
      </div>

      {/* 2. KARTU METODE PEMBAYARAN DENGAN DONUT CHART (Persis Tampilan Screenshot) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Metode Pembayaran Sinyo Academy
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
                <span>{formatRupiah(qrisAmount)}</span>
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
                <span>{formatRupiah(cashAmount)}</span>
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
          href="/booking/academy/history?from=laporan"
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
          href="/booking/academy?from=laporan"
          className="w-full py-3 px-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-between shadow-sm shadow-emerald-700/20 transition-all group cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-white/20 text-white">
              <Plus className="w-4 h-4" />
            </div>
            <span>Input Pendaftaran</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-white/70 group-hover:text-white" />
        </Link>
      </div>

      {/* 4. DAFTAR RINCIAN TRANSAKSI SISWA */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setFilterProgram('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterProgram === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({relevantTransactions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterProgram('BADMINTON')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterProgram === 'BADMINTON'
                  ? 'bg-[#c5221f] text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Badminton
            </button>
            <button
              type="button"
              onClick={() => setFilterProgram('PICKLEBALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterProgram === 'PICKLEBALL'
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
              placeholder="Cari siswa / nota..."
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
              Tidak ada data pembayaran akademi pada filter ini.
            </div>
          ) : (
            displayList.map((item) => {
              const isLunas = item.status === 'LUNAS' || item.remainingAmount === 0;
              const isBadminton = item.program === 'BADMINTON';
              const hasSettlement = Boolean(item.settledAt);

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                        {item.customerName}
                      </h4>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                        isBadminton ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'
                      }`}>
                        {isBadminton ? 'Badminton' : 'Pickleball'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        isLunas ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isLunas ? 'Lunas' : 'DP (Belum Lunas)'}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>DP: {formatDate(item.createdAt, false)} ({item.paymentMethod})</span>
                        {hasSettlement && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold">
                              Lunas: {formatDate(item.settledAt!, false)} ({item.settlementPaymentMethod || item.paymentMethod})
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span>Kasir: {item.cashierName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                    <div className="text-left sm:text-right">
                      <span className="text-xs font-black text-emerald-700 block">
                        Total Bayar: {formatRupiah(item.dpAmount + (item.settlementAmount || 0))}
                      </span>
                      {!isLunas && (
                        <span className="text-[10px] text-rose-600 block font-bold">
                          Sisa: {formatRupiah(item.remainingAmount)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Tombol Lunasi jika masih DP */}
                      {!isLunas && (
                        <button
                          type="button"
                          onClick={() => setSettleTarget(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                          title="Lunasi Sisa Pembayaran"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Lunasi</span>
                        </button>
                      )}

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
                    Sinyo Academy • {dateRange.label}
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
                {modalPaymentItems.length} Pembayaran
              </span>
            </div>

            {/* Search Bar */}
            <div className="p-4 sm:px-5 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari siswa atau nomor nota..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-100 border border-transparent rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* List Transaksi */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1">
              {modalPaymentItems.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  Tidak ada transaksi {detailModalMethod} yang ditemukan untuk periode ini.
                </div>
              ) : (
                modalPaymentItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-slate-900">{item.transaction.customerName}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          item.type === 'PELUNASAN' 
                            ? 'bg-emerald-100 text-emerald-800 font-black' 
                            : item.type === 'LUNAS_LANGSUNG' 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {item.type === 'PELUNASAN' ? 'Pelunasan' : item.type === 'LUNAS_LANGSUNG' ? 'Lunas Langsung' : 'DP Pendaftaran'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                        <span>Nota: {item.transaction.receiptNumber}</span>
                        <span>•</span>
                        <span>{formatDate(item.date, false)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs font-black text-emerald-700 block">
                          {formatRupiah(item.amount)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {item.method}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReceipt(item.transaction);
                          setIsReceiptOpen(true);
                        }}
                        className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                        title="Cetak Struk"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
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

      {/* Modal Pelunasan (Lunasi) */}
      <AcademySettlementModal
        isOpen={Boolean(settleTarget)}
        transaction={settleTarget}
        onClose={() => setSettleTarget(null)}
        onSuccess={(updated) => {
          loadData();
          setSelectedReceipt(updated);
          setIsReceiptOpen(true);
        }}
      />

      {/* Modal Struk */}
      <AcademyReceiptModal
        isOpen={isReceiptOpen}
        transaction={selectedReceipt}
        onClose={() => setIsReceiptOpen(false)}
      />
    </div>
  );
};
