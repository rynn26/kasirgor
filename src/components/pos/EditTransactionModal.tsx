'use client';

import React, { useState, useEffect } from 'react';
import { Transaction, CartItem, Product, PaymentMethod } from '@/types/pos';
import { useProductStore } from '@/lib/store/useProductStore';
import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { formatRupiah } from '@/lib/utils';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Search,
  Save,
  ShoppingBag,
  CreditCard,
  QrCode,
  Banknote,
  Check,
  AlertCircle
} from 'lucide-react';

interface EditTransactionModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onSuccess: (updated: Transaction) => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  transaction,
  onClose,
  onSuccess,
}) => {
  const { products, loadProducts } = useProductStore();
  const { updateTransaction } = useTransactionStore();
  const { showToast } = useToastStore();

  const [items, setItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (transaction) {
      setItems(JSON.parse(JSON.stringify(transaction.items)));
      setCustomerName(transaction.customerName || '');
      setPaymentMethod(transaction.paymentMethod);
      setIsAddingProduct(false);
      setProductSearch('');
    }
  }, [transaction, isOpen]);

  if (!isOpen || !transaction) return null;

  const handleQtyChange = (index: number, delta: number) => {
    const updated = [...items];
    const newQty = updated[index].quantity + delta;
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].quantity = newQty;
    }
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  const handleAddProduct = (product: Product) => {
    const existingIndex = items.findIndex((i) => i.product.id === product.id || i.product.name === product.name);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          product,
          quantity: 1,
          discountPerItem: 0,
        },
      ]);
    }
    setIsAddingProduct(false);
    setProductSearch('');
    showToast(`Ditambahkan: ${product.name}`);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  };

  const subtotal = calculateSubtotal();

  const handleSave = async () => {
    if (items.length === 0) {
      showToast('Transaksi harus memiliki minimal 1 item. Jika ingin menghapus seluruh transaksi, gunakan tombol Batalkan/Hapus.');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateTransaction(transaction.id, {
        items,
        paymentMethod,
        customerName: customerName.trim() || undefined,
        amountPaid: subtotal,
      });

      showToast('✅ Transaksi berhasil diperbarui!');
      onSuccess(updated);
      onClose();
    } catch {
      showToast('Gagal memperbarui transaksi');
    } finally {
      setSaving(false);
    }
  };

  const filteredCatalog = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <h3 className="font-black text-slate-900 text-base sm:text-lg leading-tight">
              Edit Transaksi
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Ubah item pesanan atau metode pembayaran
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* Customer Name */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Nama Pelanggan (Opsional)
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Contoh: Budi"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#b92b10] focus:bg-white transition-all"
            />
          </div>

          {/* Items List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Daftar Item Pesanan ({items.length})
              </label>
              <button
                type="button"
                onClick={() => setIsAddingProduct(!isAddingProduct)}
                className="text-xs font-bold text-[#b92b10] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAddingProduct ? 'Tutup Pilihan' : '+ Tambah Produk Lain'}</span>
              </button>
            </div>

            {/* Product Catalog Picker (If open) */}
            {isAddingProduct && (
              <div className="p-3 bg-red-50/50 border border-red-100 rounded-2xl space-y-2 animate-in slide-in-from-top-2 duration-150">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari produk (misal: Indomie, Kopi, Air)..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#b92b10]"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {filteredCatalog.map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleAddProduct(prod)}
                      className="w-full p-2 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between text-left text-xs transition-colors cursor-pointer"
                    >
                      <div>
                        <span className="font-bold text-slate-900 block">{prod.name}</span>
                        <span className="text-[10px] text-slate-400">{prod.category}</span>
                      </div>
                      <span className="font-bold text-[#b92b10]">{formatRupiah(prod.price)}</span>
                    </button>
                  ))}
                  {filteredCatalog.length === 0 && (
                    <p className="text-center text-xs text-slate-400 py-3">Produk tidak ditemukan</p>
                  )}
                </div>
              </div>
            )}

            {/* Existing Items in Cart */}
            <div className="space-y-1.5">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs text-slate-900 truncate">
                      {item.product.name}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {formatRupiah(item.product.price)} × {item.quantity} ={' '}
                      <span className="font-bold text-slate-800">
                        {formatRupiah(item.product.price * item.quantity)}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5">
                      <button
                        type="button"
                        onClick={() => handleQtyChange(idx, -1)}
                        className="w-6 h-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-700 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-black text-xs text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(idx, 1)}
                        className="w-6 h-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-700 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      title="Hapus item ini"
                      className="p-1.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {items.length === 0 && (
                <div className="p-4 text-center bg-red-50/50 border border-red-100 rounded-2xl text-xs text-red-600 font-medium">
                  Semua item telah dihapus. Silakan tambahkan produk baru di atas.
                </div>
              )}
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-700 block">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'CASH', label: 'Tunai', icon: Banknote },
                { id: 'QRIS', label: 'QRIS', icon: QrCode },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#b92b10] text-white border-[#b92b10] shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Total Summary Box */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Pembayaran Baru</span>
              <span className="text-xs text-slate-300">{items.reduce((s, i) => s + i.quantity, 0)} Item</span>
            </div>
            <div className="text-lg font-black text-white">
              {formatRupiah(subtotal)}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex gap-2 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || items.length === 0}
            className="flex-2 py-2.5 px-4 rounded-2xl bg-[#b92b10] hover:bg-[#a3250d] text-white font-bold text-xs shadow-md shadow-[#b92b10]/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
