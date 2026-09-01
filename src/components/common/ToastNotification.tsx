'use client';

import React from 'react';
import { useToastStore } from '@/lib/store/useToastStore';
import { CheckCircle2 } from 'lucide-react';

export const ToastNotification: React.FC = () => {
  const { message, isVisible } = useToastStore();

  if (!isVisible || !message) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in slide-in-from-bottom-3 fade-in duration-150">
      <div className="bg-slate-900/95 text-white px-4 py-2.5 rounded-full shadow-2xl border border-white/10 backdrop-blur-md flex items-center gap-2 text-xs font-bold tracking-wide">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 stroke-[2.5]" />
        <span>{message}</span>
      </div>
    </div>
  );
};
