'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useBookingDraftStore, BookingDraft } from '@/lib/store/useBookingDraftStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { formatRupiah } from '@/lib/utils';
import {
  X,
  Clock,
  Calendar,
  Phone,
  Trash2,
  Layers,
  ArrowRight,
  FileSpreadsheet
} from 'lucide-react';

interface BookingDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDraft?: (draft: BookingDraft) => void;
}

export const BookingDraftModal: React.FC<BookingDraftModalProps> = ({
  isOpen,
  onClose,
  onSelectDraft,
}) => {
  const router = useRouter();
  const { drafts, deleteDraft, clearAllDrafts, setActiveDraftId } = useBookingDraftStore();
  const { showToast } = useToastStore();

  if (!isOpen) return null;

  const handleSelect = (draft: BookingDraft) => {
    setActiveDraftId(draft.id);
    if (onSelectDraft) {
      onSelectDraft(draft);
    } else {
      router.push('/booking/dp');
    }
    onClose();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteDraft(id);
    showToast('Draft booking dihapus');
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
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-base sm:text-lg leading-tight">
                  Draft Booking Lapangan
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black">
                  {drafts.length} Draft
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Pilih draft booking untuk melanjutkan tanpa perlu isi dari awal
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
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Tidak Ada Draft Booking</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Saat kasir mengisi booking di halaman DP Lapangan dan menekan tombol Back atau Simpan Draft, draft akan tersimpan di sini otomatis.
              </p>
            </div>
          ) : (
            drafts.map((draft) => (
              <div
                key={draft.id}
                onClick={() => handleSelect(draft)}
                className="group p-3.5 sm:p-4 rounded-2xl border border-slate-200 hover:border-emerald-500/50 hover:bg-emerald-50/20 bg-white transition-all cursor-pointer shadow-2xs space-y-2.5 relative"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black">
                        {draft.selectedSport} ({draft.memberType})
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(draft.createdAt)}
                      </span>
                    </div>
                    <h4 className="font-black text-sm text-slate-900 mt-1 group-hover:text-emerald-700 transition-colors">
                      {draft.customerName || 'Belum ada nama pemesan'}
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(draft.id, e)}
                    title="Hapus draft ini"
                    className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Details snippet */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-slate-800">{draft.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-slate-800">{draft.startTime} - {draft.endTime}</span>
                  </div>
                  {draft.phone && (
                    <div className="flex items-center gap-1.5 text-slate-600 col-span-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono text-slate-700">{draft.phone}</span>
                      <span className="text-slate-400">• {draft.courtCount} Lapangan</span>
                    </div>
                  )}
                </div>

                {/* Footer draft */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Nominal DP</span>
                    <span className="font-black text-emerald-700">{formatRupiah(draft.dpAmount || 0)}</span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
                    <span>Lanjutkan Booking</span>
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
                if (window.confirm('Yakin ingin menghapus SEMUA draft booking lapangan?')) {
                  clearAllDrafts();
                  showToast('Semua draft booking dihapus');
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
