'use client';

import React, { useState, useEffect } from 'react';
import { useProductStore } from '@/lib/store/useProductStore';
import { formatRupiah } from '@/lib/utils';
import { Product } from '@/types/pos';
import { ProductDetailModal } from '@/components/products/ProductDetailModal';
import { 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Layers,
  Edit3,
  ChevronRight
} from 'lucide-react';

export const ProductTable: React.FC = () => {
  const { products } = useProductStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('Semua');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isOwner, setIsOwner] = useState(false);

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

  const categories = [
    'Semua', 
    'Makanan & Snack',
    'Minuman Dingin',
    'Perlengkapan Olahraga',
  ];

  const filtered = products.filter((p) => {
    const matchCategory =
      selectedCat === 'Semua' ||
      p.category === selectedCat ||
      (selectedCat === 'Makanan & Snack' && (p.category === 'Makanan' || p.category === 'Snack & Cemilan')) ||
      (selectedCat === 'Perlengkapan Olahraga' && (p.category === 'Peralatan & Raket' || p.category === 'Aksesoris & Grip' || p.category === 'Pakaian & Kaos Kaki'));
    const matchSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="space-y-4">
      {/* Search & Category Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama barang jualan..."
            className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#eb4b2b] focus:bg-white"
          />
        </div>

        {/* Category Dropdown */}
        <div className="relative">
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#eb4b2b] focus:bg-white cursor-pointer"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Responsive Product Cards List with Click to Open Detail/CRUD */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((prod) => {
            const isOutOfStock = prod.stock <= 0;
            const isLow = prod.stock > 0 && prod.stock <= 5;

            return (
              <div
                key={prod.id}
                onClick={() => setSelectedProduct(prod)}
                className="bg-white rounded-3xl p-4 border border-slate-200 hover:border-[#eb4b2b]/60 shadow-xs hover:shadow-md flex flex-col justify-between space-y-3 transition-all cursor-pointer group"
              >
                {/* Top: Category & Status Badge */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-[10px] font-bold text-slate-700 border border-slate-200">
                      {prod.category}
                    </span>
                  </div>

                  {/* Stock Status Badge */}
                  <div>
                    {isOutOfStock ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                        <XCircle className="w-3 h-3" />
                        <span>Stok Habis</span>
                      </span>
                    ) : isLow ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Sisa {prod.stock} {prod.unit}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Tersedia</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle: Product Name */}
                <div className="py-0.5">
                  <h4 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-[#eb4b2b] transition-colors line-clamp-2">
                    {prod.name}
                  </h4>
                </div>

                {/* Bottom Row: Price & Stock Amount Summary + Quick Edit indicator */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  {isOwner ? (
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        Harga Jual
                      </span>
                      <span className="text-base font-black text-[#eb4b2b]">
                        {formatRupiah(prod.price)}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        Harga
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400 italic">
                        Khusus Owner
                      </span>
                    </div>
                  )}

                  <div className="text-right flex items-center gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        Sisa Stok
                      </span>
                      <span className="text-xs font-black text-slate-800">
                        {prod.stock} {prod.unit}
                      </span>
                    </div>

                    <div className="w-7 h-7 rounded-xl bg-slate-50 group-hover:bg-red-50 text-slate-400 group-hover:text-[#eb4b2b] flex items-center justify-center transition-colors">
                      <Edit3 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-xs space-y-2">
          <Layers className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="font-bold text-sm text-slate-800">Tidak Ada Produk Ditemukan</h4>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Coba ubah kata kunci pencarian atau pilih kategori lain.
          </p>
        </div>
      )}

      {/* Product Detail & CRUD Modal */}
      <ProductDetailModal
        isOpen={Boolean(selectedProduct)}
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        isOwner={isOwner}
      />
    </div>
  );
};
