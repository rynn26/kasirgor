'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Receipt,
  Package,
  Banknote,
  TrendingUp,
  ChevronRight,
  FileText,
  FileSpreadsheet,
  Printer,
  ShoppingBag,
  QrCode,
  Store,
  CalendarCheck,
  Calendar,
  Clock,
  Layers,
  Plus,
  Wallet,
} from 'lucide-react';
import { OwnerDailyRevenueModal } from '@/components/owner/OwnerDailyRevenueModal';
import { PaymentMethodDetailModal } from '@/components/laporan/PaymentMethodDetailModal';
import { BookingReceiptModal } from '@/components/booking/BookingReceiptModal';
import { ReceiptModal } from '@/components/pos/ReceiptModal';
import { CourtBooking } from '@/types/booking';
import { Transaction } from '@/types/pos';
import { InputManualSaleModal } from '@/components/laporan/InputManualSaleModal';
import { InputManualBookingModal } from '@/components/laporan/InputManualBookingModal';
import { formatRupiah } from '@/lib/utils';
import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { useCourtBookingStore } from '@/lib/store/useCourtBookingStore';
import { useShiftStore } from '@/lib/store/useShiftStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { 
  exportKantinToExcel, 
  printKantinPDF, 
  exportCourtBookingsToExcel, 
  printCourtBookingsPDF 
} from '@/lib/exportUtils';

type PeriodType = 'BULAN_INI' | 'HARI_INI' | 'MINGGU_INI' | 'CUSTOM';

function formatShortDate(dateStr: string): string {
  if (!dateStr) return 'Pilih Tanggal';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    const date = new Date(y, m - 1, d);
    return `${d} ${date.toLocaleString('id-ID', { month: 'short' })} ${y}`;
  } catch {
    return dateStr;
  }
}

function getDateRange(period: PeriodType, customDate?: string): { start: string; end: string; label: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (period === 'CUSTOM' && customDate) {
    const [y, m, d] = customDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dateFormatted = `${pad(d)} ${dateObj.toLocaleString('id-ID', { month: 'long' })} ${y}`;
    return {
      start: customDate,
      end: customDate,
      label: `Tanggal ${dateFormatted}`,
    };
  }
  if (period === 'HARI_INI') {
    const today = fmt(now);
    return { start: today, end: today, label: `Hari Ini (${pad(now.getDate())} ${now.toLocaleString('id-ID', { month: 'long' })} ${now.getFullYear()})` };
  }
  if (period === 'MINGGU_INI') {
    const day = now.getDay(); // 0=Sun
    const diffToMon = (day === 0 ? -6 : 1 - day);
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return {
      start: fmt(mon),
      end: fmt(sun),
      label: `Minggu Ini (${pad(mon.getDate())} - ${pad(sun.getDate())} ${now.toLocaleString('id-ID', { month: 'short' })} ${now.getFullYear()})`,
    };
  }
  // BULAN_INI
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: fmt(firstDay),
    end: fmt(lastDay),
    label: `Bulan Ini (${now.toLocaleString('id-ID', { month: 'long' })} ${now.getFullYear()})`,
  };
}

export default function LaporanPenjualanPage() {
  const { transactions, loadTransactions } = useTransactionStore();
  const { bookings, courts, loadBookings, loadCourts } = useCourtBookingStore();
  const { selectedUnit, setUnit } = useShiftStore();
  const { showToast } = useToastStore();

  const [activeUnit, setActiveUnit] = useState<'kantin' | 'lapangan'>('kantin');
  const [period, setPeriod] = useState<PeriodType>('BULAN_INI');
  const [customDate, setCustomDate] = useState<string>(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });
  const dateInputRef = React.useRef<HTMLInputElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ day: string; amount: number } | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isOwnerRevenueModalOpen, setIsOwnerRevenueModalOpen] = useState(false);
  const [selectedPaymentMethodDetail, setSelectedPaymentMethodDetail] = useState<string | null>(null);
  const [selectedBookingForReceipt, setSelectedBookingForReceipt] = useState<CourtBooking | null>(null);
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<Transaction | null>(null);
  const [isInputManualOpen, setIsInputManualOpen] = useState(false);
  const [isInputManualBookingOpen, setIsInputManualBookingOpen] = useState(false);

  useEffect(() => {
    loadTransactions();
    loadBookings();
    loadCourts();

    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('kasir_session');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          setIsOwner(parsed.role === 'owner');
        } catch {}
      } else {
        setIsOwner(true);
      }
    }
  }, [loadTransactions, loadBookings, loadCourts]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUnit = localStorage.getItem('active_dashboard_unit');
      if (savedUnit === 'lapangan' || savedUnit === 'kantin') {
        setActiveUnit(savedUnit);
      } else if (selectedUnit === 'BOOKING_LAPANGAN') {
        setActiveUnit('lapangan');
      }
    }
  }, [selectedUnit]);

  const handleSwitchUnit = (unit: 'kantin' | 'lapangan') => {
    setActiveUnit(unit);
    if (typeof window !== 'undefined') {
      localStorage.setItem('active_dashboard_unit', unit);
      window.dispatchEvent(new Event('dashboard_unit_change'));
    }
    setUnit(unit === 'kantin' ? 'POS_TOKO' : 'BOOKING_LAPANGAN');
    setHoveredPoint(null);
  };

  const isLapangan = activeUnit === 'lapangan';

  // =============================================
  // DERIVED DATA: KANTIN / POS TOKO
  // =============================================
  const kantinData = useMemo(() => {
    const { start, end, label } = getDateRange(period, customDate);

    const filtered = transactions.filter(
      (t) =>
        t.status === 'COMPLETED' &&
        t.createdAt.split('T')[0] >= start &&
        t.createdAt.split('T')[0] <= end
    );

    const totalSales = filtered.reduce((s, t) => s + t.grandTotal, 0);
    const totalTx = filtered.length;
    const totalItems = filtered.reduce(
      (s, t) => s + t.items.reduce((is, i) => is + i.quantity, 0),
      0
    );

    // Payment breakdown
    const paymentMap: Record<string, number> = {};
    filtered.forEach((t) => {
      const method = t.paymentMethod === 'CASH' ? 'Cash (Tunai)' : t.paymentMethod;
      paymentMap[method] = (paymentMap[method] || 0) + t.grandTotal;
    });
    const paymentColors: Record<string, string> = {
      'Cash (Tunai)': '#f59e0b',
      QRIS: '#a62512',
    };
    const paymentBreakdown = Object.entries(paymentMap).map(([name, amount]) => ({
      name,
      amount,
      percent: totalSales > 0 ? Math.round((amount / totalSales) * 100) : 0,
      color: paymentColors[name] || '#94a3b8',
    }));

    // Category breakdown
    const catMap: Record<string, { qty: number; amount: number }> = {};
    filtered.forEach((t) => {
      t.items.forEach((item) => {
        const cat = item.product.category || 'Lainnya';
        if (!catMap[cat]) catMap[cat] = { qty: 0, amount: 0 };
        catMap[cat].qty += item.quantity;
        catMap[cat].amount += item.product.price * item.quantity;
      });
    });
    const catList = Object.entries(catMap)
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 5);
    const maxCatAmount = catList[0]?.[1].amount || 1;
    const categoriesBreakdown = catList.map(([category, data]) => ({
      category,
      qty: data.qty,
      amount: data.amount,
      percent: Math.round((data.amount / maxCatAmount) * 100),
    }));

    // Chart points — group by day/slot
    const chartPoints = buildKantinChartPoints(filtered, period, start, end);

    // Growth vs previous period
    const prevFiltered = transactions.filter(
      (t) =>
        t.status === 'COMPLETED' &&
        isInPrevPeriod(t.createdAt.split('T')[0], period, customDate)
    );
    const prevSales = prevFiltered.reduce((s, t) => s + t.grandTotal, 0);
    const growthPct =
      prevSales > 0 ? (((totalSales - prevSales) / prevSales) * 100).toFixed(1) : null;

    return {
      label,
      totalSales,
      totalTx,
      totalItems,
      paymentBreakdown,
      categoriesBreakdown,
      chartPoints,
      growthPct,
      filteredTransactions: filtered,
    };
  }, [transactions, period, customDate]);

  // =============================================
  // DERIVED DATA: ARENA LAPANGAN GOR
  // =============================================
  const lapanganData = useMemo(() => {
    const { start, end, label } = getDateRange(period, customDate);

    const filtered = bookings.filter(
      (b) =>
        b.status !== 'CANCELLED' &&
        b.date >= start &&
        b.date <= end
    );

    const totalSales = filtered.reduce((s, b) => s + b.amountPaidTotal, 0);
    const totalBookings = filtered.length;
    const totalHours = filtered.reduce((s, b) => s + b.durationHours, 0);

    // Occupancy: how many court-hour slots were used
    const totalSlots = courts.length * ((period === 'HARI_INI' || period === 'CUSTOM') ? 14 : period === 'MINGGU_INI' ? 98 : 420);
    const usedSlots = totalHours;
    const occupancyRate = totalSlots > 0 ? `${Math.min(100, Math.round((usedSlots / totalSlots) * 100))}%` : '0%';

    // Payment breakdown
    const dpPayMap: Record<string, number> = {};
    const settlePayMap: Record<string, number> = {};
    filtered.forEach((b) => {
      if (b.dpPaymentMethod) {
        dpPayMap[b.dpPaymentMethod] = (dpPayMap[b.dpPaymentMethod] || 0) + b.dpAmount;
      }
      if (b.settlementPaymentMethod && b.settlementAmount) {
        settlePayMap[b.settlementPaymentMethod] =
          (settlePayMap[b.settlementPaymentMethod] || 0) + b.settlementAmount;
      }
    });
    const mergedPay: Record<string, number> = {};
    [dpPayMap, settlePayMap].forEach((map) => {
      Object.entries(map).forEach(([method, amount]) => {
        mergedPay[method] = (mergedPay[method] || 0) + amount;
      });
    });
    const paymentColors: Record<string, string> = {
      CASH: '#f59e0b',
      QRIS: '#059669',
    };
    const payTotal = Object.values(mergedPay).reduce((s, v) => s + v, 0) || 1;
    const paymentBreakdown = Object.entries(mergedPay).map(([name, amount]) => ({
      name: name === 'CASH' ? 'Cash (Tunai)' : name,
      amount,
      percent: Math.round((amount / payTotal) * 100),
      color: paymentColors[name] || '#94a3b8',
    }));

    // Court breakdown
    const courtMap: Record<string, { amount: number; hours: number }> = {};
    filtered.forEach((b) => {
      const cleanName = (b.courtName || '')
        .replace(/\s*\([^)]*VIP[^)]*\)/gi, '')
        .replace(/\s*\([^)]*Vinyl[^)]*\)/gi, '')
        .trim();
      const key = cleanName || b.courtName || 'Lapangan 1';
      if (!courtMap[key]) courtMap[key] = { amount: 0, hours: 0 };
      courtMap[key].amount += b.amountPaidTotal;
      courtMap[key].hours += b.durationHours;
    });
    const courtList = Object.entries(courtMap).sort((a, b) => b[1].amount - a[1].amount);
    const maxCourtAmount = courtList[0]?.[1].amount || 1;
    const courtBreakdown = courtList.map(([name, data]) => ({
      name,
      amount: data.amount,
      hours: data.hours,
      percent: Math.round((data.amount / maxCourtAmount) * 100),
    }));

    // Chart points
    const chartPoints = buildLapanganChartPoints(filtered, period, start, end);

    // Growth vs prev
    const prevFiltered = bookings.filter(
      (b) =>
        b.status !== 'CANCELLED' &&
        isInPrevPeriod(b.date, period, customDate)
    );
    const prevSales = prevFiltered.reduce((s, b) => s + b.amountPaidTotal, 0);
    const growthPct =
      prevSales > 0 ? (((totalSales - prevSales) / prevSales) * 100).toFixed(1) : null;

    return {
      label,
      totalSales,
      totalBookings,
      totalHours,
      occupancyRate,
      paymentBreakdown,
      courtBreakdown,
      chartPoints,
      growthPct,
      filteredBookings: filtered,
    };
  }, [bookings, courts, period, customDate]);

  const current = isLapangan ? lapanganData : kantinData;

  // Generate SVG path
  const generatePath = (points: { x: number; y: number }[]) => {
    if (!points.length) return '';
    return points.reduce((acc, point, i, arr) => {
      if (i === 0) return `M ${point.x},${point.y}`;
      const prev = arr[i - 1];
      const cx1 = prev.x + (point.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (point.x - prev.x) / 2;
      const cy2 = point.y;
      return `${acc} C ${cx1},${cy1} ${cx2},${cy2} ${point.x},${point.y}`;
    }, '');
  };

  const linePath = generatePath(current.chartPoints);
  const areaPath =
    current.chartPoints.length > 0
      ? `${linePath} L ${current.chartPoints[current.chartPoints.length - 1].x},160 L ${current.chartPoints[0].x},160 Z`
      : '';

  // Donut SVG
  const C = 238.76;
  const donutItems = current.paymentBreakdown.reduce<Array<{ item: typeof current.paymentBreakdown[number]; strokeDasharray: string; strokeDashoffset: number }>>(
    (acc, item) => {
      const offset = acc.length > 0 ? acc[acc.length - 1].strokeDashoffset : 0;
      acc.push({
        item,
        strokeDasharray: `${(item.percent / 100) * C} ${C}`,
        strokeDashoffset: offset - (item.percent / 100) * C,
      });
      return acc;
    },
    []
  );

  const handleExportExcel = () => {
    if (isLapangan) {
      exportCourtBookingsToExcel(lapanganData.label, lapanganData.filteredBookings);
      showToast('Laporan Excel Sewa Lapangan berhasil diunduh!');
    } else {
      exportKantinToExcel(kantinData.label, kantinData.filteredTransactions);
      showToast('Laporan Excel Penjualan Toko & Kantin berhasil diunduh!');
    }
  };

  const handleExportPDF = () => {
    if (isLapangan) {
      printCourtBookingsPDF(lapanganData.label, lapanganData.filteredBookings);
      showToast('Membuka format cetak PDF Laporan Sewa Lapangan...');
    } else {
      printKantinPDF(kantinData.label, kantinData.filteredTransactions);
      showToast('Membuka format cetak PDF Laporan Penjualan Kantin...');
    }
  };

  return (
    <div className="min-h-full bg-[#f8fafc] p-3.5 sm:p-6 max-w-md mx-auto space-y-4 pb-28">

      {/* 1. UNIT SWITCHER */}
      <div className="flex items-center justify-between bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
        <span className="text-[11px] font-bold text-slate-500 pl-2">Layanan Unit:</span>
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => handleSwitchUnit('kantin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              !isLapangan ? 'bg-white text-[#a62512] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Kantin / Kasir</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchUnit('lapangan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              isLapangan ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Lapangan</span>
          </button>
        </div>
      </div>

      {/* 2. TITLE & EXPORT */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {isLapangan ? 'Laporan Sewa Lapangan' : 'Laporan Penjualan'}
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">
              {isLapangan ? 'Arena Lapangan GOR' : 'Kasir Toko & F&B'}
            </p>
          </div>
          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5 justify-end">
            {isOwner && (
              <button
                type="button"
                onClick={() => setIsOwnerRevenueModalOpen(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer border bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-amber-600"
                title="Lihat Rekap Total Omset Hari Ini (Kantin + DP + Pelunasan Lapangan)"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Rekap Omset</span>
              </button>
            )}

            {!isLapangan && (
              <button
                type="button"
                onClick={() => setIsInputManualOpen(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer border bg-amber-500 hover:bg-amber-600 text-white border-amber-600"
                title="Input Penjualan Kemarin / Manual"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Input Data Kemarin</span>
              </button>
            )}

            {isLapangan && (
              <button
                type="button"
                onClick={() => setIsInputManualBookingOpen(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer border bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700"
                title="Input Sewa Lapangan Kemarin / Manual"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Input Sewa Kemarin</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer border bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200"
              title="Unduh Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer border ${
                isLapangan
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 hover:bg-red-100 text-[#a62512] border-red-200'
              }`}
              title="Cetak PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* Period Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {([
            { id: 'BULAN_INI', label: 'Bulan Ini' },
            { id: 'MINGGU_INI', label: 'Minggu Ini' },
            { id: 'HARI_INI', label: 'Hari Ini' },
          ] as { id: PeriodType; label: string }[]).map((item) => {
            const isActive = period === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { setPeriod(item.id); setHoveredPoint(null); }}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? isLapangan
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-[#a62512] text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            );
          })}

          {/* Custom Date Picker Pill */}
          <div className="relative shrink-0">
            <input
              ref={dateInputRef}
              type="date"
              value={customDate}
              onChange={(e) => {
                if (e.target.value) {
                  setCustomDate(e.target.value);
                  setPeriod('CUSTOM');
                  setHoveredPoint(null);
                }
              }}
              onClick={(e) => {
                if (period !== 'CUSTOM') {
                  setPeriod('CUSTOM');
                  setHoveredPoint(null);
                }
                try {
                  (e.currentTarget as HTMLInputElement).showPicker?.();
                } catch {}
              }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
              title="Pilih Tanggal"
            />
            <button
              type="button"
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 border ${
                period === 'CUSTOM'
                  ? isLapangan
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-[#a62512] text-white border-[#a62512] shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>
                {period === 'CUSTOM' && customDate
                  ? formatShortDate(customDate)
                  : 'Pilih Tanggal'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. HERO CARD */}
      <div className={`w-full rounded-[24px] p-5 text-white shadow-md space-y-2 relative overflow-hidden ${
        isLapangan
          ? 'bg-gradient-to-tr from-emerald-700 to-teal-800 shadow-emerald-700/20'
          : 'bg-[#a62512] shadow-[#a62512]/20'
      }`}>
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none blur-xl" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/80 block">
            {isLapangan ? 'Total Pendapatan Sewa Lapangan' : 'Total Penjualan'}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-white/15 text-white text-[10px] font-bold">
            {current.label}
          </span>
        </div>

        <div className="text-[30px] sm:text-[34px] font-black tracking-tight leading-none text-white">
          {formatRupiah(current.totalSales)}
        </div>

        <div className="pt-0.5">
          {current.growthPct !== null ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/20 text-[#4ade80] text-xs font-bold">
              <span className="text-xs">{Number(current.growthPct) >= 0 ? '↗' : '↘'}</span>
              <span>{Number(current.growthPct) >= 0 ? '+' : ''}{current.growthPct}%</span>
              <span className="text-white/80 font-normal ml-0.5">vs periode sebelumnya</span>
            </span>
          ) : (
            <span className="text-white/60 text-xs">Tidak ada data periode sebelumnya</span>
          )}
        </div>
      </div>

      {/* 4. STATS GRID */}
      {isLapangan ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-2">Total Booking</p>
            <div className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              {lapanganData.totalBookings} <span className="text-xs font-bold text-slate-400">Tim</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-2">Jam Terpakai</p>
            <div className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              {lapanganData.totalHours} <span className="text-xs font-bold text-slate-400">Jam</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
            <div className="w-7 h-7 rounded-lg bg-red-50 text-[#a62512] flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-2">Transaksi</p>
            <div className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              {kantinData.totalTx.toLocaleString('id-ID')}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
            <div className="w-7 h-7 rounded-lg bg-red-50 text-[#a62512] flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-2">Produk Terjual</p>
            <div className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              {kantinData.totalItems.toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      )}

      {/* 5. OKUPANSI / INFO CARD */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium text-slate-500">
            {isLapangan ? 'Tingkat Okupansi Lapangan' : 'Rata-rata per Transaksi'}
          </p>
          <div className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
            {isLapangan
              ? lapanganData.occupancyRate
              : formatRupiah(kantinData.totalTx > 0 ? Math.round(kantinData.totalSales / kantinData.totalTx) : 0)}
          </div>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
          {isLapangan ? (
            <TrendingUp className="w-5 h-5 stroke-[2.2]" />
          ) : (
            <Banknote className="w-5 h-5 stroke-[2.2]" />
          )}
        </div>
      </div>

      {/* 6. TREN CHART */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            {isLapangan ? 'Tren Pendapatan Lapangan' : 'Tren Penjualan'}
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">{current.label}</span>
        </div>

        <div className="relative pt-1">
          {hoveredPoint && (
            <div className="absolute top-0 right-2 px-2.5 py-1 rounded-xl bg-slate-900 text-white text-[11px] font-bold shadow-md z-10">
              <span>{hoveredPoint.day}: </span>
              <span className={isLapangan ? 'text-emerald-400' : 'text-[#f87171]'}>
                {formatRupiah(hoveredPoint.amount)}
              </span>
            </div>
          )}

          <div className="w-full h-44 flex items-center justify-center">
            {current.chartPoints.length > 0 ? (
              <svg viewBox="0 0 335 180" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="trendGradientLaporan" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={isLapangan ? '#059669' : '#a62512'} stopOpacity="0.25" />
                    <stop offset="80%" stopColor={isLapangan ? '#059669' : '#a62512'} stopOpacity="0.05" />
                    <stop offset="100%" stopColor={isLapangan ? '#059669' : '#a62512'} stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <line x1="10" y1="35" x2="325" y2="35" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="10" y1="70" x2="325" y2="70" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="10" y1="105" x2="325" y2="105" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="10" y1="140" x2="325" y2="140" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="10" y1="160" x2="325" y2="160" stroke="#e2e8f0" strokeWidth="1" />

                {areaPath && (
                  <path d={areaPath} fill="url(#trendGradientLaporan)" className="transition-all duration-500 ease-out" />
                )}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke={isLapangan ? '#059669' : '#a62512'}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-500 ease-out"
                  />
                )}
                {current.chartPoints.map((pt, idx) => (
                  <g
                    key={idx}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoint({ day: pt.day, amount: pt.amount })}
                    onClick={() => setHoveredPoint({ day: pt.day, amount: pt.amount })}
                  >
                    <circle cx={pt.x} cy={pt.y} r="12" fill="transparent" />
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="4"
                      fill="#ffffff"
                      stroke={isLapangan ? '#059669' : '#a62512'}
                      strokeWidth="2.5"
                    />
                  </g>
                ))}
                {current.chartPoints.map((pt, idx) => (
                  <text
                    key={idx}
                    x={pt.x}
                    y="175"
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="10"
                    fontWeight="500"
                  >
                    {pt.day}
                  </text>
                ))}
              </svg>
            ) : (
              <p className="text-xs text-slate-400">Belum ada data untuk periode ini.</p>
            )}
          </div>
        </div>
      </div>

      {/* 7. RINCIAN PER KATEGORI / LAPANGAN */}
      {isLapangan ? (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-700" />
              <span>Pendapatan per Lapangan</span>
            </h3>
            <span className="text-[11px] text-slate-400">Total Jam</span>
          </div>
          {lapanganData.courtBreakdown.length > 0 ? (
            <div className="space-y-3 pt-1">
              {lapanganData.courtBreakdown.map((court, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800">{court.name} ({court.hours} jam)</span>
                    <span className="font-bold text-emerald-700">{formatRupiah(court.amount)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-500"
                      style={{ width: `${court.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-2">Belum ada data booking lapangan untuk periode ini.</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#a62512]" />
              <span>Penjualan per Kategori</span>
            </h3>
            <span className="text-[11px] text-slate-400">Total Omzet</span>
          </div>
          {kantinData.categoriesBreakdown.length > 0 ? (
            <div className="space-y-3 pt-1">
              {kantinData.categoriesBreakdown.map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800">{cat.category} ({cat.qty} pcs)</span>
                    <span className="font-bold text-[#a62512]">{formatRupiah(cat.amount)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#a62512] to-[#eb4b2b] transition-all duration-500"
                      style={{ width: `${cat.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-2">Belum ada data transaksi untuk periode ini.</p>
          )}
        </div>
      )}

      {/* 8. METODE PEMBAYARAN */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">
          {isLapangan ? 'Metode Pembayaran Sewa' : 'Metode Pembayaran'}
        </h3>

        {current.paymentBreakdown.length > 0 ? (
          <div className="grid grid-cols-2 items-center gap-4 pt-1">
            <div className="flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
                {donutItems.map(({ item, strokeDasharray, strokeDashoffset }, idx) => (
                  <circle
                    key={idx}
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke={item.color}
                    strokeWidth="15"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    onClick={() => setSelectedPaymentMethodDetail(item.name)}
                    className="transition-all duration-500 cursor-pointer hover:opacity-80"
                  />
                ))}
              </svg>
            </div>
            <div className="space-y-2 text-xs font-semibold">
              {current.paymentBreakdown.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedPaymentMethodDetail(item.name)}
                  className="w-full text-left space-y-1 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/90 active:scale-[0.98] border border-slate-200/90 hover:border-slate-300 shadow-2xs transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-800 font-bold group-hover:text-slate-950 transition-colors">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-black text-slate-900">{item.percent}%</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
                    </div>
                  </div>
                  <div className={`text-[11px] font-black pl-4 flex items-center justify-between ${isLapangan ? 'text-emerald-700' : 'text-[#a62512]'}`}>
                    <span>{formatRupiah(item.amount)}</span>
                    <span className="text-[10px] font-semibold text-slate-400 group-hover:underline">Lihat Rincian ›</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-2">Belum ada data pembayaran untuk periode ini.</p>
        )}
      </div>

      {/* 9. QUICK LINK */}
      {isLapangan ? (
        <Link
          href="/booking/history"
          className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-between shadow-2xs transition-all group cursor-pointer"
        >
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <span>Buka Riwayat Nota Sewa Lapangan ({bookings.length} Booking)</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 transition-colors" />
        </Link>
      ) : (
        <Link
          href="/history"
          className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-between shadow-2xs transition-all group cursor-pointer"
        >
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-red-50 text-[#a62512]">
              <FileText className="w-4 h-4" />
            </div>
            <span>Lihat Rincian Riwayat Nota Kasir ({transactions.length} Nota)</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 transition-colors" />
        </Link>
      )}

      {/* Modal Input Data Penjualan Kemarin (Khusus Owner) */}
      <InputManualSaleModal
        isOpen={isInputManualOpen}
        onClose={() => setIsInputManualOpen(false)}
        onSuccess={() => {
          loadTransactions();
        }}
      />

      {/* Modal Input Data Sewa Lapangan Kemarin (Khusus Owner) */}
      <InputManualBookingModal
        isOpen={isInputManualBookingOpen}
        onClose={() => setIsInputManualBookingOpen(false)}
        onSuccess={() => {
          loadBookings();
        }}
      />

      {/* Modal Rekap Total Omset Hari Ini untuk Owner */}
      <OwnerDailyRevenueModal
        isOpen={isOwnerRevenueModalOpen}
        onClose={() => setIsOwnerRevenueModalOpen(false)}
      />

      {/* Modal Rincian Metode Pembayaran (QRIS / Cash) */}
      <PaymentMethodDetailModal
        isOpen={Boolean(selectedPaymentMethodDetail)}
        onClose={() => setSelectedPaymentMethodDetail(null)}
        methodName={selectedPaymentMethodDetail || ''}
        isLapangan={isLapangan}
        periodLabel={current.label}
        filteredBookings={lapanganData.filteredBookings}
        filteredTransactions={kantinData.filteredTransactions}
        onOpenBookingReceipt={(bkg) => setSelectedBookingForReceipt(bkg)}
        onOpenKantinReceipt={(tx) => setSelectedTxForReceipt(tx)}
      />

      {/* Modal Nota Booking Lapangan */}
      <BookingReceiptModal
        isOpen={Boolean(selectedBookingForReceipt)}
        booking={selectedBookingForReceipt}
        onClose={() => setSelectedBookingForReceipt(null)}
      />

      {/* Modal Nota Transaksi Kantin */}
      <ReceiptModal
        isOpen={Boolean(selectedTxForReceipt)}
        transaction={selectedTxForReceipt}
        onClose={() => setSelectedTxForReceipt(null)}
        onNewTransaction={() => setSelectedTxForReceipt(null)}
      />
    </div>
  );
}

// ============================================================
// HELPER: build chart points from transactions
// ============================================================
function buildKantinChartPoints(
  filtered: ReturnType<typeof useTransactionStore.getState>['transactions'],
  period: PeriodType,
  start: string,
  end: string
): { day: string; x: number; y: number; amount: number }[] {
  const daysInMonth = new Date(new Date(start).getFullYear(), new Date(start).getMonth() + 1, 0).getDate();

  if (period === 'HARI_INI' || period === 'CUSTOM') {
    const hours = [8, 11, 14, 17, 20, 22];
    const slotDefs = hours.map((h, i) => ({
      label: `${String(h).padStart(2, '0')}`,
      test: (dateStr: string, hour = 0) => dateStr === start && hour >= h && hour < (hours[i + 1] ?? 24),
    }));
    const amounts = slotDefs.map(({ test }) =>
      filtered
        .filter((t) => {
          const dateStr = t.createdAt.split('T')[0];
          const hour = new Date(t.createdAt).getHours();
          return test(dateStr, hour);
        })
        .reduce((s, t) => s + t.grandTotal, 0)
    );
    const maxAmt = Math.max(...amounts, 1);
    const xStep = slotDefs.length > 1 ? 295 / (slotDefs.length - 1) : 0;
    return slotDefs.map((slot, i) => ({
      day: slot.label,
      amount: amounts[i],
      x: Math.round(20 + i * xStep),
      y: Math.round(155 - (amounts[i] / maxAmt) * 120),
    }));
  }

  if (period === 'MINGGU_INI') {
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const startDate = new Date(start + 'T00:00:00');
    const weekSlots = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      return {
        label: dayNames[d.getDay()],
        test: (s: string) => s === dateStr,
      };
    });
    const amounts = weekSlots.map(({ test }) =>
      filtered
        .filter((t) => test(t.createdAt.split('T')[0]))
        .reduce((s, t) => s + t.grandTotal, 0)
    );
    const maxAmt = Math.max(...amounts, 1);
    const xStep = weekSlots.length > 1 ? 295 / (weekSlots.length - 1) : 0;
    return weekSlots.map((slot, i) => ({
      day: slot.label,
      amount: amounts[i],
      x: Math.round(20 + i * xStep),
      y: Math.round(155 - (amounts[i] / maxAmt) * 120),
    }));
  }

  // BULAN_INI — bucket by day ranges (7 buckets)
  return buildMonthlyPoints(filtered, start, daysInMonth);
}

function buildMonthlyPoints(
  filtered: ReturnType<typeof useTransactionStore.getState>['transactions'],
  start: string,
  daysInMonth: number
): { day: string; x: number; y: number; amount: number }[] {
  const buckets = 7;
  const bucketSize = Math.ceil(daysInMonth / buckets);
  const [yr, mo] = start.split('-').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  const results = Array.from({ length: buckets }, (_, i) => {
    const dayStart = i * bucketSize + 1;
    const dayEnd = Math.min((i + 1) * bucketSize, daysInMonth);
    const bStart = `${yr}-${pad(mo)}-${pad(dayStart)}`;
    const bEnd = `${yr}-${pad(mo)}-${pad(dayEnd)}`;
    const amount = filtered
      .filter((t) => t.createdAt.split('T')[0] >= bStart && t.createdAt.split('T')[0] <= bEnd)
      .reduce((s, t) => s + t.grandTotal, 0);
    return { day: String(dayStart), amount };
  });
  const maxAmt = Math.max(...results.map((r) => r.amount), 1);
  const xStep = 295 / (buckets - 1);
  return results.map((r, i) => ({
    ...r,
    x: Math.round(20 + i * xStep),
    y: Math.round(155 - (r.amount / maxAmt) * 120),
  }));
}

function buildLapanganChartPoints(
  filtered: ReturnType<typeof useCourtBookingStore.getState>['bookings'],
  period: PeriodType,
  start: string,
  end: string
): { day: string; x: number; y: number; amount: number }[] {
  if (period === 'HARI_INI' || period === 'CUSTOM') {
    const hours = [8, 11, 14, 17, 20, 22];
    const amounts = hours.map((h) => {
      return filtered
        .filter((b) => b.date === start && parseInt(b.startTime.split(':')[0]) >= h && parseInt(b.startTime.split(':')[0]) < (hours[hours.indexOf(h) + 1] ?? 24))
        .reduce((s, b) => s + b.amountPaidTotal, 0);
    });
    const maxAmt = Math.max(...amounts, 1);
    const xStep = 295 / (hours.length - 1);
    return hours.map((h, i) => ({
      day: String(h).padStart(2, '0'),
      amount: amounts[i],
      x: Math.round(20 + i * xStep),
      y: Math.round(155 - (amounts[i] / maxAmt) * 120),
    }));
  }

  if (period === 'MINGGU_INI') {
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const startDate = new Date(start + 'T00:00:00');
    const results = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const amount = filtered.filter((b) => b.date === dateStr).reduce((s, b) => s + b.amountPaidTotal, 0);
      return { day: dayNames[d.getDay()], amount };
    });
    const maxAmt = Math.max(...results.map((r) => r.amount), 1);
    const xStep = 295 / 6;
    return results.map((r, i) => ({ ...r, x: Math.round(20 + i * xStep), y: Math.round(155 - (r.amount / maxAmt) * 120) }));
  }

  // BULAN_INI
  const daysInMonth = new Date(new Date(start).getFullYear(), new Date(start).getMonth() + 1, 0).getDate();
  return buildMonthlyPointsBookings(filtered, start, daysInMonth);
}

function buildMonthlyPointsBookings(
  filtered: ReturnType<typeof useCourtBookingStore.getState>['bookings'],
  start: string,
  daysInMonth: number
): { day: string; x: number; y: number; amount: number }[] {
  const buckets = 7;
  const bucketSize = Math.ceil(daysInMonth / buckets);
  const [yr, mo] = start.split('-').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  const results = Array.from({ length: buckets }, (_, i) => {
    const dayStart = i * bucketSize + 1;
    const dayEnd = Math.min((i + 1) * bucketSize, daysInMonth);
    const bStart = `${yr}-${pad(mo)}-${pad(dayStart)}`;
    const bEnd = `${yr}-${pad(mo)}-${pad(dayEnd)}`;
    const amount = filtered.filter((b) => b.date >= bStart && b.date <= bEnd).reduce((s, b) => s + b.amountPaidTotal, 0);
    return { day: String(dayStart), amount };
  });
  const maxAmt = Math.max(...results.map((r) => r.amount), 1);
  const xStep = 295 / (buckets - 1);
  return results.map((r, i) => ({ ...r, x: Math.round(20 + i * xStep), y: Math.round(155 - (r.amount / maxAmt) * 120) }));
}

function isInPrevPeriod(dateStr: string, period: PeriodType, customDate?: string): boolean {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (period === 'CUSTOM' && customDate) {
    const [y, m, d] = customDate.split('-').map(Number);
    const prevDate = new Date(y, m - 1, d - 1);
    return dateStr === fmt(prevDate);
  }
  if (period === 'HARI_INI') {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return dateStr === fmt(yesterday);
  }
  if (period === 'MINGGU_INI') {
    const day = now.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const thisMon = new Date(now);
    thisMon.setDate(now.getDate() + diffToMon);
    const prevSun = new Date(thisMon);
    prevSun.setDate(thisMon.getDate() - 1);
    const prevMon = new Date(prevSun);
    prevMon.setDate(prevSun.getDate() - 6);
    return dateStr >= fmt(prevMon) && dateStr <= fmt(prevSun);
  }
  // BULAN_INI — prev month
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  return dateStr >= fmt(prevMonthStart) && dateStr <= fmt(prevMonthEnd);
}
