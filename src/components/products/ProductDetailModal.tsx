'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  Save, 
  Plus, 
  Minus, 
  Package, 
  Tag, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Edit3,
  Layers,
  Lock,
  DollarSign
} from 'lucide-react';
import { Product, ProductCategory } from '@/types/pos';
import { useProductStore } from '@/lib/store/useProductStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { formatRupiah } from '@/lib/utils';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  isOwner?: boolean;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  isOwner = true,
}) => {
  const { updateProduct, deleteProduct, updateStock } = useProductStore();
  const { showToast } = useToastStore();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Makanan & Snack');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState(0);
  const [unit, setUnit] = useState('pcs');
  const [description, setDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name);
      let cat = product.category;
      if (cat === 'Makanan' || cat === 'Snack & Cemilan') cat = 'Makanan & Snack';
      if (cat === 'Peralatan & Raket' || cat === 'Aksesoris & Grip' || cat === 'Pakaian & Kaos Kaki') cat = 'Perlengkapan Olahraga';
      setCategory(cat);
      setSku(product.sku);
      setPrice(product.price ? String(product.price) : '');
      setCostPrice(product.costPrice ? String(product.costPrice) : '');
      setStock(product.stock);
      setUnit(product.unit || 'pcs');
      setDescription(product.description || '');
      setIsEditing(false);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const numPrice = Number(price) || 0;
  const numCost = Number(costPrice) || 0;
  const margin = numPrice > 0 && numCost > 0 ? numPrice - numCost : 0;
  const marginPercent = numPrice > 0 && numCost > 0 ? Math.round((margin / numPrice) * 100) : 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Nama produk tidak boleh kosong');
      return;
    }
    if (isOwner && numPrice <= 0) {
      showToast('Harga jual harus lebih dari 0');
      return;
    }

    try {
      await updateProduct(product.id, {
        name,
        category,
        sku,
        price: isOwner ? numPrice : product.price,
        costPrice: isOwner ? (numCost > 0 ? numCost : undefined) : product.costPrice,
        stock,
        unit,
        description: description.trim() || undefined,
        isAvailable: stock > 0,
      });
      showToast(`Produk "${name}" berhasil diperbarui`);
      setIsEditing(false);
      onClose();
    } catch (err) {
      showToast('Gagal memperbarui produk. Coba lagi.');
    }
  };

  const handleDelete = async () => {
    if (confirm(`Yakin ingin menghapus produk "${product.name}" dari inventaris toko?`)) {
      try {
        await deleteProduct(product.id);
        showToast(`Produk "${product.name}" telah dihapus`);
        onClose();
      } catch (err) {
        showToast('Gagal menghapus produk. Coba lagi.');
      }
    }
  };

  const handleAdjustStock = async (delta: number) => {
    const newStock = Math.max(0, stock + delta);
    setStock(newStock);
    try {
      await updateStock(product.id, delta);
      showToast(`Stok "${product.name}" disesuaikan menjadi ${newStock} ${unit}`);
    } catch (err) {
      setStock(stock); // revert on error
      showToast('Gagal menyesuaikan stok. Coba lagi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
        
        {/* ============================================================ */}
        {/* 1. MODAL TOP BAR */}
        {/* ============================================================ */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#eb4b2b] border border-red-100 flex items-center justify-center font-black shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-700 border border-slate-200">
                  {product.category}
                </span>
              </div>
              <h3 className="font-black text-base text-slate-900 leading-tight mt-0.5">
                Detail & CRUD Produk
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ============================================================ */}
        {/* 2. QUICK STOCK ADJUSTMENT STEPPER (Bisa diakses Kasir & Owner) */}
        {/* ============================================================ */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Manajemen Stok Cepat
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              stock <= 0 
                ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                : stock <= 5 
                ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              {stock <= 0 ? 'Stok Habis' : stock <= 5 ? 'Stok Menipis' : 'Stok Tersedia'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Sisa Stok Fisik</span>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {stock} <span className="text-xs font-bold text-slate-400">{unit}</span>
              </div>
            </div>

            {/* Stepper Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAdjustStock(-1)}
                disabled={stock <= 0}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold flex items-center justify-center transition-colors cursor-pointer"
                title="Kurangi 1"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleAdjustStock(1)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-colors cursor-pointer"
                title="Tambah 1"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleAdjustStock(5)}
                className="px-2.5 h-9 rounded-xl bg-red-50 hover:bg-red-100 text-[#eb4b2b] font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                title="Tambah 5"
              >
                +5
              </button>
              <button
                type="button"
                onClick={() => handleAdjustStock(10)}
                className="px-2.5 h-9 rounded-xl bg-red-50 hover:bg-red-100 text-[#eb4b2b] font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                title="Tambah 10"
              >
                +10
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. FORM EDIT PRODUK (CRUD) */}
        {/* ============================================================ */}
        <form onSubmit={handleSave} className="space-y-3.5">
          {/* Nama Produk */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Nama Produk</label>
            <input
              type="text"
              required
              disabled={!isOwner}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white disabled:bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-[#eb4b2b] transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Kategori */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Kategori</label>
              <select
                disabled={!isOwner}
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full px-3.5 py-2.5 bg-white disabled:bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#eb4b2b] cursor-pointer"
              >
                <option value="Makanan & Snack">Makanan & Snack</option>
                <option value="Minuman Dingin">Minuman Dingin</option>
                <option value="Perlengkapan Olahraga">Perlengkapan Olahraga</option>
              </select>
            </div>

            {/* Satuan Unit */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Satuan Unit</label>
              <input
                type="text"
                disabled={!isOwner}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="porsi / gelas / pcs / slop"
                className="w-full px-3.5 py-2.5 bg-white disabled:bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#eb4b2b]"
              />
            </div>
          </div>

          {/* Pricing Grid */}
          {isOwner ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {/* Harga Jual */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Harga Jual (Rp) *</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-[#eb4b2b]"
                  />
                </div>

                {/* Harga Modal */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Harga Modal (Rp)</label>
                  <input
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#eb4b2b]"
                  />
                </div>
              </div>

              {/* Margin Keuntungan Preview */}
              {numPrice > 0 && numCost > 0 && (
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs flex items-center justify-between text-emerald-800">
                  <span className="font-medium flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    Estimasi Profit / Margin:
                  </span>
                  <span className="font-black text-emerald-700">
                    {formatRupiah(margin)} / {unit} ({marginPercent}%)
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center gap-2.5 text-slate-600">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Harga modal & harga jual hanya dapat dilihat dan diatur oleh <strong>Owner</strong>.</span>
            </div>
          )}

          {/* ============================================================ */}
          {/* 4. ACTIONS */}
          {/* ============================================================ */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            {isOwner && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3.5 py-2.5 rounded-xl text-red-600 hover:bg-red-50 border border-red-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                title="Hapus Produk"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Hapus</span>
              </button>
            )}

            <div className={`flex items-center space-x-2 ${!isOwner ? 'w-full justify-end' : ''}`}>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl cursor-pointer"
              >
                Tutup
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#eb4b2b] hover:bg-[#d43a1c] text-white font-bold text-xs shadow-md shadow-[#eb4b2b]/25 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
