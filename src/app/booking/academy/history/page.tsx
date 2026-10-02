'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  Search, 
  Printer, 
  Trash2, 
  Calendar, 
  Award, 
  CheckCircle2, 
  AlertCircle,
  Filter,
  Plus,
  Pencil
} from 'lucide-react';
import { fetchAcademyTransactions, deleteAcademyTransaction } from '@/lib/db/academy';
import { AcademyTransaction, AcademyProgram } from '@/types/academy';
import { AcademyReceiptModal } from '@/components/academy/AcademyReceiptModal';
import { AcademySettlementModal } from '@/components/academy/AcademySettlementModal';
import { EditAcademyModal } from '@/components/academy/EditAcademyModal';
import { formatRupiah, formatDate } from '@/lib/utils';
import { useToastStore } from '@/lib/store/useToastStore';

export default function AcademyHistoryPage() {
  const router = useRouter();
  const { showToast } = useToastStore();
  const [transactions, setTransactions] = useState<AcademyTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleBack = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('from') === 'laporan' || document.referrer.includes('/laporan')) {
        router.push('/laporan?unit=academy');
        return;
      }
      if (window.history.length > 1) {
        router.back();
        return;
      }
    }
    router.push('/laporan?unit=academy');
  };

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<'ALL' | AcademyProgram>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'LUNAS' | 'DP_PAID'>('ALL');

  // Settlement Modal (Lunasi)
  const [settleTarget, setSettleTarget] = useState<AcademyTransaction | null>(null);

  // Edit Transaction Modal
  const [editingTransaction, setEditingTransaction] = useState<AcademyTransaction | null>(null);

  // Receipt Modal
  const [activeReceipt, setActiveReceipt] = useState<AcademyTransaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAcademyTransactions();
      setTransactions(data);
    } catch (err) {
      console.error('Error fetching academy transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (item: AcademyTransaction) => {
    if (!confirm(`Yakin ingin menghapus data pembayaran ${item.customerName} (${item.receiptNumber})?`)) {
      return;
    }

    try {
      await deleteAcademyTransaction(item.id);
      setTransactions((prev) => prev.filter((t) => t.id !== item.id));
      showToast('Data pembayaran akademi berhasil dihapus');
    } catch (err) {
      console.error(err);
      showToast('Gagal menghapus data');
    }
  };

  // Filtered List
  const filteredList = useMemo(() => {
    return transactions.filter((t) => {
      if (selectedProgram !== 'ALL' && t.program !== selectedProgram) {
        return false;
      }
      if (selectedStatus !== 'ALL' && t.status !== selectedStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = 
          t.customerName.toLowerCase().includes(q) ||
          t.receiptNumber.toLowerCase().includes(q) ||
          (t.cashierName && t.cashierName.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [transactions, selectedProgram, selectedStatus, searchQuery]);

  // Aggregate stats
  const totalIncome = useMemo(() => {
    return filteredList.reduce((acc, curr) => acc + curr.dpAmount + (curr.settlementAmount || 0), 0);
  }, [filteredList]);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-3.5 sm:p-5 lg:p-6 pb-24 max-w-2xl mx-auto space-y-4">
      
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>

        <Link
          href="/booking/academy"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors shadow-sm shadow-emerald-700/20"
        >
          <Plus className="w-4 h-4" />
          <span>Input Siswa Baru</span>
        </Link>
      </div>

      {/* Title Card */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-1">
        <div className="flex items-center gap-2 text-indigo-700">
          <Award className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Log Riwayat Pembayaran</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Riwayat Nota Sinyo Academy
        </h1>
        <p className="text-xs text-slate-500">
          Daftar seluruh transaksi pendaftaran, DP, dan pelunasan siswa pelatihan.
        </p>

        {/* Total Summary */}
        <div className="pt-3 flex items-center justify-between border-t border-slate-100 mt-2">
          <span className="text-xs font-bold text-slate-500">Total Pembayaran Terkumpul:</span>
          <span className="text-base font-black text-emerald-700">
            {formatRupiah(totalIncome)}
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama peserta, nomor nota, atau kasir..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-bold shrink-0 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Program:
          </span>
          <button
            type="button"
            onClick={() => setSelectedProgram('ALL')}
            className={`px-3 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedProgram === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setSelectedProgram('BADMINTON')}
            className={`px-3 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedProgram === 'BADMINTON'
                ? 'bg-[#c5221f] text-white'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            Badminton
          </button>
          <button
            type="button"
            onClick={() => setSelectedProgram('PICKLEBALL')}
            className={`px-3 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedProgram === 'PICKLEBALL'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Pickleball
          </button>

          <span className="text-slate-300 mx-1">|</span>

          <span className="text-slate-400 font-bold shrink-0">Status:</span>
          <button
            type="button"
            onClick={() => setSelectedStatus('ALL')}
            className={`px-3 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedStatus === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus('LUNAS')}
            className={`px-3 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedStatus === 'LUNAS'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Lunas
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus('DP_PAID')}
            className={`px-3 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedStatus === 'DP_PAID'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            DP (Belum Lunas)
          </button>
        </div>
      </div>

      {/* List Transaksi */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center text-xs text-slate-400 font-medium">
            Memuat data transaksi...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-2">
            <p className="text-xs text-slate-400">Tidak ada transaksi ditemukan.</p>
            <Link
              href="/booking/academy"
              className="inline-block text-xs font-bold text-emerald-700 hover:underline"
            >
              + Input Siswa Baru Sekarang
            </Link>
          </div>
        ) : (
          filteredList.map((item) => {
            const isLunas = item.status === 'LUNAS' || item.remainingAmount === 0;
            const isBadminton = item.program === 'BADMINTON';
            const hasSettlement = Boolean(item.settledAt);

            return (
              <div
                key={item.id}
                className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-slate-900 text-sm sm:text-base">
                        {item.customerName}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        isBadminton 
                          ? 'bg-red-50 text-red-700 border border-red-200' 
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        {isBadminton ? 'Badminton' : 'Pickleball'}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      {item.receiptNumber} • {formatDate(item.createdAt, false)}
                    </span>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide ${
                    isLunas 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    {isLunas ? 'LUNAS' : 'DP TERBAYAR'}
                  </span>
                </div>

                {/* Detail Baris */}
                <div className="p-3 rounded-2xl bg-slate-50 text-xs text-slate-600 space-y-1">
                  {isBadminton ? (
                    <div className="flex justify-between">
                      <span>Paket:</span>
                      <span className="font-bold text-slate-800">
                        {item.category === 'ANAK' ? 'Anak' : 'Dewasa'} • {item.package} Pertemuan ({item.trainingMonth || '-'})
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <span>Waktu:</span>
                      <span className="font-bold text-slate-800">
                        {item.sessionTime === 'PAGI_SIANG' ? 'Pagi - Siang' : 'Sore - Malam'} ({item.periodStart} s/d {item.periodEnd})
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between pt-1 border-t border-slate-200/60 font-medium">
                    <span>Total Tarif:</span>
                    <span>{formatRupiah(item.feeAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{isLunas && !hasSettlement ? 'Pembayaran' : 'DP'} ({item.paymentMethod}):</span>
                    <span>{formatRupiah(item.dpAmount)}</span>
                  </div>
                  {hasSettlement && (
                    <div className="flex justify-between font-bold text-emerald-700">
                      <span>Pelunasan ({formatDate(item.settledAt!, false)} - {item.settlementPaymentMethod || item.paymentMethod}):</span>
                      <span>{formatRupiah(item.settlementAmount || 0)}</span>
                    </div>
                  )}
                  {!isLunas && (
                    <div className="flex justify-between font-black text-rose-600">
                      <span>Sisa Tagihan:</span>
                      <span>{formatRupiah(item.remainingAmount)}</span>
                    </div>
                  )}
                </div>

                {/* Footer Card Actions */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[11px] text-slate-400">
                    Kasir: <strong className="text-slate-600 font-semibold">{item.cashierName}</strong>
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Tombol Edit */}
                    <button
                      type="button"
                      onClick={() => setEditingTransaction(item)}
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold flex items-center gap-1 transition-colors cursor-pointer border border-indigo-200"
                      title="Edit Transaksi"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    {/* Tombol Lunasi jika masih DP */}
                    {!isLunas && (
                      <button
                        type="button"
                        onClick={() => setSettleTarget(item)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Lunasi</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setActiveReceipt(item);
                        setIsReceiptOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Nota</span>
                    </button>

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

      {/* Modal Pelunasan */}
      <AcademySettlementModal
        isOpen={Boolean(settleTarget)}
        transaction={settleTarget}
        onClose={() => setSettleTarget(null)}
        onSuccess={(updated) => {
          loadData();
          setActiveReceipt(updated);
          setIsReceiptOpen(true);
        }}
      />

      {/* Modal Edit Transaksi */}
      <EditAcademyModal
        isOpen={Boolean(editingTransaction)}
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onSuccess={() => {
          loadData();
          setEditingTransaction(null);
        }}
      />

      {/* Modal Nota */}
      <AcademyReceiptModal
        isOpen={isReceiptOpen}
        transaction={activeReceipt}
        onClose={() => setIsReceiptOpen(false)}
      />
    </div>
  );
}
