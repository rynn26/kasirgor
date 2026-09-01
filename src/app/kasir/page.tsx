'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { CartSidebar } from '@/components/pos/CartSidebar';
import { PaymentModal } from '@/components/pos/PaymentModal';
import { ReceiptModal } from '@/components/pos/ReceiptModal';
import { CartRestoreNotice } from '@/components/common/CartRestoreNotice';
import { useCartStore } from '@/lib/store/useCartStore';
import { useProductStore } from '@/lib/store/useProductStore';
import { formatRupiah } from '@/lib/utils';
import { Transaction } from '@/types/pos';
import { ShoppingCart, ArrowRight } from 'lucide-react';

export default function KasirPage() {
  const router = useRouter();
  const { items, getTotalItems, getGrandTotal } = useCartStore();
  const { loadProducts, isLoading: productsLoading } = useProductStore();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [cashierName, setCashierName] = useState('Andi');

  useEffect(() => {
    loadProducts();
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('kasir_session');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          if (parsed.name || parsed.user) {
            setCashierName(parsed.name || parsed.user);
          }
        } catch {}
      }
    }
  }, []);

  const totalItemsCount = getTotalItems();
  const grandTotal = getGrandTotal();

  const handlePaymentSuccess = (transaction: Transaction) => {
    setLastTransaction(transaction);
    setIsReceiptOpen(true);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-4rem)] overflow-hidden relative">
      {/* Main Left: Product Catalog & Search & Filters */}
      <main className="flex-1 p-3.5 sm:p-5 lg:p-6 overflow-y-auto flex flex-col min-w-0">
        
        {/* Mobile Header (Halo, Selamat Datang) with Cart Button */}
        <div className="lg:hidden flex items-center justify-between mb-3.5 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#b92b10] to-[#e64a19] text-white flex items-center justify-center font-black text-xs shadow-md shadow-[#b92b10]/20">
              {cashierName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-black text-[#b92b10] tracking-tight">
                Halo, Selamat Datang
              </h2>
            </div>
          </div>

          {/* Cart Icon Button (Replaces Notification) */}
          <Link
            href="/keranjang"
            title="Buka Keranjang"
            className="p-2.5 rounded-xl bg-slate-50 text-slate-700 hover:text-[#b92b10] border border-slate-200 transition-colors cursor-pointer relative flex items-center justify-center"
          >
            <ShoppingCart className="w-5 h-5" />
            {totalItemsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#b92b10] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                {totalItemsCount}
              </span>
            )}
          </Link>
        </div>

        {/* Restore notice: muncul jika ada sisa keranjang dari sesi sebelumnya */}
        <CartRestoreNotice />

        {/* Product Grid Component */}
        <ProductGrid />
      </main>

      {/* Desktop Right Sidebar: Active Cashier Cart Panel */}
      <div className="hidden lg:block">
        <CartSidebar onOpenPayment={() => setIsPaymentOpen(true)} />
      </div>

      {/* ============================================================ */}
      {/* FLOATING BOTTOM CART BAR ON MOBILE (Links to /keranjang) */}
      {/* ============================================================ */}
      {items.length > 0 && (
        <div className="lg:hidden fixed bottom-16 left-3.5 right-3.5 z-40 max-w-lg mx-auto animate-in slide-in-from-bottom-4 duration-200">
          <Link
            href="/keranjang"
            className="bg-[#b92b10] hover:bg-[#a3250d] active:scale-[0.99] text-white p-3.5 px-4 rounded-2xl shadow-xl shadow-[#b92b10]/35 flex items-center justify-between cursor-pointer transition-all border border-red-400/30"
          >
            {/* Left: Cart Icon with count badge + Title */}
            <div className="flex items-center space-x-3">
              <div className="relative p-1.5 rounded-xl bg-black/15">
                <ShoppingCart className="w-5 h-5 text-white" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-[#b92b10] text-[10px] font-black flex items-center justify-center shadow-xs">
                  {totalItemsCount}
                </span>
              </div>
              <div>
                <h4 className="text-sm font-black tracking-tight leading-tight">
                  Keranjang
                </h4>
                <p className="text-[11px] text-red-100 font-medium leading-tight">
                  {totalItemsCount} Item dipilih
                </p>
              </div>
            </div>

            {/* Right: Total Price + Arrow */}
            <div className="flex items-center space-x-2">
              <div className="text-sm sm:text-base font-black tracking-tight">
                {formatRupiah(grandTotal)}
              </div>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </div>
          </Link>
        </div>
      )}

      {/* Payment Processing Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onSuccess={handlePaymentSuccess}
      />

      {/* Thermal Receipt & Print Dialog */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        transaction={lastTransaction}
        onClose={() => setIsReceiptOpen(false)}
        onNewTransaction={() => {
          setIsReceiptOpen(false);
          setLastTransaction(null);
        }}
      />
    </div>
  );
}
