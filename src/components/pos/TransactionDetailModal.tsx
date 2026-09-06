'use client';

import React, { useState } from 'react';
import { Transaction } from '@/types/pos';
import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { formatRupiah, formatDate } from '@/lib/utils';
import { EditTransactionModal } from './EditTransactionModal';
import { DeleteConfirmationModal, DeleteInfoItem } from '@/components/common/DeleteConfirmationModal';
import { logActivity } from '@/lib/db/activityLogs';
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

  const txDateFormatted = currentTx.createdAt
    ? new Date(currentTx.createdAt).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-';

  const productSummary = currentTx.items.length === 1
    ? currentTx.items[0].product.name
    : currentTx.items.map((i) => `${i.product.name} (${i.quantity})`).join(', ');

  const totalQty = currentTx.items.reduce((sum, i) => sum + i.quantity, 0);

  const deleteInfoItems: DeleteInfoItem[] = [
    { label: 'Tanggal', value: txDateFormatted },
    { label: 'Produk', value: productSummary || '-' },
    { label: 'Qty', value: totalQty },
    { label: 'Total', value: formatRupiah(currentTx.grandTotal) },
    { label: 'Metode Pembayaran', value: currentTx.paymentMethod === 'CASH' ? 'Cash' : (currentTx.paymentMethod || 'Cash') },
  ];

  const handleConfirmWithReason = async (reason: string) => {
    setIsProcessing(true);
    try {
      let staffName = 'Kasir';
      let staffRole = 'Kasir';
      if (typeof window !== 'undefined') {
        const session = localStorage.getItem('kasir_session');
        if (session) {
          try {
            const parsed = JSON.parse(session);
            staffName = parsed.name || (parsed.role === 'kasir' ? 'Yuli' : 'Owner');
            staffRole = parsed.role === 'kasir' ? 'Kasir' : 'Owner';
          } catch {}
        }
      }

      const action = confirmAction;

      // Log activity permanently with reason
      await logActivity({
        staffName,
        role: staffRole,
        actionType: action === 'CANCEL' ? 'VOID_TRANSACTION' : 'DELETE_TRANSACTION',
        title: action === 'CANCEL' ? `Void Transaksi oleh ${staffName}` : `Hapus Transaksi oleh ${staffName}`,
        details: `Alasan: "${reason}". Total: ${formatRupiah(currentTx.grandTotal)} (${currentTx.customerName || 'Pelanggan Umum'}, ${productSummary}).`,
        metadata: {
          transactionId: currentTx.id,
          reason,
          customerName: currentTx.customerName,
          total: currentTx.grandTotal,
          paymentMethod: currentTx.paymentMethod,
        },
      });

      if (action === 'CANCEL') {
        await cancelTransaction(currentTx.id);
        showToast('⚠️ Transaksi berhasil dibatalkan (Void)');
        setCurrentTx({ ...currentTx, status: 'CANCELLED' });
      } else {
        await deleteTransaction(currentTx.id);
        showToast('🗑️ Transaksi berhasil dihapus permanen');
        onClose();
      }

      setConfirmAction(null);
      if (onUpdated) onUpdated();
    } catch {
      showToast('Gagal memproses penghapusan transaksi');
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
                <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                  {currentTx.customerName ? currentTx.customerName : 'Pelanggan Umum'}
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
          </div>

          {/* Action Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2">
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

      {/* Pop Up Alasan Penghapusan Transaksi (Wajib Diisi, Tanpa Tombol Silang) */}
      <DeleteConfirmationModal
        isOpen={Boolean(confirmAction)}
        title={confirmAction === 'CANCEL' ? 'Batalkan Transaksi (Void)' : 'Hapus Transaksi'}
        subtitle="Transaksi yang dihapus tidak akan muncul di riwayat transaksi aktif, tetapi akan tetap tercatat di log sistem."
        warningTitle={confirmAction === 'CANCEL' ? 'Yakin ingin membatalkan transaksi ini?' : 'Yakin ingin menghapus transaksi ini?'}
        warningSubtitle="Tindakan ini tidak dapat dibatalkan."
        infoItems={deleteInfoItems}
        reasonPlaceholder="Tulis alasan penghapusan transaksi..."
        confirmButtonText={confirmAction === 'CANCEL' ? 'Batalkan Transaksi' : 'Hapus Transaksi'}
        isProcessing={isProcessing}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmWithReason}
      />
    </>
  );
};
