'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { BottomNav } from './BottomNav';
import { ToastNotification } from '@/components/common/ToastNotification';
import { useShiftStore } from '@/lib/store/useShiftStore';
import { updateCashierPresence } from '@/lib/db/activityLogs';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const isAuthOrShiftPage = pathname === '/login' || pathname === '/shift' || pathname === '/';
  const { cashierName, selectedShift, selectedUnit } = useShiftStore();

  // Presence Heartbeat Effect: Keeps cashier online status updated every 30s
  useEffect(() => {
    let currentName = cashierName || 'Yuli';
    let currentEmail = '';
    let currentUnit = selectedUnit === 'BOOKING_LAPANGAN' ? 'Booking Lapangan' : 'Kasir Toko & F&B';
    let currentShift = selectedShift?.name || 'Shift Pagi (08:00 - 17:00)';
    let currentRole = 'Kasir';

    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('kasir_session');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          if (parsed.name) currentName = parsed.name;
          if (parsed.email) currentEmail = parsed.email;
          if (parsed.role) currentRole = parsed.role === 'owner' ? 'Owner' : 'Kasir';
          if (parsed.shift) currentShift = parsed.shift;
          if (parsed.unit) currentUnit = parsed.unit;
        } catch {}
      }
    }

    // Ping presence on mount
    updateCashierPresence({
      staffName: currentName,
      email: currentEmail,
      role: currentRole,
      unit: currentUnit,
      shift: currentShift,
      status: 'ONLINE',
      lastActiveAt: new Date().toISOString(),
    });

    // Send heartbeat every 30 seconds
    const interval = setInterval(() => {
      updateCashierPresence({
        staffName: currentName,
        email: currentEmail,
        role: currentRole,
        unit: currentUnit,
        shift: currentShift,
        status: 'ONLINE',
        lastActiveAt: new Date().toISOString(),
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [cashierName, selectedShift, selectedUnit]);

  if (isAuthOrShiftPage) {
    return <main className="min-h-screen w-full bg-[#f8fafc]">{children}</main>;
  }

  return (
    <div className="h-full bg-[#f8fafc] text-slate-800 font-sans flex overflow-hidden w-full">
      {/* Main Left App Sidebar for Desktop (md+) */}
      <AppSidebar />

      {/* Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <AppHeader />
        
        {/* Main scrollable body with padding bottom on mobile for BottomNav */}
        <main className="flex-1 overflow-y-auto bg-[#f8fafc] pb-20 md:pb-0">
          {children}
        </main>

        {/* Global Toast Notification */}
        <ToastNotification />

        {/* Bottom Navigation Dock for Mobile / Tablet (< md) */}
        <BottomNav />
      </div>
    </div>
  );
};

