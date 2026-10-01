'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  Search, 
  Trash2, 
  Calendar, 
  Users2, 
  Banknote,
  QrCode,
  Plus
} from 'lucide-react';
import { fetchOpenMabarTransactions, deleteOpenMabarTransaction } from '@/lib/db/mabar';
import { OpenMabarTransaction, MabarSportType } from '@/types/academy';
import { formatRupiah, formatDate } from '@/lib/utils';
import { useToastStore } from '@/lib/store/useToastStore';

export default function OpenMabarHistoryPage() {
  const router = useRouter();
  const { showToast } = useToastStore();
  const [transactions, setTransactions] = useState<OpenMabarTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleBack = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('from') === 'laporan' || document.referrer.includes('/laporan')) {
        router.push('/laporan?unit=mabar');
        return;
      }
      if (window.history.length > 1) {
        router.back();
        return;
      }
    }
    router.push('/laporan?unit=mabar');
  };

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState<'ALL' | MabarSportType>('ALL');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchOpenMabarTransactions();
      setTransactions(data);
    } catch (err) {
      console.error('Error fetching open mabar transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (item: OpenMabarTransaction) => {
    if (!confirm(`Yakin ingin menghapus data pemasukan mabar ${item.receiptNumber}?`)) {
      return;
    }

    try {
      await deleteOpenMabarTransaction(item.id);
      setTransactions((prev) => prev.filter((t) => t.id !== item.id));
      showToast('Data pemasukan mabar berhasil dihapus');
    } catch (err) {
      console.error(err);
      showToast('Gagal menghapus data');
    }
  };

  // Filtered List
  const filteredList = useMemo(() => {
    return transactions.filter((t) => {
      if (selectedSport !== 'ALL' && t.sportType !== selectedSport) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = 
          t.receiptNumber.toLowerCase().includes(q) ||
          t.date.includes(q) ||
          (t.cashierName && t.cashierName.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [transactions, selectedSport, searchQuery]);

  // Aggregate stats
  const totals = useMemo(() => {
    return filteredList.reduce(
      (acc, curr) => ({
        cash: acc.cash + curr.nominalCash,
        qris: acc.qris + curr.nominalQris,
        total: acc.total + curr.totalAmount,
      }),
      { cash: 0, qris: 0, total: 0 }
    );
  }, [filteredList]);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-3.5 sm:p-5 lg:p-6 pb-24 max-w-2xl mx-auto space-y-4">
      
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 text-slate-700 hover:text-slate-900 font-bold text-base transition-colors cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
            <ChevronLeft className="w-5 h-5" />
          </div>
          <span>Kembali</span>
        </button>

        <Link
          href="/booking/mabar"
          className="px-3 py-1.5 rounded-2xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-sm shadow-pink-600/20"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Input Baru</span>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
            <Banknote className="w-3 h-3 text-emerald-600" />
            <span>Cash</span>
          </div>
          <p className="text-xs sm:text-sm font-black text-slate-900 mt-1">
            {formatRupiah(totals.cash)}
          </p>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
            <QrCode className="w-3 h-3 text-blue-600" />
            <span>QRIS</span>
          </div>
          <p className="text-xs sm:text-sm font-black text-slate-900 mt-1">
            {formatRupiah(totals.qris)}
          </p>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-pink-200 bg-pink-50/30 shadow-xs">
          <div className="text-[11px] text-pink-700 font-bold">
            Total Masuk
          </div>
          <p className="text-xs sm:text-sm font-black text-pink-700 mt-1">
            {formatRupiah(totals.total)}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari tanggal mabar (YYYY-MM-DD)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedSport('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
              selectedSport === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({transactions.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedSport('BADMINTON')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
              selectedSport === 'BADMINTON'
                ? 'bg-[#c5221f] text-white'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            Badminton
          </button>
          <button
            type="button"
            onClick={() => setSelectedSport('PICKLEBALL')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
              selectedSport === 'PICKLEBALL'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Pickleball
          </button>
        </div>
      </div>

      {/* List Transaksi */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm font-medium">
            Memuat riwayat mabar...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 p-6">
            <Users2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Belum ada riwayat open mabar</p>
            <p className="text-xs text-slate-400 mt-1">
              Catat pemasukan mabar melalui form Open Mabar
            </p>
          </div>
        ) : (
          filteredList.map((item) => {
            const isBadminton = item.sportType === 'BADMINTON';

            return (
              <div
                key={item.id}
                className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-slate-900 text-sm sm:text-base">
                        Open Mabar {item.sportType}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        isBadminton 
                          ? 'bg-red-50 text-red-700 border border-red-200' 
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        {isBadminton ? 'Badminton' : 'Pickleball'}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-400">
                      Tanggal: {formatDate(item.date, false)}
                    </span>
                  </div>

                  <span className="text-sm sm:text-base font-black text-emerald-700">
                    {formatRupiah(item.totalAmount)}
                  </span>
                </div>

                {/* Detail Breakdown */}
                <div className="p-3 rounded-2xl bg-slate-50 text-xs text-slate-600 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5 text-slate-500" />
                    <span>Cash: <strong className="text-slate-800">{formatRupiah(item.nominalCash)}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-slate-500" />
                    <span>QRIS: <strong className="text-slate-800">{formatRupiah(item.nominalQris)}</strong></span>
                  </div>
                </div>

                {/* Footer Card Actions */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[11px] text-slate-400">
                    Kasir: <strong className="text-slate-600 font-semibold">{item.cashierName}</strong>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Hapus Transaksi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
