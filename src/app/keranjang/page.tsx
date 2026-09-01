'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { useCartStore } from '@/lib/store/useCartStore';
import { useProductStore } from '@/lib/store/useProductStore';
import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { PaymentMethod, Transaction } from '@/types/pos';
import { formatRupiah, formatNumber, parseNumberInput, generateInvoiceNumber } from '@/lib/utils';
import { 
  PlusCircle, 
  Minus, 
  Plus, 
  ShoppingCart,
  ArrowLeft,
  Trash2,
  Banknote,
  QrCode,
  CheckCircle2,
  ArrowRight,
  Tag,
  X,
  Percent
} from 'lucide-react';

export default function KeranjangPage() {
  const router = useRouter();
  const {
    items,
    updateQuantity,
    getSubtotal,
    getDiscountTotal,
    getGrandTotal,
    getTotalItems,
    customerName,
    tableOrCourtNumber,
    cashierName,
    discountAmount,
    discountPercent,
    discountType,
    setDiscount,
    clearCart
  } = useCartStore();

  const { updateStock } = useProductStore();
  const { addTransaction } = useTransactionStore();
  const { showToast } = useToastStore();

  const [activeCashier, setActiveCashier] = useState('Yuli');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [isProcessing, setIsProcessing] = useState(false);
  const [discountTypeLocal, setDiscountTypeLocal] = useState<'percent' | 'fixed'>(discountType || 'percent');
  const [discountValueLocal, setDiscountValueLocal] = useState<number>(
    discountType === 'percent' ? discountPercent : discountAmount
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('kasir_session');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          if (parsed.name || parsed.user) {
            setActiveCashier(parsed.name || parsed.user);
          }
        } catch {}
      }
    }
  }, []);

  const totalItemsCount = getTotalItems();
  const grandTotal = getGrandTotal();
  const subtotal = getSubtotal();
  const discountTotal = getDiscountTotal();

  const handleProcessPayment = async () => {
    if (items.length === 0 || isProcessing) return;

    setIsProcessing(true);

    const newTxData: Omit<Transaction, 'id'> = {
      invoiceNumber: generateInvoiceNumber(),
      createdAt: new Date().toISOString(),
      cashierName: activeCashier || cashierName,
      customerName: customerName.trim() || 'Pelanggan Umum',
      tableOrCourtNumber: tableOrCourtNumber.trim() || undefined,
      items: [...items],
      subtotal,
      discountTotal,
      taxTotal: 0,
      serviceTotal: 0,
      grandTotal,
      paymentMethod,
      amountPaid: grandTotal,
      change: 0,
      status: 'COMPLETED',
    };

    try {
      // 1. Simpan transaksi ke Supabase
      await addTransaction(newTxData);

      // 2. Potong stok produk di Supabase (await to ensure stock is updated)
      for (const item of items) {
        await updateStock(item.product.id, -item.quantity);
      }

      // 3. Efek Confetti
      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.6 },
      });

      // 4. Toast & redirect
      showToast('Transaksi berhasil disimpan!');
      clearCart();
      setTimeout(() => {
        setIsProcessing(false);
        router.push('/kasir');
      }, 400);
    } catch (err) {
      console.error('Gagal menyimpan transaksi:', err);
      showToast('Gagal menyimpan transaksi. Coba lagi.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-full bg-[#f8fafc] p-3.5 sm:p-6 max-w-lg mx-auto space-y-4 pb-28">
      {/* ============================================================ */}
      {/* HEADER SIMULATOR (Back Button & Cart Icon) */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          {/* Back Button */}
          <button
            type="button"
            onClick={() => router.push('/kasir')}
            title="Kembali ke Menu Kasir"
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-[#b92b10] border border-slate-200 transition-colors cursor-pointer flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-[#b92b10] text-white flex items-center justify-center font-bold text-xs shadow-md shadow-[#b92b10]/20">
            {activeCashier.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#b92b10] tracking-tight">
              Halo, Selamat Datang
            </h2>
          </div>
        </div>

        {/* Cart Icon Button */}
        <div className="p-2.5 rounded-xl bg-red-50 text-[#b92b10] border border-red-100 relative flex items-center justify-center">
          <ShoppingCart className="w-5 h-5" />
          {totalItemsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#b92b10] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
              {totalItemsCount}
            </span>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* PESANAN SAAT INI (Text-Only Cart Items List) */}
      {/* ============================================================ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-base text-slate-900">
            Pesanan Saat Ini
          </h3>
          <span className="text-xs font-semibold text-slate-500">
            {totalItemsCount} Item
          </span>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
            <h4 className="font-bold text-sm text-slate-800">Keranjang Masih Kosong</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Belum ada produk yang ditambahkan ke pesanan kasir saat ini.
            </p>
            <Link
              href="/kasir"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#b92b10] text-white rounded-xl text-xs font-bold shadow-md shadow-[#b92b10]/25 hover:bg-[#a3250d] transition-all cursor-pointer"
            >
              <span>+ Pilih Produk di Menu Kasir</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map(({ product, quantity }) => {
              const itemTotal = product.price * quantity;

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between gap-3"
                >
                  {/* Left: Product Name, Category & Price */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-600 border border-slate-200 inline-block">
                      {product.category}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 truncate">
                      {product.name}
                    </h4>
                    <p className="text-xs font-bold text-[#b92b10]">
                      {formatRupiah(itemTotal)}{' '}
                      <span className="text-[10px] font-normal text-slate-400">
                        ({formatRupiah(product.price)} x {quantity})
                      </span>
                    </p>
                  </div>

                  {/* Right: Quantity Stepper Pill */}
                  <div className="flex items-center space-x-2.5 bg-slate-50 px-2.5 py-1.5 rounded-full border border-slate-200 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateQuantity(product.id, quantity - 1)}
                      title="Kurangi"
                      className="w-5 h-5 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                      {quantity === 1 ? (
                        <Trash2 className="w-3.5 h-3.5 text-red-500 stroke-[2.5]" />
                      ) : (
                        <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                      )}
                    </button>
                    <span className="text-xs font-black text-slate-800 min-w-3 text-center">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(product.id, quantity + 1)}
                      title="Tambah"
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[#b92b10] hover:text-[#a3250d] transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* + Tambah Produk Lain Link */}
            <div className="pt-1">
              <Link
                href="/kasir"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#b92b10] hover:underline px-1"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Tambah Produk Lain</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* PILIH METODE (TUNAI / QRIS) & TOMBOL BAYAR SELESAI */}
      {/* ============================================================ */}
      {items.length > 0 && (
        <div className="pt-2 space-y-3">
          
          {/* Card Diskon & Promo */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    Diskon & Potongan Harga
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Potongan persen (%) atau nominal tetap (Rp)
                  </p>
                </div>
              </div>

              {discountTotal > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setDiscountValueLocal(0);
                    setDiscount(0, 'fixed');
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Hapus Diskon</span>
                </button>
              )}
            </div>

            {/* Toggle Type: Persen vs Nominal */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setDiscountTypeLocal('percent');
                  setDiscount(discountValueLocal, 'percent');
                }}
                className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  discountTypeLocal === 'percent'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Diskon Persen (%)
              </button>
              <button
                type="button"
                onClick={() => {
                  setDiscountTypeLocal('fixed');
                  setDiscount(discountValueLocal, 'fixed');
                }}
                className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  discountTypeLocal === 'fixed'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Nominal Tetap (Rp)
              </button>
            </div>

            {/* Input Box & Quick Chips */}
            <div className="space-y-2">
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">
                  {discountTypeLocal === 'percent' ? '%' : 'Rp'}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={discountValueLocal ? (discountTypeLocal === 'fixed' ? formatNumber(discountValueLocal) : discountValueLocal) : ''}
                  onChange={(e) => {
                    const val = parseNumberInput(e.target.value);
                    const finalVal = discountTypeLocal === 'percent' ? Math.min(100, val) : val;
                    setDiscountValueLocal(finalVal);
                    setDiscount(finalVal, discountTypeLocal);
                  }}
                  placeholder={discountTypeLocal === 'percent' ? 'Contoh: 10 (%)' : 'Contoh: 5.000 (Rp)'}
                  className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              {/* Quick Chips */}
              <div className="flex flex-wrap gap-1.5">
                {discountTypeLocal === 'percent'
                  ? [5, 10, 15, 20, 50].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          setDiscountValueLocal(pct);
                          setDiscount(pct, 'percent');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          discountTypeLocal === 'percent' && discountValueLocal === pct
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))
                  : [2000, 5000, 10000, 20000, 50000].map((nom) => (
                      <button
                        key={nom}
                        type="button"
                        onClick={() => {
                          setDiscountValueLocal(nom);
                          setDiscount(nom, 'fixed');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          discountTypeLocal === 'fixed' && discountValueLocal === nom
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {formatRupiah(nom)}
                      </button>
                    ))}
              </div>
            </div>

            {/* Breakdown Summary */}
            {discountTotal > 0 && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1 text-xs text-emerald-900">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Barang:</span>
                  <span>{formatRupiah(subtotal)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>Potongan Diskon:</span>
                  <span>- {formatRupiah(discountTotal)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Card Pembayaran */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            
            {/* Row 1: Total & Count */}
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-medium">Total Pembayaran</span>
                <span className="text-2xl sm:text-3xl font-black text-[#b92b10] tracking-tight">
                  {formatRupiah(grandTotal)}
                </span>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {totalItemsCount} Barang
              </span>
            </div>

            {/* Row 2: 2 Pilihan Metode (Tunai vs QRIS) */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* Option 1: Tunai */}
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-3 px-3 rounded-2xl font-black text-xs sm:text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                  paymentMethod === 'CASH'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-600/30'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Banknote className="w-4 h-4 stroke-[2.5]" />
                <span>TUNAI (CASH)</span>
              </button>

              {/* Option 2: QRIS */}
              <button
                type="button"
                onClick={() => setPaymentMethod('QRIS')}
                className={`py-3 px-3 rounded-2xl font-black text-xs sm:text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                  paymentMethod === 'QRIS'
                    ? 'bg-[#b92b10] border-[#b92b10] text-white shadow-md shadow-[#b92b10]/25 ring-2 ring-[#b92b10]/30'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <QrCode className="w-4 h-4 stroke-[2.5]" />
                <span>QRIS</span>
              </button>
            </div>

            {/* Row 3: Tombol Aksi TAMBAHKAN */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleProcessPayment}
              className="w-full py-4 px-6 rounded-2xl bg-[#b92b10] hover:bg-[#a3250d] active:scale-[0.99] text-white font-black text-sm sm:text-base tracking-wider uppercase shadow-lg shadow-[#b92b10]/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isProcessing ? 'MEMPROSES...' : `TAMBAHKAN (${formatRupiah(grandTotal)})`}</span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
