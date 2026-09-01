'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldAlert, Lock, ArrowRight } from 'lucide-react';
import { useProductStore } from '@/lib/store/useProductStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { formatNumber, parseNumberInput } from '@/lib/utils';

export default function TambahProdukOwnerPage() {
  const router = useRouter();
  const { addProduct } = useProductStore();
  const { showToast } = useToastStore();

  const [isOwner, setIsOwner] = useState<boolean | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<any>('Makanan');
  const [unit, setUnit] = useState('pcs');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [minStock, setMinStock] = useState('0');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('kasir_session');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          setIsOwner(parsed.role === 'owner');
        } catch {
          setIsOwner(false);
        }
      } else {
        setIsOwner(false);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Silakan masukkan nama produk');
      return;
    }

    if (!sellingPrice || Number(sellingPrice) <= 0) {
      showToast('Silakan masukkan harga jual yang valid');
      return;
    }

    setIsSubmitting(true);

    try {
      const numPrice = Number(sellingPrice) || 0;
      const numCostPrice = Number(costPrice) || 0;
      const numStock = Number(stock) || 0;
      const autoSku = `PRD-${Math.floor(1000 + Math.random() * 9000)}`;

      await addProduct({
        name,
        category: category || 'Makanan',
        sku: autoSku,
        price: numPrice,
        costPrice: numCostPrice > 0 ? numCostPrice : undefined,
        stock: numStock,
        unit: unit || 'pcs',
        description: description.trim() || undefined,
        isAvailable: numStock > 0,
      });

      showToast(`Produk "${name}" berhasil disimpan ke database`);
      router.push('/produk');
    } catch (err: any) {
      console.error('Gagal simpan produk:', err);
      const msg = err?.message || err?.error_description || 'Gagal menyimpan produk. Coba lagi.';
      showToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If user is Cashier, block access and display notification
  if (isOwner === false) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center border border-slate-200 shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-black text-slate-900">Akses Dibatasi</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Hanya akun dengan peran <strong>Owner / Pemilik</strong> yang memiliki wewenang untuk menambah produk baru ke inventori toko.
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={() => router.push('/produk')}
              className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Kembali ke Katalog Produk
            </button>

            <button
              type="button"
              onClick={() => router.push('/kasir')}
              className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Masuk ke Kasir POS
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f8fafc] max-w-md mx-auto relative pb-32">
      
      {/* ============================================================ */}
      {/* 1. HEADER: ← Tambah Produk */}
      {/* ============================================================ */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 -ml-2 text-[#eb4b2b] hover:bg-red-50 rounded-full transition-colors cursor-pointer"
          title="Kembali"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <h1 className="text-base font-bold text-[#eb4b2b] tracking-tight">
          Tambah Produk (Owner)
        </h1>

        <div className="w-7" />
      </div>

      {/* Main Form Body */}
      <form onSubmit={handleSubmit} className="p-4 space-y-3.5">

        {/* ============================================================ */}
        {/* CARD 1: INFORMASI DASAR */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
          <h2 className="text-xs sm:text-sm font-bold text-slate-900">
            Informasi Dasar
          </h2>

          {/* Nama Produk */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">
              Nama Produk *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Kopi Susu Aren"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#eb4b2b] focus:ring-1 focus:ring-[#eb4b2b]/20 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Kategori */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#eb4b2b] cursor-pointer"
              >
                <option value="Makanan">Makanan</option>
                <option value="Minuman Dingin">Minuman Dingin</option>
                <option value="Snack & Cemilan">Snack & Cemilan</option>
                <option value="Peralatan & Raket">Peralatan & Raket</option>
                <option value="Aksesoris & Grip">Aksesoris & Grip</option>
                <option value="Pakaian & Kaos Kaki">Pakaian & Kaos Kaki</option>
              </select>
            </div>

            {/* Satuan Unit */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">
                Satuan Unit
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="pcs / gelas / porsi / slop"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#eb4b2b]"
              />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CARD 2: HARGA */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
          <h2 className="text-xs sm:text-sm font-bold text-slate-900">
            Harga
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {/* Harga Modal */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">
                Harga Modal
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={costPrice ? formatNumber(costPrice) : ''}
                  onChange={(e) => setCostPrice(parseNumberInput(e.target.value).toString())}
                  placeholder="Contoh: 10.000"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#eb4b2b] focus:ring-1 focus:ring-[#eb4b2b]/20 transition-all"
                />
              </div>
            </div>

            {/* Harga Jual */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">
                Harga Jual
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={sellingPrice ? formatNumber(sellingPrice) : ''}
                  onChange={(e) => setSellingPrice(parseNumberInput(e.target.value).toString())}
                  placeholder="Contoh: 15.000"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:border-[#eb4b2b] focus:ring-1 focus:ring-[#eb4b2b]/20 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CARD 3: STOK & INVENTORI */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
          <h2 className="text-xs sm:text-sm font-bold text-slate-900">
            Stok & Inventori
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {/* Jumlah Stok */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">
                Jumlah Stok
              </label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#eb4b2b] focus:ring-1 focus:ring-[#eb4b2b]/20 transition-all"
              />
            </div>

            {/* Minimum Stok */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">
                Minimum Stok
              </label>
              <input
                type="number"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#eb4b2b] focus:ring-1 focus:ring-[#eb4b2b]/20 transition-all"
              />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* BUTTON: SIMPAN PRODUK */}
        {/* ============================================================ */}
        <div className="pt-3 pb-8">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 px-6 rounded-2xl bg-[#eb4b2b] hover:bg-[#d43a1c] active:scale-[0.99] text-white font-black text-sm tracking-wider uppercase shadow-xl shadow-[#eb4b2b]/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>MENYIMPAN PRODUK...</span>
            ) : (
              <span>SIMPAN PRODUK</span>
            )}
          </button>
        </div>

      </form>

    </div>
  );
}
