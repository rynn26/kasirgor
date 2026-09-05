'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Store,
  Package,
  BarChart3,
  User,
  LogOut,
  X,
  ShieldCheck,
  CalendarCheck,
  Repeat,
  Settings,
  Sun,
  Moon,
  Check
} from 'lucide-react';
import { useShiftStore, SHIFT_OPTIONS, ShiftInfo, getDefaultShift } from '@/lib/store/useShiftStore';

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { selectedUnit, setUnit, selectedShift, selectShift } = useShiftStore();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<'owner' | 'kasir'>('owner');
  const [cashierName, setCashierName] = useState('Owner');
  const [cashierRole, setCashierRole] = useState('Owner / Pemilik Bisnis');

  // Check local storage and store
  const [activeDashboardUnit, setActiveDashboardUnit] = useState<'kantin' | 'lapangan'>('kantin');

  const syncSession = () => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('kasir_session');
      let roleVal: 'owner' | 'kasir' = 'owner';
      let nameVal = 'Wilson';
      let sessionShift: string | null = null;

      if (session) {
        try {
          const parsed = JSON.parse(session);
          if (parsed.role === 'kasir') {
            roleVal = 'kasir';
            nameVal = parsed.name && !['kasir', 'admin', 'user', 'andi'].includes(parsed.name.toLowerCase()) ? parsed.name : 'Yuli';
            sessionShift = parsed.shift || null;
          } else {
            roleVal = 'owner';
            nameVal = parsed.name && !['owner', 'admin', 'administrator', 'user', 'andi'].includes(parsed.name.toLowerCase()) ? parsed.name : 'Wilson';
          }
        } catch { }
      }

      if (roleVal === 'kasir') {
        setCurrentRole('kasir');
        setCashierName(nameVal);

        const isAsfia = nameVal.toLowerCase() === 'asfia';
        let targetShift: ShiftInfo;

        if (sessionShift?.toLowerCase().includes('sore') || sessionShift?.toLowerCase().includes('malam')) {
          targetShift = SHIFT_OPTIONS[1];
        } else if (sessionShift?.toLowerCase().includes('pagi') || sessionShift?.toLowerCase().includes('siang')) {
          targetShift = SHIFT_OPTIONS[0];
        } else if (selectedShift) {
          targetShift = selectedShift;
        } else if (isAsfia) {
          targetShift = SHIFT_OPTIONS[1];
        } else {
          targetShift = getDefaultShift(nameVal);
        }

        if (!selectedShift || (isAsfia && selectedShift.id === 'SHIFT_PAGI' && !sessionShift)) {
          selectShift(targetShift);
        }

        const activeShiftName = selectedShift?.name || targetShift.name;
        setCashierRole(`Kasir • ${activeShiftName}`);
      } else {
        setCurrentRole('owner');
        setCashierName(nameVal);
        setCashierRole('Owner / Pemilik Bisnis');
      }

      const savedUnit = localStorage.getItem('active_dashboard_unit');
      if (savedUnit === 'lapangan' || savedUnit === 'kantin') {
        setActiveDashboardUnit(savedUnit);
      }
    }
  };

  useEffect(() => {
    syncSession();

    const handleUnitChange = () => {
      const savedUnit = localStorage.getItem('active_dashboard_unit');
      if (savedUnit === 'lapangan' || savedUnit === 'kantin') {
        setActiveDashboardUnit(savedUnit);
      }
    };

    const handleShiftChange = () => {
      syncSession();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('dashboard_unit_change', handleUnitChange);
      window.addEventListener('shift_change', handleShiftChange);
      window.addEventListener('storage', handleUnitChange);
      window.addEventListener('storage', handleShiftChange);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('dashboard_unit_change', handleUnitChange);
        window.removeEventListener('shift_change', handleShiftChange);
        window.removeEventListener('storage', handleUnitChange);
        window.removeEventListener('storage', handleShiftChange);
      }
    };
  }, [pathname]);

  useEffect(() => {
    if (currentRole === 'kasir' && selectedShift) {
      setCashierRole(`Kasir • ${selectedShift.name}`);
    }
  }, [selectedShift, currentRole]);

  const handleSwitchShift = (shift: ShiftInfo) => {
    selectShift(shift);
    setCashierRole(`Kasir • ${shift.name}`);
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('kasir_session');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          parsed.shift = shift.name;
          localStorage.setItem('kasir_session', JSON.stringify(parsed));
        } catch {}
      }
      window.dispatchEvent(new Event('shift_change'));
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('kasir_session');
    }
    setIsProfileOpen(false);
    router.push('/login');
  };

  const handleSwitchUnit = (unit: 'POS_TOKO' | 'BOOKING_LAPANGAN') => {
    setUnit(unit);
    const unitKey = unit === 'BOOKING_LAPANGAN' ? 'lapangan' : 'kantin';
    setActiveDashboardUnit(unitKey);
    if (typeof window !== 'undefined') {
      localStorage.setItem('active_dashboard_unit', unitKey);
      window.dispatchEvent(new Event('dashboard_unit_change'));
    }
    setIsProfileOpen(false);
    if (pathname !== '/dashboard') {
      if (unit === 'BOOKING_LAPANGAN') {
        router.push('/booking');
      } else {
        router.push('/kasir');
      }
    }
  };

  // Determine if currently in Lapangan (Booking) module vs POS Toko module
  const isLapanganContext =
    selectedUnit === 'BOOKING_LAPANGAN' ||
    pathname.startsWith('/booking') ||
    (pathname === '/dashboard' && activeDashboardUnit === 'lapangan');

  // Navigation Items specifically tailored for Lapangan vs POS Toko
  const navItems = isLapanganContext
    ? [
      { name: 'Beranda', href: '/dashboard', icon: Home },
      { name: 'Booking', href: '/booking', icon: CalendarCheck },
      { name: 'Riwayat', href: '/booking/history', icon: Repeat },
      { name: 'Laporan', href: '/laporan', icon: BarChart3 },
    ]
    : [
      { name: 'Beranda', href: '/dashboard', icon: Home },
      { name: 'Transaksi', href: '/kasir', icon: Store },
      { name: 'Produk', href: '/produk', icon: Package },
      { name: 'Laporan', href: '/laporan', icon: BarChart3 },
    ];

  return (
    <>
      {/* Mobile Bottom Dock Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive =
              (item.href === '/dashboard' && pathname === '/dashboard') ||
              (isLapanganContext && item.href === '/booking' && (pathname === '/booking' || pathname === '/booking/dp' || pathname === '/booking/pelunasan')) ||
              (isLapanganContext && item.href === '/booking/history' && pathname === '/booking/history') ||
              (!isLapanganContext && item.href === '/kasir' && (pathname === '/kasir' || pathname === '/keranjang' || pathname === '/pembayaran' || pathname === '/')) ||
              (!isLapanganContext && item.href === '/produk' && pathname.startsWith('/produk')) ||
              (item.href === '/laporan' && pathname.startsWith('/laporan')) ||
              (!isLapanganContext && item.href === '/history' && (pathname === '/history' || pathname === '/riwayat'));

            const Icon = item.icon;
            const activeColor = isLapanganContext ? 'text-emerald-700' : 'text-[#b92b10]';
            const activeBgDot = isLapanganContext ? 'bg-emerald-700' : 'bg-[#b92b10]';

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-150 relative ${isActive
                  ? `${activeColor} font-bold`
                  : 'text-slate-500 hover:text-slate-900 font-medium'
                  }`}
              >
                <div className={`p-1 rounded-lg transition-transform ${isActive ? 'scale-110' : ''}`}>
                  <Icon className={`w-5 h-5 ${isActive ? `stroke-[2.5] ${activeColor}` : 'stroke-2'}`} />
                </div>
                <span className={`text-[10px] leading-tight mt-0.5 ${isActive ? `font-black ${activeColor}` : 'font-medium'}`}>
                  {item.name}
                </span>
                {isActive && (
                  <span className={`w-1.5 h-1.5 rounded-full ${activeBgDot} absolute -bottom-0.5`} />
                )}
              </Link>
            );
          })}

          {/* Profile Tab Trigger */}
          <button
            type="button"
            onClick={() => {
              syncSession();
              setIsProfileOpen(true);
            }}
            className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-500 hover:text-slate-900 font-medium transition-all cursor-pointer"
          >
            <div className="p-1 rounded-lg">
              <User className="w-5 h-5 stroke-2" />
            </div>
            <span className="text-[11px] leading-tight mt-0.5 font-medium">
              Profil
            </span>
          </button>
        </div>
      </nav>

      {/* Cashier / Owner Profile Modal */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in slide-in-from-bottom-6 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#eb4b2b]" />
                <span>Profil & Layanan Bertugas</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-5 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#eb4b2b] to-[#ea580c] text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-[#eb4b2b]/25 mb-3 overflow-hidden">
                {currentRole === 'owner' ? (
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                    alt="Owner"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  cashierName.slice(0, 2).toUpperCase()
                )}
              </div>
              <h4 className="text-xl font-black text-slate-900">
                {cashierName}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                {cashierRole}
              </p>

              <div className="w-full grid grid-cols-2 gap-2 mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Status Akun</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Aktif Bertugas
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Unit Aktif</span>
                  <span className="text-slate-800 font-bold mt-0.5 block">
                    {selectedUnit === 'BOOKING_LAPANGAN' ? '🏸 Lapangan GOR' : '🏪 Kantin & Kasir'}
                  </span>
                </div>
              </div>
            </div>

            {/* Switch Unit: Kantin vs Booking Lapangan */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center">
                Pindah Unit Tugas
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSwitchUnit('POS_TOKO')}
                  className={`py-3 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${selectedUnit !== 'BOOKING_LAPANGAN'
                    ? 'bg-[#eb4b2b] text-white border-[#eb4b2b] shadow-xs'
                    : 'bg-red-50 hover:bg-red-100 text-[#eb4b2b] border-red-100'
                    }`}
                >
                  <Store className="w-4 h-4" />
                  <span>Kantin / Kasir</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchUnit('BOOKING_LAPANGAN')}
                  className={`py-3 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${selectedUnit === 'BOOKING_LAPANGAN'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-100'
                    }`}
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>Lapangan</span>
                </button>
              </div>

              {/* Switch Shift Tugas */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Pilih Shift Tugas
                  </span>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    {selectedShift?.name || (cashierName.toLowerCase() === 'asfia' ? 'Shift Sore - Malam' : 'Shift Pagi - Siang')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {SHIFT_OPTIONS.map((shift) => {
                    const activeShiftId = selectedShift?.id || (cashierName.toLowerCase() === 'asfia' ? 'SHIFT_SORE' : 'SHIFT_PAGI');
                    const isSelected = activeShiftId === shift.id;
                    const isMorning = shift.id === 'SHIFT_PAGI';
                    const Icon = isMorning ? Sun : Moon;

                    return (
                      <button
                        key={shift.id}
                        type="button"
                        onClick={() => handleSwitchShift(shift)}
                        className={`py-2 px-2 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-xs ring-2 ring-amber-400/40'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : isMorning ? 'text-amber-500' : 'text-indigo-500'}`} />
                          <span className="leading-tight text-[11px]">{shift.name}</span>
                          {isSelected && <Check className="w-3 h-3 text-white ml-0.5" />}
                        </div>
                        <span className={`text-[9px] font-medium ${isSelected ? 'text-amber-100' : 'text-slate-400'}`}>
                          {shift.timeRange} WIB
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ganti Shift & Logout */}
              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    router.push('/shift');
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>Ganti Shift</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex-1 py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar</span>
                </button>
              </div>

              {/* Monitoring Kasir & Audit Log */}
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  router.push('/karyawan');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Monitoring Kasir & Audit Log</span>
              </button>

              {/* Setting Lapangan */}
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  router.push('/setting/lapangan');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Setting Harga Lapangan</span>
              </button>

              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="w-full py-1.5 text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer text-center block"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
