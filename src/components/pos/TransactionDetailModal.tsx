'use client';

import React, { useState } from 'react';
import { Transaction } from '@/types/pos';
import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { formatRupiah, formatDate } from '@/lib/utils';
import { EditTransactionModal } from './EditTransactionModal';
import {
  X,
  Pencil,
  Trash2,
  Ban,
  Receipt,
  User,
  Clock,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShoppingBag
} from 'lucide-react';

interface TransactionDetailModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  transaction,
  onClose,
  onUpdated,
}) => {
  const { cancelTransaction, deleteTransaction } = useTransactionStore();
  const { showToast } = useToastStore();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentTx, setCurrentTx] = useState<Transaction | null>(transaction);
  const [confirmAction, setConfirmAction] = useState<'CANCEL' | 'DELETE' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  React.useEffect(() => {
    setCurrentTx(transaction);
    setConfirmAction(null);
  }, [transaction, isOpen]);

  if (!isOpen || !currentTx) return null;

  const isCancelled = currentTx.status === 'CANCELLED';

  const handleCancelTx = async () => {
    setIsProcessing(true);
    try {
      await cancelTransaction(currentTx.id);
      showToast('⚠️ Transaksi berhasil dibatalkan (Void)');
      setCurrentTx({ ...currentTx, status: 'CANCELLED' });
      setConfirmAction(null);
      if (onUpdated) onUpdated();
    } catch {
      showToast('Gagal membatalkan transaksi');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteTx = async () => {
    setIsProcessing(true);
    try {
      await deleteTransaction(currentTx.id);
      showToast('🗑️ Transaksi berhasil dihapus permanen');
      setConfirmAction(null);
      onClose();
      if (onUpdated) onUpdated();
    } catch {
      showToast('Gagal menghapus transaksi');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditSuccess = (updated: Transaction) => {
    setCurrentTx(updated);
    if (onUpdated) onUpdated();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 animate-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs ${
                isCancelled
                  ? 'bg-red-100 text-red-600'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-mono font-bold text-slate-900 text-sm sm:text-base leading-tight">
                  {currentTx.invoiceNumber}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {isCancelled ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                      <XCircle className="w-3 h-3" /> Dibatalkan (Void)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="w-3 h-3" /> Sukses / Selesai
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Info */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            
            {/* Meta details */}
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Waktu</span>
                <span className="font-medium text-slate-800">
                  {formatDate(currentTx.createdAt, true)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Kasir</span>
                <span className="font-medium text-slate-800">{currentTx.cashierName || 'Kasir'}</span>
              </div>
              {currentTx.customerName && (
                <div className="col-span-2 pt-1 border-t border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Pelanggan</span>
                  <span className="font-bold text-slate-800">{currentTx.customerName}</span>
                </div>
              )}
            </div>

            {/* Item List */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                Rincian Item ({currentTx.items.length})
              </label>

              <div className="space-y-1.5 divide-y divide-slate-100">
                {currentTx.items.map((item, idx) => (
                  <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <p className={`font-bold truncate ${isCancelled ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {item.product.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {item.quantity} × {formatRupiah(item.product.price)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`font-black ${isCancelled ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {formatRupiah(item.product.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Payment Box */}
            <div className={`p-3.5 rounded-2xl text-white flex items-center justify-between ${
              isCancelled ? 'bg-slate-700' : 'bg-gradient-to-br from-slate-900 to-slate-800'
            }`}>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Pembayaran</span>
                <span className="text-xs text-slate-300 font-medium">
                  Metode: {currentTx.paymentMethod === 'CASH' ? 'Tunai (Cash)' : currentTx.paymentMethod}
                </span>
              </div>
              <div className={`text-lg font-black ${isCancelled ? 'line-through text-slate-400' : 'text-white'}`}>
                {formatRupiah(currentTx.grandTotal)}
              </div>
            </div>

            {/* Confirmation Box if action triggered */}
            {confirmAction === 'CANCEL' && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 animate-in fade-in duration-150">
                <div className="flex items-start gap-2 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    Apakah Anda yakin ingin <strong>membatalkan</strong> nota ini? Transaksi akan ditandai Void dan tidak dihitung ke laporan.
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setConfirmAction(null)}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-white border border-amber-200 text-slate-700 text-xs font-bold cursor-pointer hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelTx}
                    disabled={isProcessing}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    {isProcessing ? 'Memproses...' : 'Ya, Batalkan'}
                  </button>
                </div>
              </div>
            )}

            {confirmAction === 'DELETE' && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl space-y-2 animate-in fade-in duration-150">
                <div className="flex items-start gap-2 text-xs text-red-900">
                  <Trash2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p>
                    Apakah Anda yakin ingin <strong>menghapus permanen</strong> nota ini dari database?
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setConfirmAction(null)}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-white border border-red-200 text-slate-700 text-xs font-bold cursor-pointer hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteTx}
                    disabled={isProcessing}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    {isProcessing ? 'Menghapus...' : 'Ya, Hapus Permanen'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2">
            {!confirmAction && (
              <div className="grid grid-cols-3 gap-2">
                {/* 1. Edit Button */}
                <button
                  type="button"
                  onClick={() => setIsEditOpen(true)}
                  className="py-2.5 px-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                {/* 2. Void / Cancel Button */}
                {!isCancelled ? (
                  <button
                    type="button"
                    onClick={() => setConfirmAction('CANCEL')}
                    className="py-2.5 px-2 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Batalkan</span>
                  </button>
                ) : (
                  <div className="py-2.5 px-2 rounded-2xl bg-slate-100 text-slate-400 text-xs font-bold flex items-center justify-center gap-1">
                    <span>Sudah Void</span>
                  </div>
                )}

                {/* 3. Delete Button */}
                <button
                  type="button"
                  onClick={() => setConfirmAction('DELETE')}
                  className="py-2.5 px-2 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-center text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal Component */}
      <EditTransactionModal
        isOpen={isEditOpen}
        transaction={currentTx}
        onClose={() => setIsEditOpen(false)}
        onSuccess={handleEditSuccess}
      />
    </>
  );
};
