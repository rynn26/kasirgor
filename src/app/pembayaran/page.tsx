'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { useCartStore } from '@/lib/store/useCartStore';
import { useProductStore } from '@/lib/store/useProductStore';
import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { PaymentMethod, Transaction } from '@/types/pos';
import { formatRupiah, generateInvoiceNumber } from '@/lib/utils';
import { ReceiptModal } from '@/components/pos/ReceiptModal';
import { 
  ArrowLeft, 
  Banknote, 
  QrCode, 
  AlertCircle
} from 'lucide-react';

export default function PembayaranPage() {
  const router = useRouter();
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

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashReceived, setCashReceived] = useState<number>(grandTotal);
  const [inputCashStr, setInputCashStr] = useState<string>(grandTotal.toString());
  const [completedTx, setCompletedTx] = useState<Transaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  useEffect(() => {
    setCashReceived(grandTotal);
    setInputCashStr(grandTotal > 0 ? grandTotal.toString() : '');
  }, [grandTotal]);

  const change = Math.max(0, cashReceived - grandTotal);
  const isUnderpaid = paymentMethod === 'CASH' && cashReceived < grandTotal;

  const handleCashInput = (val: string) => {
    const numeric = val.replace(/\D/g, '');
    setInputCashStr(numeric);
    setCashReceived(Number(numeric) || 0);
  };

  const handleProcessPayment = async () => {
    if (items.length === 0) {
      router.push('/kasir');
      return;
    }
    if (isUnderpaid) return;

    const finalAmountPaid = paymentMethod === 'CASH' ? cashReceived : grandTotal;
    const finalChange = paymentMethod === 'CASH' ? change : 0;

    const newTxData: Omit<Transaction, 'id'> = {
      invoiceNumber: generateInvoiceNumber(),
      createdAt: new Date().toISOString(),
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
      // Deduct stock first, then save transaction only if stock deduction succeeds
      for (const item of items) {
        await updateStock(item.product.id, -item.quantity);
      }

      // Save transaction to Supabase; roll back stock if this fails
      let saved: Transaction;
      try {
        saved = await addTransaction(newTxData);
      } catch (txErr) {
        // Rollback stock deductions
        for (const item of items) {
          try {
            await updateStock(item.product.id, item.quantity);
          } catch {
            console.error('Stock rollback failed for product:', item.product.id);
          }
        }
        throw txErr;
      }

      // Efek Confetti
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
      });

      // Buka struk
      setCompletedTx(saved);
      setIsReceiptOpen(true);

      // Bersihkan keranjang
      clearCart();
    } catch (err) {
      console.error('Gagal menyimpan transaksi:', err);
    }
  };

  return (
    <div className="min-h-full bg-[#f8fafc] p-3.5 sm:p-6 max-w-lg mx-auto space-y-4 pb-24">
      {/* ============================================================ */}
      {/* HEADER: ← Pembayaran */}
      {/* ============================================================ */}
      <div className="flex items-center space-x-3 py-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 hover:text-[#b92b10] border border-slate-200 shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Pembayaran
        </h1>
      </div>

      {/* ============================================================ */}
      {/* TOTAL PEMBAYARAN CARD (Direct Total Box) */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-400 block">
            Total yang Harus Dibayar
          </span>
          <div className="text-2xl sm:text-3xl font-black text-[#b92b10] tracking-tight mt-0.5">
            {formatRupiah(grandTotal)}
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-red-50 border border-red-100 text-[#b92b10] text-xs font-black">
          {items.reduce((s, i) => s + i.quantity, 0)} Item
        </span>
      </div>

      {/* ============================================================ */}
      {/* METODE PEMBAYARAN CARD (Cash & QRIS) */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-base text-slate-900">
          Metode Pembayaran
        </h3>

        {/* 2 Big Action Tabs: Tunai (Cash) & QRIS */}
        <div className="grid grid-cols-2 gap-3">
          {/* CASH BUTTON */}
          <button
            type="button"
            onClick={() => setPaymentMethod('CASH')}
            className={`p-4 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer ${
              paymentMethod === 'CASH'
                ? 'bg-red-50 border-[#b92b10] text-[#b92b10] font-black ring-2 ring-[#b92b10]/20 shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Banknote className="w-6 h-6" />
            <span className="text-sm font-bold">Tunai (Cash)</span>
          </button>

          {/* QRIS BUTTON */}
          <button
            type="button"
            onClick={() => setPaymentMethod('QRIS')}
            className={`p-4 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer ${
              paymentMethod === 'QRIS'
                ? 'bg-red-50 border-[#b92b10] text-[#b92b10] font-black ring-2 ring-[#b92b10]/20 shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <QrCode className="w-6 h-6" />
            <span className="text-sm font-bold">QRIS</span>
          </button>
        </div>

        {/* DETAILS ACCORDING TO PAYMENT METHOD */}
        {paymentMethod === 'CASH' && (
          <div className="space-y-3.5 pt-1">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Nominal Uang Diterima
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={inputCashStr ? Number(inputCashStr).toLocaleString('id-ID') : ''}
                  onChange={(e) => handleCashInput(e.target.value)}
                  placeholder="0"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black text-slate-900 focus:outline-none focus:border-[#b92b10] focus:bg-white"
                />
              </div>
            </div>

            {/* Kembalian Banner */}
            <div
              className={`p-3.5 rounded-2xl flex items-center justify-between border ${
                isUnderpaid
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
            >
              <div className="flex items-center space-x-2 text-xs font-bold">
                {isUnderpaid && (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>
                  {isUnderpaid ? 'Uang Masih Kurang:' : 'Kembalian Pelanggan:'}
                </span>
              </div>
              <div className="text-base font-black">
                {isUnderpaid
                  ? formatRupiah(grandTotal - cashReceived)
                  : formatRupiah(change)}
              </div>
            </div>
          </div>
        )}

        {paymentMethod === 'QRIS' && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center text-center space-y-3 pt-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 inline-block">
              <div className="w-40 h-40 bg-slate-50 flex flex-col items-center justify-center p-2 rounded-xl border-2 border-slate-900 border-dashed">
                <QrCode className="w-28 h-28 text-slate-900" />
                <span className="text-[9px] font-mono text-slate-800 font-black mt-1">
                  QRIS KASIR GOR
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">
                Arahkan Pelanggan untuk Scan QRIS
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                BCA, Mandiri, BRI, BNI, GoPay, OVO, Dana, ShopeePay
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* BUTTON: SELESAIKAN PEMBAYARAN */}
      {/* ============================================================ */}
      <div className="pt-2">
        <button
          type="button"
          disabled={isUnderpaid || items.length === 0}
          onClick={handleProcessPayment}
          className={`w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base tracking-wider uppercase shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            isUnderpaid || items.length === 0
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              : 'bg-[#b92b10] hover:bg-[#a3250d] active:scale-[0.99] text-white shadow-[#b92b10]/25'
          }`}
        >
          <span>SELESAIKAN PEMBAYARAN</span>
        </button>
      </div>

      {/* Thermal Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        transaction={completedTx}
        onClose={() => {
          setIsReceiptOpen(false);
          router.push('/kasir');
        }}
        onNewTransaction={() => {
          setIsReceiptOpen(false);
          setCompletedTx(null);
          router.push('/kasir');
        }}
      />
    </div>
  );
}
