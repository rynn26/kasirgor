'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { BottomNav } from './BottomNav';
import { ToastNotification } from '@/components/common/ToastNotification';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const isAuthOrShiftPage = pathname === '/login' || pathname === '/shift' || pathname === '/';

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
