'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useCartStore } from '@/lib/store/useCartStore';
import { useProductStore } from '@/lib/store/useProductStore';
import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { PaymentMethod, Transaction } from '@/types/pos';
import { formatRupiah, generateInvoiceNumber } from '@/lib/utils';
import { 
  X, 
  Banknote, 
  QrCode, 
  AlertCircle,
  Calendar
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (transaction: Transaction) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const {
    items,
    customerName,
    tableOrCourtNumber,
    cashierName,
    getSubtotal,
    getDiscountTotal,
    getGrandTotal,
    clearCart,
  } = useCartStore();

  const { updateStock } = useProductStore();
  const { addTransaction } = useTransactionStore();

  const grandTotal = getGrandTotal();
  const subtotal = getSubtotal();
  const discountTotal = getDiscountTotal();

  const todayStr = new Date().toISOString().split('T')[0];
  const [transactionDate, setTransactionDate] = useState(todayStr);
  const [isOwner, setIsOwner] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashReceived, setCashReceived] = useState<number>(grandTotal);
  const [inputCashStr, setInputCashStr] = useState<string>(grandTotal.toString());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('kasir_session');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          setIsOwner(parsed.role === 'owner');
        } catch {}
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTransactionDate(todayStr);
      setCashReceived(grandTotal);
      setInputCashStr(grandTotal > 0 ? grandTotal.toString() : '');
    }
  }, [isOpen, grandTotal, todayStr]);

  const change = Math.max(0, cashReceived - grandTotal);
  const isUnderpaid = paymentMethod === 'CASH' && cashReceived < grandTotal;

  const handleCashInput = (val: string) => {
    const numeric = val.replace(/\D/g, '');
    setInputCashStr(numeric);
    setCashReceived(Number(numeric) || 0);
  };

  const handleProcessPayment = async () => {
    if (isUnderpaid || items.length === 0) return;

    const finalAmountPaid = paymentMethod === 'CASH' ? cashReceived : grandTotal;
    const finalChange = paymentMethod === 'CASH' ? change : 0;

    const nowTime = new Date().toTimeString().slice(0, 8);
    const finalCreatedAt = isOwner && transactionDate
      ? new Date(`${transactionDate}T${nowTime}`).toISOString()
      : new Date().toISOString();

    const newTxData: Omit<Transaction, 'id'> = {
      invoiceNumber: generateInvoiceNumber(),
      createdAt: finalCreatedAt,
      cashierName,
      customerName: customerName.trim() || 'Pelanggan Umum',
      tableOrCourtNumber: tableOrCourtNumber.trim() || undefined,
      items: [...items],
      subtotal,
      discountTotal,
      taxTotal: 0,
      serviceTotal: 0,
      grandTotal,
      paymentMethod,
      amountPaid: finalAmountPaid,
      change: finalChange,
      status: 'COMPLETED',
    };

    try {
      // 1. Simpan transaksi ke Supabase
      const saved = await addTransaction(newTxData);

      // 2. Potong stok di Supabase (await to ensure stock is updated)
      for (const item of items) {
        await updateStock(item.product.id, -item.quantity);
      }

      // 3. Efek Confetti
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
      });

      // 4. Callback sukses dengan transaksi yang sudah disimpan
      onSuccess(saved);

      // 5. Bersihkan keranjang & tutup modal
      clearCart();
      onClose();
    } catch (err) {
      console.error('Gagal menyimpan transaksi:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-black text-lg text-slate-900">
            Pembayaran
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 bg-[#f8fafc]">
          {/* Card: Total Tagihan Langsung */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block">Total Tagihan</span>
              <div className="text-2xl font-black text-[#b92b10]">{formatRupiah(grandTotal)}</div>
            </div>
            <span className="px-3 py-1 rounded-full bg-red-50 text-[#b92b10] text-xs font-black">
              {items.reduce((s, i) => s + i.quantity, 0)} Item
            </span>
          </div>

          {/* Opsi Khusus Owner: Tanggal Transaksi (Bisa Input Data Kemarin / Backdate) */}
          {isOwner && (
            <div className="bg-amber-50/70 rounded-2xl p-3.5 border border-amber-200/90 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-700" />
                  <span>Tanggal Transaksi (Khusus Owner)</span>
                </span>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-200">
                  Bisa pilih tgl kemarin
                </span>
              </div>
              <div className="relative">
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Card: Metode Pembayaran (Cash & QRIS) */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
            <h4 className="font-bold text-sm text-slate-900">Metode Pembayaran</h4>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                  paymentMethod === 'CASH'
                    ? 'bg-red-50 border-[#b92b10] text-[#b92b10] font-black ring-1.5 ring-[#b92b10]/20'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span className="text-xs font-bold">Tunai (Cash)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('QRIS')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                  paymentMethod === 'QRIS'
                    ? 'bg-red-50 border-[#b92b10] text-[#b92b10] font-black ring-1.5 ring-[#b92b10]/20'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <QrCode className="w-5 h-5" />
                <span className="text-xs font-bold">QRIS</span>
              </button>
            </div>

            {paymentMethod === 'CASH' && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Nominal Uang Diterima
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={inputCashStr ? Number(inputCashStr).toLocaleString('id-ID') : ''}
                      onChange={(e) => handleCashInput(e.target.value)}
                      placeholder="0"
                      className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-slate-900 focus:outline-none focus:border-[#b92b10] focus:bg-white"
                    />
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl flex items-center justify-between border text-xs ${
                    isUnderpaid
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 font-bold">
                    {isUnderpaid && (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span>{isUnderpaid ? 'Kurang:' : 'Kembalian:'}</span>
                  </div>
                  <div className="text-sm font-black">
                    {isUnderpaid
                      ? formatRupiah(grandTotal - cashReceived)
                      : formatRupiah(change)}
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'QRIS' && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center text-center space-y-2">
                <div className="w-32 h-32 bg-white rounded-lg p-1.5 border border-slate-200 flex items-center justify-center">
                  <QrCode className="w-24 h-24 text-slate-900" />
                </div>
                <p className="text-xs font-bold text-slate-900">
                  Scan QRIS Menggunakan BCA, Mandiri, GoPay, OVO, Dana, dll.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Button Footer */}
        <div className="p-4 bg-white border-t border-slate-200">
          <button
            type="button"
            disabled={isUnderpaid || items.length === 0}
            onClick={handleProcessPayment}
            className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all cursor-pointer ${
              isUnderpaid || items.length === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-[#b92b10] hover:bg-[#a3250d] active:scale-[0.99] text-white shadow-lg shadow-[#b92b10]/25'
            }`}
          >
            <span>SELESAIKAN PEMBAYARAN</span>
          </button>
        </div>
      </div>
    </div>
  );
};
