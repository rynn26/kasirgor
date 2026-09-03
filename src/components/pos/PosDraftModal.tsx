'use client';

import React from 'react';
import { usePosDraftStore, PosDraft } from '@/lib/store/usePosDraftStore';
import { useCartStore } from '@/lib/store/useCartStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { formatRupiah } from '@/lib/utils';
import {
  X,
  Clock,
  User,
  ShoppingBag,
  ArrowRight,
  Trash2,
  Package,
  Layers
} from 'lucide-react';

interface PosDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PosDraftModal: React.FC<PosDraftModalProps> = ({ isOpen, onClose }) => {
  const { drafts, deleteDraft, clearAllDrafts } = usePosDraftStore();
  const {
    items: currentItems,
    setCustomerInfo,
    setDiscount,
    setNotes,
    clearCart,
  } = useCartStore();
  const { showToast } = useToastStore();

  if (!isOpen) return null;

  const handleRestoreDraft = (draft: PosDraft) => {
    // Jika keranjang saat ini sedang berisi item lain, beri konfirmasi
    if (currentItems.length > 0) {
      const confirmOverwrite = window.confirm(
        'Keranjang saat ini sedang berisi pesanan lain. Muat draft ini dan gantikan pesanan aktif?'
      );
      if (!confirmOverwrite) return;
    }

    // Set item ke keranjang
    useCartStore.setState({
      items: draft.items,
      customerName: draft.customerName || '',
      tableOrCourtNumber: draft.tableOrCourtNumber || '',
      discountAmount: draft.discountAmount || 0,
      discountPercent: draft.discountPercent || 0,
      discountType: draft.discountType || 'fixed',
      notes: draft.notes || '',
    });

    // Hapus dari draft list setelah dimuat ke keranjang
    deleteDraft(draft.id);

    showToast(`Draft "${draft.customerName || 'Pesanan'}" berhasil dimuat ke keranjang!`);
    onClose();
  };

  const handleDeleteDraft = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteDraft(id);
    showToast('Draft pesanan telah dihapus');
  };

  const formatTimeAgo = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'Baru saja';
      if (diffMin < 60) return `${diffMin} mnt lalu`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour} jam lalu`;
      return new Date(isoString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Tersimpan';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#b92b10] to-[#e64a19] text-white flex items-center justify-center shadow-md shadow-[#b92b10]/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-base sm:text-lg leading-tight">
                  Draft Pesanan Toko (Hold)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-[#b92b10] text-[11px] font-black">
                  {drafts.length} Draft
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Pilih draft pesanan yang tersimpan untuk dilanjutkan
              </p>
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

        {/* Modal Body - Draft List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {drafts.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Package className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Tidak Ada Draft Tersimpan</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Jika ingin menunda transaksi untuk melayani pelanggan lain, klik tombol <strong>"Tahan / Simpan Draft"</strong> di keranjang.
              </p>
            </div>
          ) : (
            drafts.map((draft) => (
              <div
                key={draft.id}
                onClick={() => handleRestoreDraft(draft)}
                className="group p-3.5 sm:p-4 rounded-2xl border border-slate-200 hover:border-[#b92b10]/50 hover:bg-red-50/20 bg-white transition-all cursor-pointer shadow-2xs space-y-2.5 relative"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-[#b92b10] text-slate-600 group-hover:text-white flex items-center justify-center transition-colors">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-900 group-hover:text-[#b92b10] transition-colors">
                        {draft.customerName ? draft.customerName : 'Pelanggan Umum'}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                        {draft.tableOrCourtNumber && (
                          <span className="text-slate-700 font-bold">
                            Meja/Lap: {draft.tableOrCourtNumber} •
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatTimeAgo(draft.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteDraft(draft.id, e)}
                    title="Hapus draft ini"
                    className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Items preview */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
                  <div className="line-clamp-2 text-[11px] leading-relaxed">
                    {draft.items.map((it, idx) => (
                      <span key={idx}>
                        {it.quantity}x {it.product.name}
                        {idx < draft.items.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer draft */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Total ({draft.totalItems} item)</span>
                    <span className="font-black text-slate-900">{formatRupiah(draft.grandTotal)}</span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#b92b10] group-hover:translate-x-0.5 transition-transform">
                    <span>Lanjutkan Transaksi</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          {drafts.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Yakin ingin menghapus SEMUA draft pesanan toko?')) {
                  clearAllDrafts();
                  showToast('Semua draft pesanan dihapus');
                }
              }}
              className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
            >
              Hapus Semua Draft
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
