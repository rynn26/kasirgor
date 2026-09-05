'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useShiftStore } from '@/lib/store/useShiftStore';
import { 
  Store, 
  LayoutDashboard, 
  Package, 
  BarChart3,
  Users,
  History as HistoryIcon,
  CalendarCheck,
  ShoppingBag, 
  LogOut,
  CircleDot,
  Repeat
} from 'lucide-react';
import { ShiftHandoverModal } from '@/components/shift/ShiftHandoverModal';

export const AppSidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { cashierName, selectedShift, selectedUnit } = useShiftStore();

  // Menu Navigasi Kasir dengan History Transaksi & Laporan Penjualan & Karyawan
  const navigation = [
    { name: 'Kasir POS', href: '/kasir', icon: Store },
    { name: 'Dashboard Owner', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Katalog & Stok', href: '/produk', icon: Package },
    { name: 'Laporan Penjualan', href: '/laporan', icon: BarChart3 },
    { name: 'Karyawan & Shift', href: '/karyawan', icon: Users },
    { name: 'History Nota', href: '/history', icon: HistoryIcon },
    { name: 'Booking Lapangan', href: '/booking', icon: CalendarCheck },
  ];

  const [isHandoverOpen, setIsHandoverOpen] = React.useState(false);
  const [isOwner, setIsOwner] = React.useState(false);

  React.useEffect(() => {
    const checkRole = () => {
      if (typeof window !== 'undefined') {
        const session = localStorage.getItem('kasir_session');
        if (session) {
          try {
            const parsed = JSON.parse(session);
            const role = (parsed.role || '').toLowerCase();
            setIsOwner(role === 'owner' || role === 'admin');
          } catch {
            setIsOwner(false);
          }
        } else {
          setIsOwner(false);
        }
      }
    };
    checkRole();
    window.addEventListener('storage', checkRole);
    return () => window.removeEventListener('storage', checkRole);
  }, []);

  const handleLogout = () => {
    const currentName = cashierName || 'Kasir';
    import('@/lib/db/activityLogs').then(({ recordActivityLog, updateCashierPresence }) => {
      recordActivityLog({
        staffName: currentName,
        role: 'Kasir',
        actionType: 'LOGOUT',
        title: 'Kasir Logout',
        details: `${currentName} keluar dari sistem aplikasi.`,
      });
      updateCashierPresence({
        staffName: currentName,
        status: 'OFFLINE',
      });
    });

    if (typeof window !== 'undefined') {
      localStorage.removeItem('kasir_session');
    }
    router.push('/login');
  };

  const handleSwitchShift = () => {
    setIsHandoverOpen(true);
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between hidden md:flex shrink-0 shadow-sm">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-slate-100 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#b92b10] flex items-center justify-center text-white shadow-md shadow-[#b92b10]/20">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-black text-base text-slate-900 tracking-wide">KASIR GOR</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <CircleDot className="w-2.5 h-2.5 text-emerald-500 animate-pulse" />
              <span className="text-[11px] text-slate-500 font-medium">
                {selectedUnit === 'BOOKING_LAPANGAN' ? 'Booking Lapangan' : 'Kasir Toko & F&B'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items Organized by Section */}
        <nav className="p-3 space-y-4">
          
          {/* Section 1: Kasir Unit Transaksi */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Unit Kasir
            </span>

            {/* 1. Kasir Lapangan GOR */}
            <Link
              href="/booking"
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl font-bold text-sm transition-all duration-150 ${
                pathname.startsWith('/booking')
                  ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
                  : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
              }`}
            >
              <CalendarCheck className={`w-5 h-5 ${pathname.startsWith('/booking') ? 'text-white' : 'text-emerald-600'}`} />
              <div>
                <span className="block leading-tight">Kasir Lapangan</span>
                <span className={`text-[10px] block font-normal ${pathname.startsWith('/booking') ? 'text-emerald-100' : 'text-slate-400'}`}>
                  DP & Pelunasan Sewa
                </span>
              </div>
            </Link>

            {/* 2. Kasir POS Toko */}
            <Link
              href="/kasir"
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl font-bold text-sm transition-all duration-150 ${
                pathname === '/kasir' || pathname === '/'
                  ? 'bg-[#b92b10] text-white shadow-md shadow-[#b92b10]/20'
                  : 'text-slate-700 hover:bg-red-50 hover:text-[#b92b10]'
              }`}
            >
              <Store className={`w-5 h-5 ${pathname === '/kasir' || pathname === '/' ? 'text-white' : 'text-[#b92b10]'}`} />
              <div>
                <span className="block leading-tight">Kasir POS Toko</span>
                <span className={`text-[10px] block font-normal ${pathname === '/kasir' || pathname === '/' ? 'text-red-100' : 'text-slate-400'}`}>
                  Penjualan Barang & F&B
                </span>
              </div>
            </Link>
          </div>

          {/* Section 2: Manajemen & Operasional */}
          <div className="space-y-1 pt-1 border-t border-slate-100">
            <span className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Manajemen & Data
            </span>

            {[
              ...(isOwner ? [{ name: 'Dashboard Owner', href: '/dashboard', icon: LayoutDashboard }] : []),
              { name: 'Katalog & Stok Toko', href: '/produk', icon: Package },
              ...(isOwner ? [{ name: 'Laporan Penjualan', href: '/laporan', icon: BarChart3 }] : []),
              { name: 'Riwayat Transaksi', href: '/history', icon: HistoryIcon },
              ...(isOwner ? [{ name: 'Karyawan & Shift', href: '/karyawan', icon: Users }] : []),
            ].map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Cashier Footer Profile & Logout */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/70 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-red-100 border border-red-200 flex items-center justify-center font-black text-xs text-[#b92b10]">
              {cashierName ? cashierName.slice(0, 2).toUpperCase() : 'KG'}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">{cashierName || 'Kasir'}</p>
              <p className="text-[10px] text-slate-500">
                {selectedShift?.name || (cashierName?.toLowerCase() === 'asfia' ? 'Shift Sore - Malam' : 'Shift Pagi - Siang')} • Bertugas
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={handleSwitchShift}
              title="Ganti Shift / Unit"
              className="p-2 text-slate-400 hover:text-[#b92b10] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <Repeat className="w-4 h-4" />
            </button>

            <button
              onClick={handleLogout}
              title="Keluar Akun"
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <ShiftHandoverModal
        isOpen={isHandoverOpen}
        onClose={() => setIsHandoverOpen(false)}
      />
    </aside>
  );
};
