'use client';

import { useEffect, useState } from 'react';
import { useCartStore } from '@/lib/store/useCartStore';
import { ShoppingCart, X, RotateCcw } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';

/**
 * Muncul di halaman kasir jika ada sisa keranjang yang dipulihkan dari sesi sebelumnya.
 * User dapat melanjutkan atau membersihkan keranjang.
 */
export function CartRestoreNotice() {
  const { items, clearCart, getGrandTotal } = useCartStore();
  const [visible, setVisible] = useState(false);

  // Tampilkan hanya sekali saat mount jika ada item tersimpan
  useEffect(() => {
    if (items.length > 0) {
      setVisible(true);
    }
  }, []); // intentionally only on mount

  if (!visible || items.length === 0) return null;

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const total = getGrandTotal();

  return (
    <div className="animate-in slide-in-from-top-2 duration-300 mb-4 mx-0">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center gap-3 shadow-xs">
        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <ShoppingCart className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-amber-900">
            Keranjang dipulihkan otomatis
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5">
            {totalItems} item · {formatRupiah(total)} — dari sesi sebelumnya
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => { clearCart(); setVisible(false); }}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-red-600 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer flex items-center gap-1"
            title="Hapus keranjang"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="w-6 h-6 rounded-lg text-amber-500 hover:text-amber-800 hover:bg-amber-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
