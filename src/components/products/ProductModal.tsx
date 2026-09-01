'use client';

import React, { useState, useEffect } from 'react';
import { Product, ProductCategory } from '@/types/pos';
import { useProductStore } from '@/lib/store/useProductStore';
import { X, Save, PackagePlus, Image as ImageIcon } from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  productToEdit?: Product | null;
  onClose: () => void;
}

const CATEGORIES: ProductCategory[] = [
  'Peralatan & Raket',
  'Aksesoris & Grip',
  'Pakaian & Kaos Kaki',
  'Minuman Dingin',
  'Makanan',
  'Snack & Cemilan',
];

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  productToEdit,
  onClose,
}) => {
  const { addProduct, updateProduct } = useProductStore();

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Peralatan & Raket');
  const [price, setPrice] = useState<string>('');
  const [costPrice, setCostPrice] = useState<string>('');
  const [stock, setStock] = useState<string>('50');
  const [unit, setUnit] = useState('pcs');
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setSku(productToEdit.sku);
      setCategory(productToEdit.category);
      setPrice(productToEdit.price.toString());
      setCostPrice(productToEdit.costPrice?.toString() || '');
      setStock(productToEdit.stock.toString());
      setUnit(productToEdit.unit);
      setImage(productToEdit.image || '');
      setDescription(productToEdit.description || '');
    } else {
      // New product defaults
      setName('');
      setSku(`SKU-${Math.floor(100 + Math.random() * 900)}`);
      setCategory('Peralatan & Raket');
      setPrice('');
      setCostPrice('');
      setStock('50');
      setUnit('pcs');
      setImage('');
      setDescription('');
    }
  }, [productToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) return;

    const numPrice = Number(price) || 0;
    const numCostPrice = Number(costPrice) || 0;
    const numStock = Number(stock) || 0;

    if (productToEdit) {
      updateProduct(productToEdit.id, {
        name,
        sku,
        category,
        price: numPrice,
        costPrice: numCostPrice,
        stock: numStock,
        unit,
        image: image.trim() || undefined,
        description: description.trim() || undefined,
        isAvailable: numStock > 0,
      });
    } else {
      addProduct({
        name,
        sku,
        category,
        price: numPrice,
        costPrice: numCostPrice,
        stock: numStock,
        unit,
        image: image.trim() || undefined,
        description: description.trim() || undefined,
        isAvailable: numStock > 0,
      });
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-[#b92b10] border border-red-100 flex items-center justify-center">
              <PackagePlus className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base text-slate-900">
              {productToEdit ? 'Edit Data Produk' : 'Tambah Produk Jualan Baru'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto bg-white">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Nama Produk / Barang Jualan *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Shuttlecock Samurai Hijau / Pocari Sweat"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#b92b10] focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Kategori *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#b92b10] focus:bg-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Kode SKU / Barcode
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="SKU-101"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-mono focus:outline-none focus:border-[#b92b10] focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Harga Jual (Rp) *
              </label>
              <input
                type="number"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="25000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-black focus:outline-none focus:border-[#b92b10] focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Harga Modal (Opsional)
              </label>
              <input
                type="number"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="15000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#b92b10] focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Jumlah Stok Awal
              </label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="50"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#b92b10] focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Satuan (Unit)
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="pcs / slop / botol / porsi"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#b92b10] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              URL Foto Produk (Opsional)
            </label>
            <div className="relative">
              <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#b92b10] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Deskripsi Singkat
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi spesifikasi barang atau rasa makanan..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#b92b10] focus:bg-white"
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center space-x-1.5 px-5 py-2.5 bg-[#b92b10] hover:bg-[#a3250d] text-white font-bold rounded-xl text-xs shadow-md shadow-[#b92b10]/25 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Produk</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
