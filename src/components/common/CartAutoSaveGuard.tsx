'use client';

import { useEffect } from 'react';
import { useCartStore } from '@/lib/store/useCartStore';

/**
 * Komponen ini:
 * 1. Menampilkan dialog konfirmasi browser jika user mau menutup tab
 *    saat keranjang masih berisi item.
 * 2. Dipasang di layout root agar aktif di semua halaman.
 */
export function CartAutoSaveGuard() {
  const items = useCartStore((s) => s.items);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (items.length > 0) {
        e.preventDefault();
        // Browser modern mengabaikan custom message, tapi ini trigger dialog standar
        return 'Keranjang belanja Anda masih ada. Yakin ingin meninggalkan halaman?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [items.length]);

  return null;
}
