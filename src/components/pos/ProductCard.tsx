'use client';

import React from 'react';
import { Product } from '@/types/pos';
import { useCartStore } from '@/lib/store/useCartStore';
import { formatRupiah } from '@/lib/utils';
import { Plus, Minus, Check, Trash2, XCircle } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addItem, updateQuantity, items } = useCartStore();

  const cartItem = items.find((i) => i.product.id === product.id);
  const inCartQty = cartItem?.quantity || 0;
  const isOutOfStock = product.stock <= 0;

  // Best seller badge simulation
  const isBestSeller =
    product.name.toLowerCase().includes('mie ayam') ||
    product.name.toLowerCase().includes('es teh') ||
    product.name.toLowerCase().includes('shuttlecock');

  const handleCardClick = () => {
    if (isOutOfStock) return;
    if (inCartQty === 0) {
      addItem(product);
    }
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    if (inCartQty === 0) {
      addItem(product);
    } else {
      updateQuantity(product.id, inCartQty + 1);
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inCartQty > 0) {
      updateQuantity(product.id, inCartQty - 1);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative flex flex-col justify-between bg-white rounded-2xl border transition-all duration-150 p-3 sm:p-4 text-left select-none overflow-hidden ${
        isOutOfStock
          ? 'border-slate-200 bg-slate-50/70 opacity-70 cursor-not-allowed'
          : inCartQty > 0
          ? 'border-[#a62512] shadow-xs ring-1 ring-[#a62512] bg-red-50/15 cursor-pointer'
          : 'border-slate-200 hover:border-[#a62512]/60 hover:shadow-xs cursor-pointer'
      }`}
    >
      {/* Top Meta: Category & Badges */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-600 border border-slate-200 max-w-[70px] sm:max-w-[90px] truncate">
          {product.category}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {isOutOfStock ? (
            <span className="px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-bold">
              Habis
            </span>
          ) : isBestSeller ? (
            <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
              Terlaris
            </span>
          ) : null}

          {inCartQty > 0 && !isOutOfStock && (
            <span className="px-1.5 py-0.5 rounded-md bg-[#a62512] text-white text-[10px] font-black flex items-center gap-0.5">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
              <span>{inCartQty}</span>
            </span>
          )}
        </div>
      </div>

      {/* Middle: Product Name & Stock Info */}
      <div className="flex-1 space-y-0.5 my-1 min-w-0">
        <h3 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug group-hover:text-[#a62512] transition-colors line-clamp-2">
          {product.name}
        </h3>
        
        <p className="text-[10px] sm:text-[11px] font-medium">
          {isOutOfStock ? (
            <span className="text-red-500 font-semibold flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              Stok Habis
            </span>
          ) : (
            <span className="text-slate-400">
              Sisa: <strong className="text-slate-600 font-semibold">{product.stock} {product.unit}</strong>
            </span>
          )}
        </p>
      </div>

      {/* Bottom Row: Price & Stepper Button (Guaranteed No Overflow) */}
      <div className="flex items-end justify-between gap-1 pt-2.5 border-t border-slate-100 mt-2 min-w-0">
        <div className="min-w-0 flex-1">
          <span className="text-[9px] sm:text-[10px] text-slate-400 block font-medium leading-tight">Harga</span>
          <span className="text-xs sm:text-sm font-black text-[#a62512] tracking-tight block truncate">
            {formatRupiah(product.price)}
          </span>
        </div>

        {inCartQty > 0 ? (
          /* Interactive Inline Stepper (- [Qty] +) - Compact & Contained */
          <div 
            onClick={(e) => e.stopPropagation()}
            className="flex items-center space-x-1 bg-[#a62512] text-white p-0.5 px-1 rounded-full shadow-xs shrink-0"
          >
            <button
              type="button"
              onClick={handleDecrement}
              title="Kurangi"
              className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer active:scale-90"
            >
              {inCartQty === 1 ? (
                <Trash2 className="w-2.5 h-2.5 stroke-[2.5]" />
              ) : (
                <Minus className="w-3 h-3 stroke-[3]" />
              )}
            </button>

            <span className="text-[11px] font-black text-white min-w-3 text-center px-0.5">
              {inCartQty}
            </span>

            <button
              type="button"
              onClick={handleIncrement}
              title="Tambah"
              className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer active:scale-90"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
            </button>
          </div>
        ) : (
          /* Single Plus Button */
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={handleIncrement}
            title="Tambah ke Keranjang"
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0 ${
              isOutOfStock
                ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                : 'bg-red-50 hover:bg-[#a62512] text-[#a62512] hover:text-white border border-red-100 shadow-2xs cursor-pointer active:scale-90'
            }`}
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        )}
      </div>
    </div>
  );
};
