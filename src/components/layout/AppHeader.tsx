'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useShiftStore } from '@/lib/store/useShiftStore';
import { 
  Maximize2,
  ShoppingBag,
  ArrowLeft
} from 'lucide-react';

export const AppHeader: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { cashierName, selectedShift } = useShiftStore();

  const getPageTitle = () => {
    if (pathname === '/kasir' || pathname === '/') return 'Kasir POS Toko & F&B';
    if (pathname === '/booking') return 'Kasir Lapangan GOR';
    if (pathname === '/booking/dp') return 'Input DP Booking Lapangan';
    if (pathname === '/booking/pelunasan') return 'Pelunasan Booking Lapangan';
    if (pathname === '/booking/history') return 'Riwayat Transaksi Lapangan';
    if (pathname === '/dashboard') return 'Dashboard Owner';
    if (pathname === '/laporan') return 'Laporan Penjualan';
    if (pathname === '/karyawan') return 'Manajemen Karyawan & Shift';
    if (pathname === '/produk/tambah') return 'Tambah Produk Baru';
    if (pathname === '/keranjang') return 'Keranjang Kasir Toko';
    if (pathname === '/pembayaran') return 'Pembayaran Kasir Toko';
    if (pathname === '/produk') return 'Katalog & Stok Toko';
    if (pathname === '/history' || pathname === '/riwayat') return 'Riwayat Transaksi POS Toko';
    return 'Kasir GOR Arena';
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleBack = () => {
    if (pathname === '/keranjang') {
      router.push('/kasir');
    } else if (pathname === '/pembayaran') {
      router.push('/keranjang');
    } else {
      router.back();
    }
  };

  const showBackButton = pathname !== '/dashboard' && pathname !== '/' && pathname !== '/kasir';

  return (
    // Hidden on mobile (hidden) to prevent double headers; visible on desktop (md:flex)
    <header className="hidden md:flex h-16 border-b border-slate-200 bg-white/90 backdrop-blur-md px-4 sm:px-6 items-center justify-between z-30 shrink-0">
      {/* Brand / Back Button & Title */}
      <div className="flex items-center space-x-3">
        {showBackButton ? (
          <button
            type="button"
            onClick={handleBack}
            title="Kembali"
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-[#b92b10] border border-slate-200 transition-colors cursor-pointer flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
        ) : (
          <div className="md:hidden w-8 h-8 rounded-lg bg-[#b92b10] flex items-center justify-center text-white shadow-md shadow-[#b92b10]/20">
            <ShoppingBag className="w-4 h-4" />
          </div>
        )}

        <div>
          <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
            {getPageTitle()}
          </h2>
          <p className="text-[11px] text-slate-500 hidden sm:block">
            {selectedShift?.name || 'Shift Pagi'} • Kasir: <strong className="text-slate-800 font-semibold">{cashierName || 'Andi'}</strong>
          </p>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center space-x-2">
        {/* Fullscreen shortcut for POS */}
        <button
          onClick={handleToggleFullscreen}
          title="Mode Layar Penuh"
          className="p-2 text-slate-500 hover:text-[#b92b10] rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
