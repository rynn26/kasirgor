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

  const [isOwner, setIsOwner] = useState<boolean | null>(true);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('Makanan & Snack');
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
          setIsOwner(parsed.role !== 'kasir');
        } catch {
          setIsOwner(true);
        }
      } else {
        setIsOwner(true);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Silakan masukkan nama produk');
      return;
    }

    const numPrice = Number(sellingPrice) || 0;
    const numCostPrice = Number(costPrice) || 0;

    if (isOwner && numPrice <= 0) {
      showToast('Silakan masukkan harga jual yang valid');
      return;
    }

    setIsSubmitting(true);

    try {
      const numStock = Number(stock) || 0;
      const autoSku = `PRD-${Math.floor(1000 + Math.random() * 9000)}`;

      await addProduct({
        name,
        category: (category || 'Makanan & Snack') as any,
        sku: autoSku,
        price: numPrice,
        costPrice: numCostPrice > 0 ? numCostPrice : undefined,
        stock: numStock,
        unit: unit || 'pcs',
        description: description.trim() || undefined,
        isAvailable: numStock > 0,
      });

      showToast(isOwner 
        ? `Produk "${name}" berhasil disimpan ke database` 
        : `Produk "${name}" berhasil diinput! Penetapan harga akan ditentukan oleh Owner.`
      );
      router.push('/produk');
    } catch (err: any) {
      console.error('Gagal simpan produk:', err);
      const msg = err?.message || err?.error_description || 'Gagal menyimpan produk. Coba lagi.';
      showToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24 max-w-2xl mx-auto">
      
      {/* ============================================================ */}
      {/* TOP NAVBAR */}
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
          {isOwner ? 'Tambah Produk (Owner)' : 'Tambah Produk Baru (Kasir)'}
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
                <option value="Makanan & Snack">Makanan & Snack</option>
                <option value="Minuman Dingin">Minuman Dingin</option>
                <option value="Perlengkapan Olahraga">Perlengkapan Olahraga</option>
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
        {isOwner ? (
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
                  Harga Jual *
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
        ) : (
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-slate-700 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>Harga Modal & Harga Jual Dilindungi</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Sebagai Kasir, Anda dapat menginput nama produk, kategori, dan stok fisik. Penetapan harga modal dan harga jual hanya dapat dilihat dan diatur oleh <strong>Owner</strong>.
            </p>
          </div>
        )}

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
