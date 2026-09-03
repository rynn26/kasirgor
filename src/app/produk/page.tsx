'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProductTable } from '@/components/products/ProductTable';
import { useProductStore } from '@/lib/store/useProductStore';
import { Package, ShieldCheck, Lock } from 'lucide-react';

export default function ProdukPage() {
  const { loadProducts, isLoading } = useProductStore();
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    loadProducts();
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

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto overflow-y-auto pb-24">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-5 sm:p-6 bg-white rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#eb4b2b] border border-red-100 flex items-center justify-center shadow-xs">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Katalog & Stok Barang Toko
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Informasi ketersediaan stok barang jualan, perlengkapan olahraga, minuman dingin, dan makanan kasir.
            </p>
          </div>
        </div>

        {/* Action Button: Visible for both Owner and Kasir */}
        <Link
          href="/produk/tambah"
          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#eb4b2b] hover:bg-[#d43a1c] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-[#eb4b2b]/25 transition-all cursor-pointer"
        >
          <span>+ Tambah Produk</span>
        </Link>
      </div>

      {/* Main Stock Table / Cards */}
      <ProductTable />
    </div>
  );
}
