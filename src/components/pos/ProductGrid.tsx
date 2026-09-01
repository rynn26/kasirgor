'use client';

import React, { useState, useRef } from 'react';
import { useProductStore } from '@/lib/store/useProductStore';
import { useCartStore } from '@/lib/store/useCartStore';
import { ProductCard } from './ProductCard';
import { CategoryFilter } from './CategoryFilter';
import { Search, ScanBarcode, X, PackageX, Sparkles } from 'lucide-react';

export const ProductGrid: React.FC = () => {
  const { searchQuery, setSearchQuery, filteredProducts, products } = useProductStore();
  const { addItem } = useCartStore();
  const [barcodeAlert, setBarcodeAlert] = useState<string | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showBarcodeInput, setShowBarcodeInput] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const displayedProducts = filteredProducts();

  const handleBarcodeClick = () => {
    setShowBarcodeInput(true);
    setBarcodeInput('');
    setTimeout(() => barcodeInputRef.current?.focus(), 50);
  };

  const handleBarcodeSubmit = () => {
    const code = barcodeInput.trim();
    if (!code) {
      setShowBarcodeInput(false);
      return;
    }

    // Search by barcode or SKU first, then by name
    const byBarcode = products.find((p) => p.barcode === code);
    if (byBarcode) {
      if (byBarcode.stock > 0) {
        addItem(byBarcode);
        setBarcodeAlert(`Scan Berhasil: "${byBarcode.name}"`);
      } else {
        setBarcodeAlert(`"${byBarcode.name}" stok habis`);
      }
    } else {
      // Try matching by name (partial)
      const byName = products.find(
        (p) => p.name.toLowerCase().includes(code.toLowerCase())
      );
      if (byName) {
        if (byName.stock > 0) {
          addItem(byName);
          setBarcodeAlert(`Scan Berhasil: "${byName.name}"`);
        } else {
          setBarcodeAlert(`"${byName.name}" stok habis`);
        }
      } else {
        setBarcodeAlert(`Produk dengan kode "${code}" tidak ditemukan`);
      }
    }

    setBarcodeInput('');
    setShowBarcodeInput(false);
    setTimeout(() => setBarcodeAlert(null), 3000);
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
        
        {/* Barcode Scanner Icon Button */}
        <button
          type="button"
          onClick={handleBarcodeClick}
          title="Scan Barcode / SKU"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-[#b92b10] rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <ScanBarcode className="w-5 h-5 stroke-[1.75]" />
        </button>
      </div>

      {/* Barcode Input Modal */}
      {showBarcodeInput && (
        <div className="bg-white border border-[#b92b10]/30 rounded-2xl p-3 shadow-md">
          <div className="flex items-center gap-2">
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleBarcodeSubmit();
                if (e.key === 'Escape') setShowBarcodeInput(false);
              }}
              placeholder="Masukkan kode barcode / SKU / nama produk..."
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#b92b10] focus:bg-white"
            />
            <button
              type="button"
              onClick={handleBarcodeSubmit}
              className="px-3 py-2 bg-[#b92b10] text-white rounded-xl text-xs font-bold hover:bg-[#a3250d] transition-colors cursor-pointer"
            >
              Cari
            </button>
            <button
              type="button"
              onClick={() => setShowBarcodeInput(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
