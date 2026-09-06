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
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import { OwnerDailyRevenueModal } from '@/components/owner/OwnerDailyRevenueModal';
import { PaymentMethodDetailModal } from '@/components/laporan/PaymentMethodDetailModal';
import { CourtRevenueDetailModal } from '@/components/laporan/CourtRevenueDetailModal';
import { CategorySalesDetailModal } from '@/components/laporan/CategorySalesDetailModal';
import { BookingReceiptModal } from '@/components/booking/BookingReceiptModal';
import { EditCourtBookingModal } from '@/components/booking/EditCourtBookingModal';
import { TransactionDetailModal } from '@/components/pos/TransactionDetailModal';
import { DeleteConfirmationModal, DeleteInfoItem } from '@/components/common/DeleteConfirmationModal';
import { logActivity } from '@/lib/db/activityLogs';
import { CourtBooking } from '@/types/booking';
import { Transaction, normalizeProductCategory } from '@/types/pos';
import { InputManualSaleModal } from '@/components/laporan/InputManualSaleModal';
import { InputManualBookingModal } from '@/components/laporan/InputManualBookingModal';
import { DateRangeModal } from '@/components/laporan/DateRangeModal';
import { formatRupiah } from '@/lib/utils';
import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { useCourtBookingStore } from '@/lib/store/useCourtBookingStore';
import { useAppDateStore } from '@/lib/store/useAppDateStore';
import { useShiftStore } from '@/lib/store/useShiftStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { 
  exportKantinToExcel, 
  printKantinPDF, 
  exportCourtBookingsToExcel, 
  printCourtBookingsPDF,
  printCombinedReportPDF,
  exportCombinedReportToExcel,
} from '@/lib/exportUtils';
import {
  getBookingTxDate,
  getBookingSettleDate,
  getBookingAmountInPeriod,
  getBookingPaymentItemsInPeriod,
  getJakartaToday,
} from '@/lib/bookingUtils';

type PeriodType = 'BULAN_INI' | 'BULAN_LALU' | 'HARI_INI' | 'MINGGU_INI' | 'CUSTOM';

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

function formatDateRange(startStr: string, endStr?: string): string {
  if (!startStr) return 'Pilih Periode';
  if (!endStr || startStr === endStr) {
    return formatShortDate(startStr);
  }
  const [y1, m1, d1] = startStr.split('-').map(Number);
  const [y2, m2, d2] = endStr.split('-').map(Number);
  const date1 = new Date(y1, m1 - 1, d1);
  const date2 = new Date(y2, m2 - 1, d2);

  if (y1 === y2 && m1 === m2) {
    return `${d1} - ${d2} ${date2.toLocaleString('id-ID', { month: 'short' })} ${y2}`;
  }
  if (y1 === y2) {
    return `${d1} ${date1.toLocaleString('id-ID', { month: 'short' })} - ${d2} ${date2.toLocaleString('id-ID', { month: 'short' })} ${y2}`;
  }
  return `${d1} ${date1.toLocaleString('id-ID', { month: 'short' })} ${y1} - ${d2} ${date2.toLocaleString('id-ID', { month: 'short' })} ${y2}`;
}

function getDateRange(
  period: PeriodType,
  customStartDate?: string,
  customEndDate?: string
): { start: string; end: string; label: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (period === 'CUSTOM') {
    const s = customStartDate || fmt(now);
    const e = customEndDate || customStartDate || fmt(now);
    const [realStart, realEnd] = s <= e ? [s, e] : [e, s];
    return {
      start: realStart,
      end: realEnd,
      label: realStart === realEnd ? `Tanggal ${formatDateRange(realStart, realEnd)}` : `Periode ${formatDateRange(realStart, realEnd)}`,
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
  if (period === 'BULAN_LALU') {
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const monthName = prevMonthStart.toLocaleString('id-ID', { month: 'long' });
    const yr = prevMonthStart.getFullYear();
    return {
      start: fmt(prevMonthStart),
      end: fmt(prevMonthEnd),
      label: `Bulan Kemarin (${monthName} ${yr})`,
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
  const { bookings, courts, loadBookings, loadCourts, deleteBooking } = useCourtBookingStore();
  const { selectedUnit, setUnit } = useShiftStore();
  const { showToast } = useToastStore();

  const [activeUnit, setActiveUnit] = useState<'kantin' | 'lapangan'>('kantin');
  const {
    selectedDate: customDate,
    customStartDate = customDate,
    customEndDate = customDate,
    period,
    setSelectedDate,
    setDateRange,
    setPeriod,
  } = useAppDateStore();
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);
  const dateInputRef = React.useRef<HTMLInputElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ day: string; amount: number } | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isRoleChecked, setIsRoleChecked] = useState(false);
  const [isOwnerRevenueModalOpen, setIsOwnerRevenueModalOpen] = useState(false);
  const [selectedPaymentMethodDetail, setSelectedPaymentMethodDetail] = useState<string | null>(null);
  const [selectedCourtDetail, setSelectedCourtDetail] = useState<string | null>(null);
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState<string | null>(null);
  const [selectedBookingForReceipt, setSelectedBookingForReceipt] = useState<CourtBooking | null>(null);
  const [editingBooking, setEditingBooking] = useState<CourtBooking | null>(null);
  const [deletingBooking, setDeletingBooking] = useState<CourtBooking | null>(null);
  const [isDeletingBookingProcess, setIsDeletingBookingProcess] = useState(false);
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<Transaction | null>(null);
  const [isInputManualOpen, setIsInputManualOpen] = useState(false);
  const [isInputManualBookingOpen, setIsInputManualBookingOpen] = useState(false);

  const handleConfirmDeleteBooking = async (reason: string) => {
    if (!deletingBooking) return;
    setIsDeletingBookingProcess(true);
    try {
      let staffName = 'Kasir';
      let staffRole = 'Kasir';
      if (typeof window !== 'undefined') {
        const session = localStorage.getItem('kasir_session');
        if (session) {
          try {
            const parsed = JSON.parse(session);
            staffName = parsed.name || (parsed.role === 'kasir' ? 'Yuli' : 'Owner');
            staffRole = parsed.role === 'kasir' ? 'Kasir' : 'Owner';
          } catch {}
        }
      }

      const paymentMethodStr = deletingBooking.settlementPaymentMethod || deletingBooking.dpPaymentMethod || 'CASH';

      await logActivity({
        staffName,
        role: staffRole,
        actionType: 'DELETE_BOOKING',
        title: `Hapus Booking Lapangan oleh ${staffName}`,
        details: `Alasan: "${reason}". Booking: ${deletingBooking.customerName || 'Penyewa'} (${deletingBooking.courtName || 'Lapangan'}, ${deletingBooking.startTime}-${deletingBooking.endTime}, Total: ${formatRupiah(deletingBooking.totalAmount)}).`,
        metadata: {
          bookingId: deletingBooking.id,
          reason,
          customerName: deletingBooking.customerName,
          courtName: deletingBooking.courtName,
          totalAmount: deletingBooking.totalAmount,
          paymentMethod: paymentMethodStr,
        },
      });

      await deleteBooking(deletingBooking.id);
      showToast('🗑️ Data booking berhasil dihapus!');
      setDeletingBooking(null);
      loadBookings();
    } catch {
      showToast('Gagal menghapus booking');
    } finally {
      setIsDeletingBookingProcess(false);
    }
  };

  const laporanBookingDeleteInfoItems: DeleteInfoItem[] = deletingBooking
    ? [
        { label: 'Tanggal', value: deletingBooking.date || '-' },
        { label: 'Penyewa', value: deletingBooking.customerName || '-' },
        { label: 'Lapangan', value: deletingBooking.courtName || '-' },
        { label: 'Jam Main', value: `${deletingBooking.startTime} - ${deletingBooking.endTime}` },
        { label: 'Total', value: formatRupiah(deletingBooking.totalAmount) },
        { label: 'Metode Pembayaran', value: (deletingBooking.settlementPaymentMethod || deletingBooking.dpPaymentMethod || 'CASH') === 'CASH' ? 'Cash' : (deletingBooking.settlementPaymentMethod || deletingBooking.dpPaymentMethod || 'Cash') },
      ]
    : [];

  const handleManualSuccess = (inputDate?: string) => {
    loadTransactions();
    loadBookings();
    if (inputDate) {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthPrefix = `${prevMonth.getFullYear()}-${pad(prevMonth.getMonth() + 1)}`;
      const thisMonthPrefix = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;

      if (inputDate.startsWith(prevMonthPrefix)) {
        setPeriod('BULAN_LALU');
        showToast('📅 Beralih otomatis ke laporan Bulan Kemarin');
      } else if (inputDate.startsWith(thisMonthPrefix)) {
        setPeriod('BULAN_INI');
      } else {
        setSelectedDate(inputDate);
        setPeriod('CUSTOM');
      }
    }
  };

  useEffect(() => {
    loadTransactions();
    loadBookings();
    loadCourts();

    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('kasir_session');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          const role = (parsed.role || '').toLowerCase();
          const userIsOwner = role === 'owner' || role === 'admin';
          setIsOwner(userIsOwner);
          if (!userIsOwner) {
            setActiveUnit('kantin');
          }
        } catch {
          setIsOwner(false);
          setActiveUnit('kantin');
        }
      } else {
        setIsOwner(false);
        setActiveUnit('kantin');
      }
      setIsRoleChecked(true);
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
    const { start, end, label } = getDateRange(period, customStartDate, customEndDate);

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
        const cat = normalizeProductCategory(item.product.category);
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
    const prevRange = getPrevDateRange(period, customStartDate, customEndDate);
    const prevFiltered = transactions.filter(
      (t) =>
        t.status === 'COMPLETED' &&
        t.createdAt.split('T')[0] >= prevRange.start &&
        t.createdAt.split('T')[0] <= prevRange.end
    );
    const prevSales = prevFiltered.reduce((s, t) => s + t.grandTotal, 0);
    const growthPct =
      prevSales > 0 ? (((totalSales - prevSales) / prevSales) * 100).toFixed(1) : null;

    return {
      label,
      start,
      end,
      totalSales,
      totalTx,
      totalItems,
      paymentBreakdown,
      categoriesBreakdown,
      chartPoints,
      growthPct,
      filteredTransactions: filtered,
    };
  }, [transactions, period, customStartDate, customEndDate]);

  // =============================================
  // DERIVED DATA: ARENA LAPANGAN GOR
  // =============================================
  const lapanganData = useMemo(() => {
    const { start, end, label } = getDateRange(period, customStartDate, customEndDate);

    // Filter booking yang ada uang masuk periode ini ATAU ada jadwal main di periode ini
    const filtered = bookings.filter((b) => {
      if (b.status === 'CANCELLED') return false;
      const amtInPeriod = getBookingAmountInPeriod(b, start, end);
      const isPlayInPeriod = b.date >= start && b.date <= end;
      return amtInPeriod > 0 || isPlayInPeriod;
    });

    // Total pendapatan dihitung murni dari uang riil yang masuk pada rentang tanggal ini (DP / Pelunasan)
    const totalSales = bookings
      .filter((b) => b.status !== 'CANCELLED')
      .reduce((s, b) => s + getBookingAmountInPeriod(b, start, end), 0);

    const playBookings = filtered.filter((b) => b.date >= start && b.date <= end);
    const totalBookings = playBookings.length > 0 ? playBookings.length : filtered.length;
    const totalHours = playBookings.reduce((s, b) => s + b.durationHours, 0);

    // Occupancy: how many court-hour slots were used
    const dStart = new Date(start);
    const dEnd = new Date(end);
    const daysInPeriod = Math.max(1, Math.round((dEnd.getTime() - dStart.getTime()) / (1000 * 3600 * 24)) + 1);
    const totalSlots = courts.length * 14 * daysInPeriod;
    const usedSlots = totalHours;
    const occupancyRate = totalSlots > 0 ? `${Math.min(100, Math.round((usedSlots / totalSlots) * 100))}%` : '0%';

    // Payment breakdown berdasarkan porsi pembayaran riil (DP vs Pelunasan) yang masuk pada periode ini
    const paymentBreakdownMap: Record<string, number> = {};
    bookings.filter((b) => b.status !== 'CANCELLED').forEach((b) => {
      const items = getBookingPaymentItemsInPeriod(b, start, end);
      items.forEach((it) => {
        paymentBreakdownMap[it.method] = (paymentBreakdownMap[it.method] || 0) + it.amount;
      });
    });
    const paymentColors: Record<string, string> = {
      CASH: '#f59e0b',
      QRIS: '#059669',
    };
    const payTotal = Object.values(paymentBreakdownMap).reduce((s, v) => s + v, 0) || 1;
    const paymentBreakdown = Object.entries(paymentBreakdownMap).map(([name, amount]) => ({
      name: name === 'CASH' ? 'Cash (Tunai)' : name,
      amount,
      percent: Math.round((amount / payTotal) * 100),
      color: paymentColors[name] || '#94a3b8',
    }));

    // Court breakdown: omset hanya uang masuk periode ini, jam main jika main di periode ini
    const courtMap: Record<string, { amount: number; hours: number }> = {};
    filtered.forEach((b) => {
      const cleanName = (b.courtName || '')
        .replace(/\s*\([^)]*VIP[^)]*\)/gi, '')
        .replace(/\s*\([^)]*Vinyl[^)]*\)/gi, '')
        .trim();
      const key = cleanName || b.courtName || 'Lapangan 1';
      if (!courtMap[key]) courtMap[key] = { amount: 0, hours: 0 };
      courtMap[key].amount += getBookingAmountInPeriod(b, start, end);
      if (b.date >= start && b.date <= end) {
        courtMap[key].hours += b.durationHours;
      }
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
    const chartPoints = buildLapanganChartPoints(bookings, period, start, end);

    // Growth vs prev
    const prevRange = getPrevDateRange(period, customStartDate, customEndDate);
    const prevSales = bookings
      .filter((b) => b.status !== 'CANCELLED')
      .reduce((s, b) => s + getBookingAmountInPeriod(b, prevRange.start, prevRange.end), 0);
    const growthPct =
      prevSales > 0 ? (((totalSales - prevSales) / prevSales) * 100).toFixed(1) : null;

    return {
      label,
      start,
      end,
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
  }, [bookings, courts, period, customStartDate, customEndDate]);

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
      exportCourtBookingsToExcel(current.label, bookings, current.start, current.end);
      showToast('Laporan Excel Sewa Lapangan berhasil diunduh!');
    } else {
      exportKantinToExcel(current.label, kantinData.filteredTransactions);
      showToast('Laporan Excel Penjualan Kantin berhasil diunduh!');
    }
  };

  const handleExportPDF = () => {
    if (isLapangan) {
      printCourtBookingsPDF(current.label, bookings, current.start, current.end);
      showToast('Membuka format cetak PDF Laporan Sewa Lapangan...');
    } else {
      printKantinPDF(current.label, kantinData.filteredTransactions);
      showToast('Membuka format cetak PDF Laporan Penjualan Kantin...');
    }
  };

  return (
    <div className="min-h-full bg-[#f8fafc] p-3.5 sm:p-6 max-w-md mx-auto space-y-4 pb-28">

      {/* 1. UNIT SWITCHER (Bisa diakses Kasir & Owner untuk input data manual) */}
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
              {isOwner ? (isLapangan ? 'Laporan Sewa Lapangan' : 'Laporan Penjualan') : 'Laporan Pembayaran Kasir'}
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
                <span>Input Data Manual</span>
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
                <span>Input Sewa Manual</span>
              </button>
            )}

            {isOwner && (
              <>
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
              </>
            )}
          </div>
        </div>

        {isOwner ? (
          /* ============================================================ */
          /* FITUR PILIH RENTANG TANGGAL (KHUSUS OWNER) */
          /* ============================================================ */
          <>
            {/* Period Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {([
                { id: 'BULAN_INI', label: 'Bulan Ini' },
                { id: 'BULAN_LALU', label: 'Bulan Kemarin' },
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

              {/* Custom Date Range Pill */}
              <button
                type="button"
                onClick={() => {
                  if (period !== 'CUSTOM') {
                    setPeriod('CUSTOM');
                  }
                  setIsDateRangeModalOpen(true);
                  setHoveredPoint(null);
                }}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 border ${
                  period === 'CUSTOM'
                    ? isLapangan
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'bg-[#a62512] text-white border-[#a62512] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title="Pilih Periode Tanggal"
              >
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {period === 'CUSTOM' && customStartDate
                    ? formatDateRange(customStartDate, customEndDate)
                    : 'Pilih Periode'}
                </span>
              </button>
            </div>

            {/* Quick Date Range Bar when CUSTOM is active */}
            {period === 'CUSTOM' && (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Calendar className={`w-3.5 h-3.5 ${isLapangan ? 'text-emerald-700' : 'text-[#a62512]'}`} />
                    <span>Pilih Rentang Tanggal:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDateRangeModalOpen(true)}
                    className={`text-[11px] font-bold hover:underline cursor-pointer flex items-center gap-0.5 ${
                      isLapangan ? 'text-emerald-700' : 'text-[#a62512]'
                    }`}
                  >
                    <span>Pilihan Cepat & Presets</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Dari Tanggal
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          setDateRange(e.target.value, customEndDate || e.target.value);
                          setHoveredPoint(null);
                        }
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:bg-white transition-all ${
                        isLapangan ? 'focus:border-emerald-600' : 'focus:border-red-500'
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Sampai Tanggal
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          setDateRange(customStartDate || e.target.value, e.target.value);
                          setHoveredPoint(null);
                        }
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:bg-white transition-all ${
                        isLapangan ? 'focus:border-emerald-600' : 'focus:border-red-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* ============================================================ */
          /* FITUR PILIH 1 TANGGAL SAJA (ROLE KASIR) */
          /* Kasir tidak bisa rentang 'dari... sampai...', hanya 1 tanggal */
          /* ============================================================ */
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs space-y-2.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Calendar className="w-4 h-4 text-[#a62512]" />
                <span>Pilih Tanggal Laporan:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const todayStr = getJakartaToday();
                    setDateRange(todayStr, todayStr);
                    setHoveredPoint(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    customStartDate === getJakartaToday()
                      ? 'bg-[#a62512] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const today = getJakartaToday();
                    const d = new Date(`${today}T12:00:00+07:00`);
                    d.setDate(d.getDate() - 1);
                    const pad = (n: number) => String(n).padStart(2, '0');
                    const yStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                    setDateRange(yStr, yStr);
                    setHoveredPoint(null);
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Kemarin
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Tanggal Laporan Kasir
              </label>
              <input
                type="date"
                value={customStartDate || getJakartaToday()}
                onChange={(e) => {
                  if (e.target.value) {
                    setDateRange(e.target.value, e.target.value);
                    setHoveredPoint(null);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:bg-white focus:border-red-500 transition-all cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. HERO CARD: TOTAL PENDAPATAN (Baik Lapangan maupun Kantin/POS jika Owner) */}
      {isOwner && (
        <div
          className={`w-full rounded-[24px] p-5 text-white shadow-md space-y-2 relative overflow-hidden ${
            isLapangan
              ? 'bg-gradient-to-tr from-emerald-700 to-teal-800 shadow-emerald-700/20'
              : 'bg-gradient-to-tr from-[#eb4b2b] to-[#b92b10] shadow-[#eb4b2b]/20'
          }`}
        >
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none blur-xl" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/80 block">
              {isLapangan ? 'Total Pendapatan Sewa Lapangan' : 'Total Penjualan Toko & Kantin'}
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
        onSuccess={handleManualSuccess}
      />

      {/* Modal Input Data Sewa Lapangan Kemarin (Khusus Owner) */}
      <InputManualBookingModal
        isOpen={isInputManualBookingOpen}
        onClose={() => setIsInputManualBookingOpen(false)}
        onSuccess={handleManualSuccess}
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
        startDate={current.start}
        endDate={current.end}
        filteredBookings={lapanganData.filteredBookings}
        filteredTransactions={kantinData.filteredTransactions}
        onOpenBookingReceipt={(bkg) => setSelectedBookingForReceipt(bkg)}
        onOpenKantinReceipt={(tx) => setSelectedTxForReceipt(tx)}
      />

      {/* Modal Rincian Pendapatan per Lapangan */}
      <CourtRevenueDetailModal
        isOpen={Boolean(selectedCourtDetail)}
        onClose={() => setSelectedCourtDetail(null)}
        courtName={selectedCourtDetail || ''}
        periodLabel={current.label}
        startDate={current.start}
        endDate={current.end}
        filteredBookings={lapanganData.filteredBookings}
        onOpenBookingReceipt={(bkg) => setSelectedBookingForReceipt(bkg)}
      />

      {/* Modal Nota Booking Lapangan */}
      <BookingReceiptModal
        isOpen={Boolean(selectedBookingForReceipt)}
        booking={selectedBookingForReceipt}
        onClose={() => setSelectedBookingForReceipt(null)}
        onEdit={(b) => {
          setSelectedBookingForReceipt(null);
          setEditingBooking(b);
        }}
        onDelete={(b) => {
          setSelectedBookingForReceipt(null);
          setDeletingBooking(b);
        }}
      />

      {/* Modal Edit Booking Lapangan */}
      <EditCourtBookingModal
        isOpen={Boolean(editingBooking)}
        booking={editingBooking}
        onClose={() => setEditingBooking(null)}
        onSuccess={() => {
          loadBookings();
          setEditingBooking(null);
        }}
      />

      {/* Pop Up Alasan Penghapusan Booking Lapangan (Wajib Diisi, Tanpa Tombol Silang) */}
      <DeleteConfirmationModal
        isOpen={Boolean(deletingBooking)}
        title="Hapus Booking Lapangan"
        subtitle="Booking yang dihapus tidak akan muncul di laporan aktif, tetapi akan tetap tercatat di log sistem."
        warningTitle="Yakin ingin menghapus booking ini?"
        warningSubtitle="Tindakan ini tidak dapat dibatalkan."
        infoItems={laporanBookingDeleteInfoItems}
        reasonPlaceholder="Tulis alasan penghapusan booking lapangan..."
        confirmButtonText="Hapus Booking"
        isProcessing={isDeletingBookingProcess}
        onClose={() => setDeletingBooking(null)}
        onConfirm={handleConfirmDeleteBooking}
      />

      {/* Modal Detail & Edit Transaksi Kantin */}
      <TransactionDetailModal
        isOpen={Boolean(selectedTxForReceipt)}
        transaction={selectedTxForReceipt}
        onClose={() => setSelectedTxForReceipt(null)}
        onUpdated={() => {
          loadTransactions();
          setSelectedTxForReceipt(null);
        }}
      />

      {/* Modal Rincian Penjualan per Kategori */}
      <CategorySalesDetailModal
        isOpen={Boolean(selectedCategoryDetail)}
        onClose={() => setSelectedCategoryDetail(null)}
        categoryName={selectedCategoryDetail || ''}
        periodLabel={kantinData.label}
        filteredTransactions={kantinData.filteredTransactions}
        onOpenKantinReceipt={(tx) => setSelectedTxForReceipt(tx)}
      />

      {/* Modal Rekap Omset Gabungan */}
      <OwnerDailyRevenueModal
        isOpen={isOwnerRevenueModalOpen}
        onClose={() => setIsOwnerRevenueModalOpen(false)}
        initialDate={customStartDate || customDate}
      />

      {/* Modal Pilih Rentang Periode Tanggal (Khusus Owner) */}
      <DateRangeModal
        isOpen={isDateRangeModalOpen && isOwner}
        onClose={() => setIsDateRangeModalOpen(false)}
        startDate={customStartDate}
        endDate={customEndDate}
        onApply={(s, e) => {
          setDateRange(s, e);
          setHoveredPoint(null);
        }}
        accentColor={isLapangan ? 'emerald' : 'red'}
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

  if (period === 'HARI_INI' || (period === 'CUSTOM' && start === end)) {
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

  if (period === 'CUSTOM' && start !== end) {
    const dStart = new Date(start + 'T00:00:00');
    const dEnd = new Date(end + 'T00:00:00');
    const diffDays = Math.max(1, Math.round((dEnd.getTime() - dStart.getTime()) / (1000 * 3600 * 24)) + 1);

    if (diffDays <= 14) {
      const daySlots = Array.from({ length: diffDays }, (_, i) => {
        const d = new Date(dStart);
        d.setDate(dStart.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        return {
          label: `${d.getDate()}`,
          test: (s: string) => s === dateStr,
        };
      });
      const amounts = daySlots.map(({ test }) =>
        filtered
          .filter((t) => test(t.createdAt.split('T')[0]))
          .reduce((s, t) => s + t.grandTotal, 0)
      );
      const maxAmt = Math.max(...amounts, 1);
      const xStep = daySlots.length > 1 ? 295 / (daySlots.length - 1) : 0;
      return daySlots.map((slot, i) => ({
        day: slot.label,
        amount: amounts[i],
        x: Math.round(20 + i * xStep),
        y: Math.round(155 - (amounts[i] / maxAmt) * 120),
      }));
    } else {
      const buckets = 7;
      const bucketSize = Math.ceil(diffDays / buckets);
      const results = Array.from({ length: buckets }, (_, i) => {
        const bStartDate = new Date(dStart);
        bStartDate.setDate(dStart.getDate() + i * bucketSize);
        const bEndDate = new Date(dStart);
        bEndDate.setDate(dStart.getDate() + Math.min((i + 1) * bucketSize - 1, diffDays - 1));

        const bStartStr = bStartDate.toISOString().split('T')[0];
        const bEndStr = bEndDate.toISOString().split('T')[0];

        const amount = filtered
          .filter((t) => {
            const dateStr = t.createdAt.split('T')[0];
            return dateStr >= bStartStr && dateStr <= bEndStr;
          })
          .reduce((s, t) => s + t.grandTotal, 0);
        return { day: `${bStartDate.getDate()}`, amount };
      });
      const maxAmt = Math.max(...results.map((r) => r.amount), 1);
      const xStep = 295 / (buckets - 1);
      return results.map((r, i) => ({
        ...r,
        x: Math.round(20 + i * xStep),
        y: Math.round(155 - (r.amount / maxAmt) * 120),
      }));
    }
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
  bookings: ReturnType<typeof useCourtBookingStore.getState>['bookings'],
  period: PeriodType,
  start: string,
  end: string
): { day: string; x: number; y: number; amount: number }[] {
  const activeBookings = bookings.filter((b) => b.status !== 'CANCELLED');

  if (period === 'HARI_INI' || (period === 'CUSTOM' && start === end)) {
    const hours = [8, 11, 14, 17, 20, 22];
    const amounts = hours.map((h, i) => {
      const nextH = hours[i + 1] ?? 24;
      let slotAmt = 0;
      activeBookings.forEach((b) => {
        const totalPaid = b.amountPaidTotal || 0;
        const dpAmt = b.dpAmount || 0;
        const realDp = Math.min(dpAmt, totalPaid);
        const realSettle = Math.max(0, totalPaid - realDp);

        const txDate = getBookingTxDate(b);
        const settleDate = getBookingSettleDate(b);

        const dpHour = b.dpPaidAt
          ? new Date(b.dpPaidAt).getHours()
          : b.createdAt
          ? new Date(b.createdAt).getHours()
          : parseInt(b.startTime?.split(':')[0] || '8');

        const settleHour = b.settlementPaidAt
          ? new Date(b.settlementPaidAt).getHours()
          : dpHour;

        // DP masuk pada tanggal DP dan jam pembayaran DP
        if (txDate === start && realDp > 0 && dpHour >= h && dpHour < nextH) {
          slotAmt += realDp;
        }

        // Pelunasan masuk pada tanggal pelunasan dan jam pelunasan
        if (settleDate === start && realSettle > 0) {
          if (settleDate !== txDate && settleHour >= h && settleHour < nextH) {
            slotAmt += realSettle;
          } else if (settleDate === txDate && dpHour >= h && dpHour < nextH) {
            slotAmt += realSettle;
          }
        }
      });
      return slotAmt;
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

  if (period === 'CUSTOM' && start !== end) {
    const dStart = new Date(start + 'T00:00:00');
    const dEnd = new Date(end + 'T00:00:00');
    const diffDays = Math.max(1, Math.round((dEnd.getTime() - dStart.getTime()) / (1000 * 3600 * 24)) + 1);

    if (diffDays <= 14) {
      const daySlots = Array.from({ length: diffDays }, (_, i) => {
        const d = new Date(dStart);
        d.setDate(dStart.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const amount = activeBookings
          .reduce((s, b) => s + getBookingAmountInPeriod(b, dateStr, dateStr), 0);
        return { day: `${d.getDate()}`, amount };
      });
      const maxAmt = Math.max(...daySlots.map((r) => r.amount), 1);
      const xStep = daySlots.length > 1 ? 295 / (daySlots.length - 1) : 0;
      return daySlots.map((r, i) => ({
        ...r,
        x: Math.round(20 + i * xStep),
        y: Math.round(155 - (r.amount / maxAmt) * 120),
      }));
    } else {
      const buckets = 7;
      const bucketSize = Math.ceil(diffDays / buckets);
      const results = Array.from({ length: buckets }, (_, i) => {
        const bStartDate = new Date(dStart);
        bStartDate.setDate(dStart.getDate() + i * bucketSize);
        const bEndDate = new Date(dStart);
        bEndDate.setDate(dStart.getDate() + Math.min((i + 1) * bucketSize - 1, diffDays - 1));

        const bStartStr = bStartDate.toISOString().split('T')[0];
        const bEndStr = bEndDate.toISOString().split('T')[0];
        const amount = activeBookings
          .reduce((s, b) => s + getBookingAmountInPeriod(b, bStartStr, bEndStr), 0);
        return { day: `${bStartDate.getDate()}`, amount };
      });
      const maxAmt = Math.max(...results.map((r) => r.amount), 1);
      const xStep = 295 / (buckets - 1);
      return results.map((r, i) => ({
        ...r,
        x: Math.round(20 + i * xStep),
        y: Math.round(155 - (r.amount / maxAmt) * 120),
      }));
    }
  }

  if (period === 'MINGGU_INI') {
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const startDate = new Date(start + 'T00:00:00');
    const results = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const amount = activeBookings
        .reduce((s, b) => s + getBookingAmountInPeriod(b, dateStr, dateStr), 0);
      return { day: dayNames[d.getDay()], amount };
    });
    const maxAmt = Math.max(...results.map((r) => r.amount), 1);
    const xStep = 295 / 6;
    return results.map((r, i) => ({ ...r, x: Math.round(20 + i * xStep), y: Math.round(155 - (r.amount / maxAmt) * 120) }));
  }

  // BULAN_INI / BULAN_LALU
  const daysInMonth = new Date(new Date(start).getFullYear(), new Date(start).getMonth() + 1, 0).getDate();
  return buildMonthlyPointsBookings(activeBookings, start, daysInMonth);
}

function buildMonthlyPointsBookings(
  bookings: ReturnType<typeof useCourtBookingStore.getState>['bookings'],
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
    const amount = bookings
      .reduce((s, b) => s + getBookingAmountInPeriod(b, bStart, bEnd), 0);
    return { day: String(dayStart), amount };
  });
  const maxAmt = Math.max(...results.map((r) => r.amount), 1);
  const xStep = 295 / (buckets - 1);
  return results.map((r, i) => ({ ...r, x: Math.round(20 + i * xStep), y: Math.round(155 - (r.amount / maxAmt) * 120) }));
}

function getPrevDateRange(
  period: PeriodType,
  customStartDate?: string,
  customEndDate?: string
): { start: string; end: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (period === 'CUSTOM') {
    const s = customStartDate || fmt(now);
    const e = customEndDate || customStartDate || fmt(now);
    const [realStart, realEnd] = s <= e ? [s, e] : [e, s];
    const dStart = new Date(realStart);
    const dEnd = new Date(realEnd);
    const diffDays = Math.max(1, Math.round((dEnd.getTime() - dStart.getTime()) / (1000 * 3600 * 24)) + 1);

    const prevEnd = new Date(dStart);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - (diffDays - 1));

    return { start: fmt(prevStart), end: fmt(prevEnd) };
  }
  if (period === 'HARI_INI') {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const s = fmt(yesterday);
    return { start: s, end: s };
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
    return { start: fmt(prevMon), end: fmt(prevSun) };
  }
  if (period === 'BULAN_LALU') {
    const twoMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const twoMonthsAgoEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0);
    return { start: fmt(twoMonthsAgoStart), end: fmt(twoMonthsAgoEnd) };
  }
  // BULAN_INI — prev month
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  return { start: fmt(prevMonthStart), end: fmt(prevMonthEnd) };
}
