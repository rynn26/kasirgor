'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'rose' | 'emerald' | 'amber' | 'blue';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'rose',
}) => {
  const colorMap = {
    rose: {
      bg: 'bg-white',
      border: 'border-slate-200',
      iconBg: 'bg-red-50 text-[#b92b10] border border-red-100',
      glow: 'hover:border-[#b92b10]/40',
    },
    emerald: {
      bg: 'bg-white',
      border: 'border-slate-200',
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      glow: 'hover:border-emerald-500/40',
    },
    amber: {
      bg: 'bg-white',
      border: 'border-slate-200',
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
      glow: 'hover:border-amber-500/40',
    },
    blue: {
      bg: 'bg-white',
      border: 'border-slate-200',
      iconBg: 'bg-orange-50 text-[#ea580c] border border-orange-100',
      glow: 'hover:border-orange-500/40',
    },
  };

  const currentTheme = colorMap[color];

  return (
    <div
      className={`group p-5 rounded-2xl ${currentTheme.bg} border ${currentTheme.border} ${currentTheme.glow} transition-all duration-200 shadow-xs relative overflow-hidden`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {title}
          </p>
          <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
              {subtitle}
            </p>
          )}
        </div>

        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${currentTheme.iconBg}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
