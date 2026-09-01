'use client';

import React, { useState } from 'react';
import { useProductStore } from '@/lib/store/useProductStore';
import { useCartStore } from '@/lib/store/useCartStore';
import { ProductCard } from './ProductCard';
import { CategoryFilter } from './CategoryFilter';
import { Search, ScanBarcode, X, PackageX, Sparkles } from 'lucide-react';

export const ProductGrid: React.FC = () => {
  const { searchQuery, setSearchQuery, filteredProducts, products } = useProductStore();
  const { addItem } = useCartStore();
  const [barcodeAlert, setBarcodeAlert] = useState<string | null>(null);

  const displayedProducts = filteredProducts();

  // Barcode scanner simulator
  const handleBarcodeClick = () => {
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    if (randomProduct && randomProduct.stock > 0) {
      addItem(randomProduct);
      setBarcodeAlert(`Scan Berhasil: "${randomProduct.name}"`);
      setTimeout(() => setBarcodeAlert(null), 3000);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3.5">
      {/* Top Search & Barcode Scan Bar (Matches Reference UI) */}
      <div className="relative w-full">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari produk..."
          className="w-full pl-11 pr-12 py-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#b92b10] focus:ring-1 focus:ring-[#b92b10] shadow-xs"
        />
        
        {/* Right Barcode Scanner Icon Button */}
        <button
          type="button"
          onClick={handleBarcodeClick}
          title="Scan Barcode / SKU"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-[#b92b10] rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <ScanBarcode className="w-5 h-5 stroke-[1.75]" />
        </button>
      </div>

      {/* Barcode feedback banner */}
      {barcodeAlert && (
        <div className="px-3.5 py-2 rounded-xl bg-red-50 border border-red-100 text-[#b92b10] text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-[#b92b10] shrink-0" />
          <span>{barcodeAlert}</span>
        </div>
      )}

      {/* Category Pills (Semua, Makanan, Minuman, Snack) */}
      <CategoryFilter />

      {/* Product Grid (2 Columns on Mobile / Tablet) */}
      <div className="flex-1 overflow-y-auto pr-0.5">
        {displayedProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pb-24 lg:pb-6">
            {displayedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-slate-200 mt-4 shadow-xs">
            <PackageX className="w-12 h-12 text-slate-400 mb-3" />
            <h4 className="text-base font-bold text-slate-800">Produk Tidak Ditemukan</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Coba kata kunci lain atau pilih kategori &quot;Semua&quot; untuk menampilkan katalog produk.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
