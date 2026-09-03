'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/lib/store/useCartStore';
import { formatRupiah, formatNumber, parseNumberInput } from '@/lib/utils';
import { usePosDraftStore } from '@/lib/store/usePosDraftStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { PosDraftModal } from '@/components/pos/PosDraftModal';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Tag, 
  User, 
  FileText, 
  PlusCircle, 
  ArrowRight,
  RotateCcw,
  X,
  Layers,
  BookmarkPlus
} from 'lucide-react';

interface CartSidebarProps {
  onOpenPayment: () => void;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({ onOpenPayment }) => {
  const {
    items,
    customerName,
    tableOrCourtNumber,
    discountAmount,
    discountPercent,
    discountType,
    setCustomerInfo,
    updateQuantity,
    removeItem,
    clearCart,
    setDiscount,
    getSubtotal,
    getDiscountTotal,
    getTaxTotal,
    getGrandTotal,
    getTotalItems,
  } = useCartStore();

  const { drafts, saveDraft } = usePosDraftStore();
  const { showToast } = useToastStore();
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);

  const [isEditingDiscount, setIsEditingDiscount] = useState(false);
  const [discountValInput, setDiscountValInput] = useState<number>(
    discountType === 'percent' ? discountPercent : discountAmount
  );
  const [activeTabType, setActiveTabType] = useState<'fixed' | 'percent'>(discountType || 'percent');

  const subtotal = getSubtotal();
  const discountTotal = getDiscountTotal();
  const taxTotal = getTaxTotal();
  const grandTotal = getGrandTotal();
  const totalItemsCount = getTotalItems();

  const handleApplyDiscount = (val?: number, type?: 'fixed' | 'percent') => {
    const targetType = type || activeTabType;
    const targetVal = val !== undefined ? val : discountValInput;
    setDiscount(targetVal, targetType);
    setIsEditingDiscount(false);
  };

  const handleHoldOrderToDraft = () => {
    if (items.length === 0) return;
    saveDraft({
      customerName: customerName.trim() || undefined,
      tableOrCourtNumber: tableOrCourtNumber.trim() || undefined,
      items: [...items],
      discountAmount,
      discountPercent,
      discountType,
      subtotal,
      grandTotal,
      totalItems: totalItemsCount,
    });
    clearCart();
    showToast('Pesanan berhasil ditahan & disimpan ke Draft!');
  };

  return (
    <aside className="w-full lg:w-96 flex flex-col h-full bg-[#f8fafc] border-l border-slate-200 shadow-lg">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-red-50 text-[#b92b10] border border-red-100 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-sm text-slate-900 truncate">Pesanan Kasir</h2>
            <p className="text-[11px] text-slate-500 truncate">
              {totalItemsCount} item terpilih
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Tombol Menu Draft */}
          <button
            type="button"
            onClick={() => setIsDraftModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-700 hover:text-[#b92b10] hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer font-bold relative"
            title="Buka Daftar Draft Pesanan"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Draft</span>
            {drafts.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#b92b10] text-white text-[10px] font-black flex items-center justify-center -mr-1">
                {drafts.length}
              </span>
            )}
          </button>

          {/* Tombol Simpan ke Draft jika ada item */}
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleHoldOrderToDraft}
              title="Simpan / Tahan Pesanan ke Draft (Hold)"
              className="flex items-center gap-1 px-2 py-1 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer font-bold"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>Hold</span>
            </button>
          )}

          {items.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              title="Bersihkan Keranjang"
              className="p-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Optional Customer / Queue Info */}
      <div className="p-3 bg-white border-b border-slate-200 grid grid-cols-2 gap-2">
        <div className="relative">
          <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerInfo(e.target.value, tableOrCourtNumber)}
            placeholder="Nama Pembeli"
            className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#b92b10] focus:bg-white"
          />
        </div>
        <div className="relative">
          <FileText className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={tableOrCourtNumber}
            onChange={(e) => setCustomerInfo(customerName, e.target.value)}
            placeholder="No. Antrean"
            className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#b92b10] focus:bg-white"
          />
        </div>
      </div>

      {/* Cart Items List (Cards matching Reference Mockup) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <ShoppingCart className="w-12 h-12 text-slate-300 mb-2 stroke-1" />
            <p className="text-sm font-bold text-slate-700">Keranjang masih kosong</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Klik produk di katalog untuk menambahkan ke pesanan kasir
            </p>
          </div>
        ) : (
          items.map(({ product, quantity }) => {
            const itemTotal = product.price * quantity;

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs flex items-center justify-between gap-2.5"
              >
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-slate-400 text-[10px]">
                      {product.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Info & Total */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs text-slate-900 truncate">
                    {product.name}
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    {formatRupiah(product.price)} / item
                  </p>
                  <p className="text-xs font-bold text-[#b92b10] mt-0.5">
                    Total: {formatRupiah(itemTotal)}
                  </p>
                </div>

                {/* Stepper Pill */}
                <div className="flex items-center space-x-1.5 bg-slate-50 px-2 py-1 rounded-full border border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateQuantity(product.id, quantity - 1)}
                    className="w-4 h-4 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    <Minus className="w-3 h-3 stroke-[2.5]" />
                  </button>
                  <span className="text-xs font-black text-slate-800 min-w-3 text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(product.id, quantity + 1)}
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[#b92b10] hover:text-[#a3250d] transition-colors"
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Rincian Pembayaran Card & Checkout */}
      {items.length > 0 && (
        <div className="p-4 bg-white border-t border-slate-200 space-y-3 shadow-lg">
          {/* Diskon Popup/Toggle */}
          {isEditingDiscount ? (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 animate-in fade-in">
              <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Atur Diskon Transaksi</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingDiscount(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer rounded"
                >
                  ✕
                </button>
              </div>

              {/* Toggle Persen vs Nominal */}
              <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTabType('percent')}
                  className={`py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    activeTabType === 'percent'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Persen (%)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabType('fixed')}
                  className={`py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    activeTabType === 'fixed'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Nominal (Rp)
                </button>
              </div>

              {/* Input Box */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1.5 text-[11px] font-bold text-slate-400">
                    {activeTabType === 'percent' ? '%' : 'Rp'}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={discountValInput ? (activeTabType === 'fixed' ? formatNumber(discountValInput) : discountValInput) : ''}
                    onChange={(e) => {
                      const val = parseNumberInput(e.target.value);
                      const finalVal = activeTabType === 'percent' ? Math.min(100, val) : val;
                      setDiscountValInput(finalVal);
                    }}
                    placeholder={activeTabType === 'percent' ? '10' : '5.000'}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleApplyDiscount(discountValInput, activeTabType)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Terapkan
                </button>
              </div>

              {/* Quick Chips */}
              <div className="flex flex-wrap gap-1">
                {activeTabType === 'percent'
                  ? [5, 10, 15, 20, 50].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          setDiscountValInput(pct);
                          handleApplyDiscount(pct, 'percent');
                        }}
                        className="px-2 py-0.5 rounded-md bg-white hover:bg-emerald-50 text-slate-700 text-[10px] font-bold border border-slate-200 cursor-pointer"
                      >
                        {pct}%
                      </button>
                    ))
                  : [2000, 5000, 10000, 20000].map((nom) => (
                      <button
                        key={nom}
                        type="button"
                        onClick={() => {
                          setDiscountValInput(nom);
                          handleApplyDiscount(nom, 'fixed');
                        }}
                        className="px-2 py-0.5 rounded-md bg-white hover:bg-emerald-50 text-slate-700 text-[10px] font-bold border border-slate-200 cursor-pointer"
                      >
                        {formatRupiah(nom)}
                      </button>
                    ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal ({totalItemsCount} item)</span>
                <span className="text-slate-900 font-semibold">{formatRupiah(subtotal)}</span>
              </div>

              <div className="flex justify-between text-slate-500 items-center">
                <button
                  type="button"
                  onClick={() => {
                    setDiscountValInput(discountType === 'percent' ? discountPercent : discountAmount);
                    setActiveTabType(discountType || 'percent');
                    setIsEditingDiscount(true);
                  }}
                  className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Tag className="w-3 h-3" />
                  <span>
                    {discountTotal > 0
                      ? `Diskon Promo (${discountType === 'percent' ? `${discountPercent}%` : formatRupiah(discountAmount)})`
                      : '+ Tambah Diskon'}
                  </span>
                </button>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">
                    {discountTotal > 0 ? `- ${formatRupiah(discountTotal)}` : 'Rp 0'}
                  </span>
                  {discountTotal > 0 && (
                    <button
                      type="button"
                      onClick={() => setDiscount(0, 'fixed')}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Hapus Diskon"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {taxTotal > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Pajak (0%)</span>
                  <span className="text-slate-900 font-semibold">{formatRupiah(taxTotal)}</span>
                </div>
              )}
            </div>
          )}

          {/* Grand Total */}
          <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Total
            </span>
            <span className="text-xl font-black text-[#b92b10] tracking-tight">
              {formatRupiah(grandTotal)}
            </span>
          </div>

          {/* Checkout Button */}
          <button
            type="button"
            disabled={items.length === 0}
            onClick={onOpenPayment}
            className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center space-x-2 transition-all duration-150 ${
              items.length === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-[#b92b10] hover:bg-[#a3250d] text-white shadow-lg shadow-[#b92b10]/25 active:scale-[0.98] cursor-pointer'
            }`}
          >
            <span>LANJUT KE PEMBAYARAN</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* Modal Daftar Draft Pesanan Toko */}
      <PosDraftModal
        isOpen={isDraftModalOpen}
        onClose={() => setIsDraftModalOpen(false)}
      />
    </aside>
  );
};
