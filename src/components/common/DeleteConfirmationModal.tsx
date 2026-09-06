'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';

export interface DeleteInfoItem {
  label: string;
  value: string | number | React.ReactNode;
}

export interface DeleteConfirmationModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  warningTitle?: string;
  warningSubtitle?: string;
  infoItems: DeleteInfoItem[];
  reasonPlaceholder?: string;
  confirmButtonText?: string;
  isProcessing?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  title = 'Hapus Transaksi',
  subtitle = 'Transaksi yang dihapus tidak akan muncul di riwayat transaksi aktif, tetapi akan tetap tercatat di log sistem.',
  warningTitle = 'Yakin ingin menghapus transaksi ini?',
  warningSubtitle = 'Tindakan ini tidak dapat dibatalkan.',
  infoItems,
  reasonPlaceholder = 'Tulis alasan penghapusan transaksi...',
  confirmButtonText = 'Hapus Transaksi',
  isProcessing = false,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');

  // Reset reason when opened
  useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || isProcessing) return;
    await onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-sm sm:max-w-md shadow-2xl p-5 sm:p-6 border border-slate-200/90 space-y-4 animate-in zoom-in-95 duration-150">
        
        {/* Top Header - Note: Close 'X' button intentionally omitted as requested */}
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-full bg-red-100/80 text-red-600 border border-red-200/60 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-600 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base sm:text-lg leading-tight">
              {title}
            </h3>
            <p className="text-[11px] text-slate-500 leading-snug mt-1">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Warning Callout */}
        <div className="bg-red-50/90 border border-red-200/80 rounded-2xl p-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-red-700 leading-tight">
              {warningTitle}
            </p>
            <p className="text-[11px] text-red-600/90 mt-0.5 font-medium">
              {warningSubtitle}
            </p>
          </div>
        </div>

        {/* Info Key-Value Table */}
        {infoItems.length > 0 && (
          <div className="bg-slate-50/90 rounded-2xl p-3.5 border border-slate-200/70 space-y-1.5">
            {infoItems.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[120px_10px_1fr] text-xs leading-relaxed text-slate-700"
              >
                <span className="text-slate-500 font-medium">{item.label}</span>
                <span className="text-slate-400">:</span>
                <span className="font-bold text-slate-900 truncate">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Textarea for Mandatory Reason */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-800">
            Alasan Penghapusan <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={reasonPlaceholder}
            maxLength={100}
            rows={3}
            disabled={isProcessing}
            className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none resize-none transition-all placeholder:text-slate-400 text-slate-800 font-normal disabled:bg-slate-50"
          />
          <div className="text-right text-[10px] text-slate-400 font-medium">
            {reason.length} / 100
          </div>
        </div>

        {/* Actions Footer */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer text-center disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!reason.trim() || isProcessing}
            onClick={handleSubmit}
            className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isProcessing ? 'Menghapus...' : confirmButtonText}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
