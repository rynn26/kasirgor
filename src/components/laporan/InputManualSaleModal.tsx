'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Save, 
  ShoppingBag, 
  Banknote, 
  QrCode, 
  CreditCard,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { useProductStore } from '@/lib/store/useProductStore';
import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { formatRupiah, generateInvoiceNumber, formatNumber, parseNumberInput } from '@/lib/utils';
import { PaymentMethod, CartItem } from '@/types/pos';

interface InputManualSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const InputManualSaleModal: React.FC<InputManualSaleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { products, loadProducts, updateStock } = useProductStore();
  const { addTransaction } = useTransactionStore();
  const { showToast } = useToastStore();

  // Default yesterday's date
  const yesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const [date, setDate] = useState(yesterdayStr());
  const [time, setTime] = useState('17:00');
  const [cashierName, setCashierName] = useState('Owner Toko');
  const [customerName, setCustomerName] = useState('Pelanggan Umum');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [inputMode, setInputMode] = useState<'REKAP' | 'DETAIL'>('REKAP');

  // Rekap Mode State
  const [rekapDescription, setRekapDescription] = useState('Penjualan Kasir Toko & F&B Kemarin');
  const [rekapTotal, setRekapTotal] = useState<string>('250000');

  // Detail Mode State (List of items)
  const [selectedItems, setSelectedItems] = useState<{ productId: string; qty: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (products.length === 0) {
      loadProducts();
    }
  }, [products.length, loadProducts]);

  useEffect(() => {
    if (isOpen) {
      setDate(yesterdayStr());
      setTime('17:00');
      setSelectedItems([]);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate detail total
  const detailItems: CartItem[] = selectedItems
    .map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) return null;
      return {
        product: prod,
        quantity: item.qty,
        discountPerItem: 0,
      };
    })
    .filter(Boolean) as CartItem[];

  const detailGrandTotal = detailItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const finalGrandTotal =
    inputMode === 'REKAP' ? Number(rekapTotal) || 0 : detailGrandTotal;

  const handleAddItem = (prodId: string) => {
    const existing = selectedItems.find((i) => i.productId === prodId);
    if (existing) {
      setSelectedItems(
        selectedItems.map((i) =>
          i.productId === prodId ? { ...i, qty: i.qty + 1 } : i
        )
      );
    } else {
      setSelectedItems([...selectedItems, { productId: prodId, qty: 1 }]);
    }
  };

  const handleUpdateQty = (prodId: string, qty: number) => {
    if (qty <= 0) {
      setSelectedItems(selectedItems.filter((i) => i.productId !== prodId));
    } else {
      setSelectedItems(
        selectedItems.map((i) =>
          i.productId === prodId ? { ...i, qty } : i
        )
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (finalGrandTotal <= 0) {
      showToast('Total nominal penjualan harus lebih dari Rp 0');
      return;
    }

    setIsSubmitting(true);

    try {
      const finalCreatedAt = new Date(`${date}T${time}:00.000Z`).toISOString();

      let itemsPayload: CartItem[] = [];

      if (inputMode === 'REKAP') {
        // Generic synthetic item for rekap
        itemsPayload = [
          {
            product: {
              id: 'rekap-manual',
              sku: 'REKAP-01',
              name: rekapDescription.trim() || 'Rekap Penjualan Toko',
              category: 'Makanan & Snack',
              price: finalGrandTotal,
              stock: 0,
              unit: 'paket',
              isAvailable: true,
            },
            quantity: 1,
            discountPerItem: 0,
          },
        ];
      } else {
        if (detailItems.length === 0) {
          showToast('Silakan pilih minimal satu produk toko');
          setIsSubmitting(false);
          return;
        }
        itemsPayload = detailItems;

        // Optionally reduce stock
        for (const item of detailItems) {
          await updateStock(item.product.id, -item.quantity);
        }
      }

      await addTransaction({
        invoiceNumber: generateInvoiceNumber(),
        createdAt: finalCreatedAt,
        cashierName: cashierName.trim() || 'Owner',
        customerName: customerName.trim() || 'Pelanggan Umum',
        items: itemsPayload,
        subtotal: finalGrandTotal,
        discountTotal: 0,
        taxTotal: 0,
        serviceTotal: 0,
        grandTotal: finalGrandTotal,
        paymentMethod,
        amountPaid: finalGrandTotal,
        change: 0,
        status: 'COMPLETED',
        notes: `[Input Manual Owner] Tanggal Transaksi: ${date}`,
      });

      showToast(`Data penjualan tanggal ${date} berhasil dicatat ke laporan!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Gagal mencatat penjualan manual:', err);
      showToast('Gagal menyimpan data penjualan. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-amber-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md shadow-amber-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px] uppercase tracking-wide">
                  Khusus Owner
                </span>
              </div>
              <h3 className="font-black text-base text-slate-900 leading-tight mt-0.5">
                Input Penjualan Kemarin / Manual
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          
          {/* Tanggal & Waktu Transaksi */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <span className="font-bold text-slate-800 text-xs block">
              1. Waktu Transaksi Yang Dicatat
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">
                  Tanggal Penjualan *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-amber-600 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">
                  Jam Transaksi
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Mode Input: Rekap Cepat vs Rincian Produk */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 block text-xs">
              2. Metode Pengisian Data
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setInputMode('REKAP')}
                className={`py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  inputMode === 'REKAP'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>⚡ Rekap Total Cepat</span>
              </button>

              <button
                type="button"
                onClick={() => setInputMode('DETAIL')}
                className={`py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  inputMode === 'DETAIL'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>📦 Rincian Per Produk</span>
              </button>
            </div>
          </div>

          {/* Form Mode Rekap */}
          {inputMode === 'REKAP' ? (
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70 space-y-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">
                  Keterangan / Deskripsi Penjualan
                </label>
                <input
                  type="text"
                  required
                  value={rekapDescription}
                  onChange={(e) => setRekapDescription(e.target.value)}
                  placeholder="Misal: Penjualan Makanan & Minuman Kemarin"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">
                  Total Nominal Omzet (Rp) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={rekapTotal ? formatNumber(rekapTotal) : ''}
                    onChange={(e) => setRekapTotal(parseNumberInput(e.target.value).toString())}
                    placeholder="Contoh: 350.000"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-base font-black text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Form Mode Detail Produk */
            <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  Pilih Produk Toko
                </label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddItem(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="">+ Klik untuk menambahkan barang...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatRupiah(p.price)} (Stok: {p.stock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* List selected items */}
              {selectedItems.length === 0 ? (
                <div className="p-4 bg-white rounded-xl border border-dashed border-slate-300 text-center text-slate-400">
                  Belum ada produk yang dipilih
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedItems.map((item) => {
                    const prod = products.find((p) => p.id === item.productId);
                    if (!prod) return null;
                    return (
                      <div
                        key={item.productId}
                        className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200"
                      >
                        <div>
                          <h4 className="font-bold text-slate-900 line-clamp-1">{prod.name}</h4>
                          <span className="text-[11px] text-slate-400">
                            {formatRupiah(prod.price)} / {prod.unit}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(item.productId, item.qty - 1)}
                              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold"
                            >
                              -
                            </button>
                            <span className="px-2 py-1 font-black text-slate-800 text-xs min-w-[28px] text-center">
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(item.productId, item.qty + 1)}
                              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold"
                            >
                              +
                            </button>
                          </div>

                          <span className="font-black text-slate-800 w-20 text-right">
                            {formatRupiah(prod.price * item.qty)}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.productId, 0)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded-md"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Pembayaran & Kasir */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">
                Metode Pembayaran
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="CASH">Tunai (Cash)</option>
                <option value="QRIS">QRIS</option>
                <option value="TRANSFER">Transfer Bank</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">
                Nama Petugas / Kasir
              </label>
              <input
                type="text"
                value={cashierName}
                onChange={(e) => setCashierName(e.target.value)}
                placeholder="Owner / Kasir"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Ringkasan Total Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between shadow-md">
            <div>
              <span className="text-[11px] text-amber-200 block font-medium">TOTAL OMZET MASUK</span>
              <span className="text-xs font-bold text-white">Masuk ke Laporan Tgl: {date}</span>
            </div>
            <div className="text-xl font-black text-amber-100">
              {formatRupiah(finalGrandTotal)}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-amber-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan ke Laporan'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
