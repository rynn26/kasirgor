'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Receipt,
  Package,
  Users,
  AlertTriangle,
  Bell,
  TrendingUp,
  ChevronRight,
  X,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShoppingCart,
  Store,
  CalendarCheck,
  Repeat
} from 'lucide-react';
import { formatRupiah, formatDate } from '@/lib/utils';
import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { useProductStore } from '@/lib/store/useProductStore';
import { useCartStore } from '@/lib/store/useCartStore';
import { useShiftStore } from '@/lib/store/useShiftStore';
import { useCourtBookingStore } from '@/lib/store/useCourtBookingStore';
import { ReceiptModal } from '@/components/pos/ReceiptModal';
import { Transaction } from '@/types/pos';

type TimeFilter = 'HARI' | 'MINGGU' | 'BULAN';

export default function DashboardUnifiedPage() {
  const router = useRouter();
  const { transactions, getDailySummary, loadTransactions } = useTransactionStore();
  const { products, loadProducts } = useProductStore();
  const { getTotalItems } = useCartStore();
  const { selectedShift, cashierName: storedCashierName } = useShiftStore();
  const { courts, bookings, loadCourts, loadBookings } = useCourtBookingStore();

  const [role, setRole] = useState<'owner' | 'kasir'>('owner');
  const [userName, setUserName] = useState('Wilson');
  const [activeUnit, setActiveUnit] = useState<'kantin' | 'lapangan'>('kantin');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('HARI');
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; label: string; value: number } | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [greeting, setGreeting] = useState('Selamat sore');
  const [isMounted, setIsMounted] = useState(false);

  // Load data from Supabase on mount
  useEffect(() => {
    loadProducts();
    loadTransactions();
    const today = new Date().toISOString().split('T')[0];
    loadCourts();
    loadBookings(today);
    setIsMounted(true);
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) {
      setGreeting('Selamat pagi');
    } else if (hour >= 11 && hour < 15) {
      setGreeting('Selamat siang');
    } else if (hour >= 15 && hour < 18) {
      setGreeting('Selamat sore');
    } else {
      setGreeting('Selamat malam');
    }

    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('kasir_session');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          if (parsed.role === 'kasir') {
            setRole('kasir');
            setUserName(parsed.name || parsed.user || 'Yuli');
          } else {
            setRole('owner');
            setUserName(parsed.name || parsed.user || 'Wilson');
          }
        } catch {}
      }

      const savedUnit = localStorage.getItem('active_dashboard_unit');
      if (savedUnit === 'lapangan' || savedUnit === 'kantin') {
        setActiveUnit(savedUnit);
      }
    }
  }, []);

  const handleSwitchUnit = (unit: 'kantin' | 'lapangan') => {
    setActiveUnit(unit);
    if (typeof window !== 'undefined') {
      localStorage.setItem('active_dashboard_unit', unit);
      window.dispatchEvent(new Event('dashboard_unit_change'));
    }
    const { setUnit } = useShiftStore.getState();
    setUnit(unit === 'kantin' ? 'POS_TOKO' : 'BOOKING_LAPANGAN');
  };

  const totalCartItems = getTotalItems();
  const summary = getDailySummary();
  const recentTransactions = transactions.slice(0, 5);
  const activeShiftName = selectedShift?.name || 'Shift Pagi - Siang';

  // Low stock products (stok <= 15 dan stok > 0)
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= 15).length;
  const outOfStockCount = products.filter(p => p.stock <= 0).length;

  // ============================================================
  // TOP SELLING PRODUCTS — computed from real transactions (7 hari)
  // ============================================================
  const topProducts = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString().split('T')[0];

    const productMap: Record<string, { id: string; name: string; sold: number; category: string; price: number }> = {};

    transactions
      .filter((t) => t.status === 'COMPLETED' && t.createdAt >= cutoff)
      .forEach((t) => {
        t.items.forEach((item) => {
          const key = item.product.id || item.product.name;
          if (!productMap[key]) {
            productMap[key] = {
              id: key,
              name: item.product.name,
              sold: 0,
              category: item.product.category,
              price: item.product.price,
            };
          }
          productMap[key].sold += item.quantity;
        });
      });

    return Object.values(productMap)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);
  }, [transactions]);

  // ============================================================
  // CHART DATA — computed from real transactions
  // ============================================================
  const buildChartPoints = (
    filter: TimeFilter,
    txList: typeof transactions
  ) => {
    if (filter === 'HARI') {
      // Hourly for today
      const hours = [8, 11, 14, 17, 20, 22];
      const today = new Date().toISOString().split('T')[0];
      return hours.map((h, i) => {
        const nextH = hours[i + 1] ?? 24;
        const value = txList
          .filter((t) => {
            if (!t.createdAt.startsWith(today)) return false;
            const txH = new Date(t.createdAt).getHours();
            return txH >= h && txH < nextH;
          })
          .reduce((s, t) => s + t.grandTotal, 0);
        const x = 20 + i * 60;
        const y = 175;
        return { label: `${String(h).padStart(2, '0')}:00`, value, x, y };
      });
    }
    if (filter === 'MINGGU') {
      const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      return Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (5 - i));
        const dateStr = d.toISOString().split('T')[0];
        const value = txList
          .filter((t) => t.status === 'COMPLETED' && t.createdAt.startsWith(dateStr))
          .reduce((s, t) => s + t.grandTotal, 0);
        return { label: dayLabels[d.getDay()], value, x: 20 + i * 60, y: 175 };
      });
    }
    // BULAN — 4 weekly buckets
    return Array.from({ length: 4 }, (_, i) => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - i * 7);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
      const start = startDate.toISOString().split('T')[0];
      const end = endDate.toISOString().split('T')[0];
      const value = txList
        .filter((t) => t.status === 'COMPLETED' && t.createdAt.split('T')[0] >= start && t.createdAt.split('T')[0] <= end)
        .reduce((s, t) => s + t.grandTotal, 0);
      return { label: `Mgg ${4 - i}`, value, x: 20 + (3 - i) * 100, y: 175 };
    }).reverse();
  };

  const currentPoints = useMemo(() => {
    const raw = buildChartPoints(timeFilter, transactions);
    // Normalize Y positions (y inversely proportional to value, between 40 and 165)
    const maxVal = Math.max(...raw.map((p) => p.value), 1);
    return raw.map((p) => ({
      ...p,
      y: Math.round(165 - ((p.value / maxVal) * 125)),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFilter, transactions]);

  // Court bookings for today
  const today = new Date().toISOString().split('T')[0];
  const todayCourtBookings = useMemo(
    () => bookings.filter((b) => b.date === today && b.status !== 'CANCELLED'),
    [bookings, today]
  );

  // Court status list — merge courts with today's active bookings
  const courtStatusList = useMemo(() => {
    return courts.map((court) => {
      const now = new Date();
      const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const activeBooking = todayCourtBookings.find(
        (b) =>
          b.courtId === court.id &&
          b.startTime <= nowStr &&
          b.endTime > nowStr &&
          b.status !== 'CANCELLED'
      );

      const upcomingBooking = todayCourtBookings.find(
        (b) =>
          b.courtId === court.id &&
          b.startTime > nowStr &&
          b.status !== 'CANCELLED'
      );

      if (activeBooking) {
        return {
          id: court.id,
          name: court.name,
          type: court.type,
          status: 'IN_PLAY',
          statusLabel: 'Sedang Main',
          team: activeBooking.customerName + (activeBooking.communityName ? ` (${activeBooking.communityName})` : ''),
          time: `${activeBooking.startTime} - ${activeBooking.endTime}`,
          pricePerHour: court.pricePerHour,
        };
      }
      if (upcomingBooking) {
        return {
          id: court.id,
          name: court.name,
          type: court.type,
          status: 'BOOKED_SOON',
          statusLabel: `Booking ${upcomingBooking.startTime}`,
          team: upcomingBooking.customerName,
          time: `${upcomingBooking.startTime} - ${upcomingBooking.endTime}`,
          pricePerHour: court.pricePerHour,
        };
      }
      return {
        id: court.id,
        name: court.name,
        type: court.type,
        status: 'AVAILABLE',
        statusLabel: 'Tersedia',
        team: 'Siap Digunakan',
        time: 'Slot Bebas',
        pricePerHour: court.pricePerHour,
      };
    });
  }, [courts, todayCourtBookings]);

  // Court KPI stats
  const courtsInPlay = courtStatusList.filter((c) => c.status === 'IN_PLAY').length;
  const bookingsPendingSettlement = todayCourtBookings.filter((b) => b.status === 'DP_PAID').length;
  const totalBookingRevenue = todayCourtBookings.reduce((s, b) => s + b.amountPaidTotal, 0);
  const occupancyPct =
    courts.length > 0 ? Math.round((courtsInPlay / courts.length) * 100) : 0;

  // Kasir lapangan: pelunasan menunggu count
  const pendingSettlementCount = todayCourtBookings.filter((b) => b.status === 'DP_PAID').length;

  // Kantin hero revenue (today)
  const todayRevenue = summary.totalRevenue;
  const yesterdayRevenue = useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const ydStr = yesterday.toISOString().split('T')[0];
    return transactions
      .filter((t) => t.status === 'COMPLETED' && t.createdAt.startsWith(ydStr))
      .reduce((s, t) => s + t.grandTotal, 0);
  }, [transactions]);

  const revenueGrowth =
    yesterdayRevenue > 0
      ? (((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100).toFixed(1)
      : null;

  const generatePath = (points: typeof currentPoints) => {
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

  const linePath = generatePath(currentPoints);
  const areaPath =
    currentPoints.length > 0
      ? `${linePath} L ${currentPoints[currentPoints.length - 1].x},175 L ${currentPoints[0].x},175 Z`
      : '';

  return (
    <div className="min-h-full bg-[#f8fafc] p-3.5 sm:p-6 max-w-md mx-auto space-y-4 pb-28">

      {/* ============================================================ */}
      {/* UNIT SWITCHER PILL (Kantin vs Lapangan) */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
        <span className="text-[11px] font-bold text-slate-500 pl-2">Layanan Unit:</span>
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => handleSwitchUnit('kantin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              activeUnit === 'kantin'
                ? 'bg-white text-[#eb4b2b] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Kantin / Kasir</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchUnit('lapangan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              activeUnit === 'lapangan'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Lapangan</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION: DASHBOARD KASIR (ROLE === 'kasir') */}
      {/* ============================================================ */}
      {role === 'kasir' ? (
        activeUnit === 'kantin' ? (
          /* KASIR VIEW - KANTIN / POS TOKO */
          <div className="w-full bg-white rounded-[28px] p-5 sm:p-6 shadow-xs border border-slate-200/90 space-y-5 animate-in fade-in duration-200">
            {/* Top Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-full bg-[#eb4b2b] text-white flex items-center justify-center font-bold text-sm shadow-md shadow-[#eb4b2b]/20">
                  {(storedCashierName || userName).slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-[#eb4b2b] tracking-tight">
                    Halo, Selamat Datang
                  </h2>
                </div>
              </div>

              {/* Cart Action Button */}
              <Link
                href="/keranjang"
                title="Keranjang"
                className="p-2.5 rounded-2xl bg-white text-slate-700 hover:text-[#eb4b2b] border border-slate-200 transition-colors cursor-pointer relative flex items-center justify-center shadow-2xs"
              >
                <ShoppingCart className="w-5 h-5 stroke-[1.75]" />
                {totalCartItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#eb4b2b] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                    {totalCartItems}
                  </span>
                )}
              </Link>
            </div>

            {/* Greeting & Shift */}
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <span>Selamat datang, {storedCashierName || userName}</span>
                <span>👋</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Kasir Toko & F&B • {activeShiftName}
              </p>
            </div>

            {/* HERO CTA BUTTON: MULAI TRANSAKSI */}
            <Link
              href="/kasir"
              className="w-full py-4 px-6 rounded-2xl bg-[#eb4b2b] hover:bg-[#d43a1c] active:scale-[0.99] text-white font-black text-base tracking-wider uppercase shadow-lg shadow-[#eb4b2b]/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <ShoppingCart className="w-5 h-5 stroke-[2.5]" />
              <span>MULAI TRANSAKSI</span>
            </Link>

            {/* 2-Column KPI Stat Cards */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 block">
                  Transaksi Hari Ini
                </span>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {summary.totalTransactions}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 block">
                  Produk Terjual
                </span>
                <div className="text-2xl font-black text-[#eb4b2b] tracking-tight">
                  {summary.totalItemsSold} <span className="text-xs font-bold text-slate-400">Pcs</span>
                </div>
              </div>
            </div>

            {/* Transaksi Terakhir Section */}
            <div className="pt-2">
              <h3 className="text-base font-bold text-slate-900 mb-3">
                Transaksi Terakhir
              </h3>

              <div className="space-y-2.5">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      className="p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 transition-all flex items-center justify-between gap-3 cursor-pointer shadow-2xs group"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#eb4b2b] border border-red-100 flex items-center justify-center shrink-0">
                          <Receipt className="w-5 h-5" />
                        </div>

                        <div className="min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate group-hover:text-[#eb4b2b] transition-colors font-mono">
                            {tx.invoiceNumber}
                          </h4>
                          <p suppressHydrationWarning className="text-[11px] text-slate-400 mt-0.5">
                            {isMounted ? formatDate(tx.createdAt, true) : '—'} • {tx.items.reduce((s, i) => s + i.quantity, 0)} Item
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs sm:text-sm font-black text-slate-900">
                          {formatRupiah(tx.grandTotal)}
                        </div>
                        <span className="text-[10px] font-bold text-[#eb4b2b]">
                          {tx.paymentMethod === 'CASH' ? 'Tunai' : tx.paymentMethod}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Belum ada transaksi hari ini. Klik <strong>MULAI TRANSAKSI</strong> di atas.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* KASIR VIEW - BOOKING LAPANGAN */
          <div className="w-full bg-white rounded-[28px] p-5 sm:p-6 shadow-xs border border-slate-200/90 space-y-5 animate-in fade-in duration-200">
            {/* Top Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-emerald-600/20">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-emerald-700 tracking-tight">
                    Kasir Booking Lapangan
                  </h2>
                </div>
              </div>

              <Link
                href="/booking/history"
                title="Riwayat Booking"
                className="p-2.5 rounded-2xl bg-white text-slate-700 hover:text-emerald-700 border border-slate-200 transition-colors cursor-pointer relative flex items-center justify-center shadow-2xs"
              >
                <Repeat className="w-5 h-5 stroke-[1.75]" />
              </Link>
            </div>

            {/* Greeting & Shift */}
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <span>Selamat bertugas, {storedCashierName || userName}</span>
                <span>🏸</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Unit Operasional Lapangan GOR • {activeShiftName}
              </p>
            </div>

            {/* HERO CTA BUTTON: BUKA KASIR BOOKING */}
            <Link
              href="/booking"
              className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-base tracking-wider uppercase shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <CalendarCheck className="w-5 h-5 stroke-[2.5]" />
              <span>BUKA KASIR BOOKING</span>
            </Link>

            {/* Quick Actions (DP Baru & Pelunasan) */}
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/booking/dp"
                className="p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all flex items-center gap-2.5 group"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black text-emerald-900 block truncate">
                    + Booking DP
                  </span>
                  <span className="text-[10px] text-emerald-700 block">Jadwal Baru</span>
                </div>
              </Link>

              <Link
                href="/booking/pelunasan"
                className="p-3.5 rounded-2xl bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-all flex items-center gap-2.5 group"
              >
                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black text-teal-900 block truncate">
                    Pelunasan
                  </span>
                  <span className="text-[10px] text-teal-700 block">
                    {pendingSettlementCount > 0 ? `${pendingSettlementCount} Menunggu` : 'Tidak Ada'}
                  </span>
                </div>
              </Link>
            </div>

            {/* 2-Column KPI Stat Cards */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 block">
                  Jadwal Hari Ini
                </span>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {todayCourtBookings.length} <span className="text-xs font-bold text-slate-400">Tim</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 block">
                  Perlu Pelunasan
                </span>
                <div className="text-2xl font-black text-emerald-600 tracking-tight">
                  {pendingSettlementCount} <span className="text-xs font-bold text-slate-400">Jadwal</span>
                </div>
              </div>
            </div>

            {/* Jadwal Terdekat */}
            <div className="pt-2">
              <h3 className="text-base font-bold text-slate-900 mb-3">
                Jadwal Lapangan Hari Ini
              </h3>

              <div className="space-y-2.5">
                {todayCourtBookings.length > 0 ? (
                  todayCourtBookings.slice(0, 3).map((bkg) => (
                    <div
                      key={bkg.id}
                      className="p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 transition-all flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shrink-0">
                          <CalendarCheck className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate font-mono">
                            {bkg.customerName}
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                            {bkg.courtName} • {bkg.startTime} - {bkg.endTime}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          bkg.status === 'IN_PLAY'
                            ? 'bg-amber-100 text-amber-800'
                            : bkg.status === 'SETTLED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {bkg.status === 'IN_PLAY' ? 'Sedang Main' : bkg.status === 'SETTLED' ? 'Lunas' : 'DP Lunas'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Belum ada jadwal booking hari ini.
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      ) : (
        /* ============================================================ */
        /* SECTION: DASHBOARD OWNER (ROLE === 'owner') */
        /* ============================================================ */
        <div className="space-y-4 animate-in fade-in duration-200">

          {/* 1. TOP HEADER: Owner Avatar & Greeting + Notification Bell */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full ring-2 ring-slate-200/80 shadow-xs overflow-hidden bg-slate-100 flex items-center justify-center">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                    alt="Owner Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white absolute bottom-0 right-0" />
              </div>

              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                  <span>{isMounted ? greeting : 'Selamat sore'}, Owner</span>
                  <span className="text-lg">👋</span>
                </h1>
                <p className="text-[11px] font-medium text-slate-400">
                  {activeUnit === 'kantin' ? 'Monitoring Toko & F&B' : 'Monitoring Arena Lapangan GOR'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsNotificationOpen(true)}
              className="relative p-2 rounded-2xl hover:bg-slate-100 text-[#eb4b2b] transition-all cursor-pointer"
              title="Notifikasi & Peringatan"
            >
              <Bell className="w-6 h-6 fill-[#eb4b2b] text-[#eb4b2b]" />
              {(lowStockCount > 0 || outOfStockCount > 0 || bookingsPendingSettlement > 0) && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-600 ring-2 ring-white animate-pulse" />
              )}
            </button>
          </div>

          {activeUnit === 'kantin' ? (
            /* ============================================================ */
            /* OWNER VIEW A: DASHBOARD OWNER KANTIN / KASIR TOKO */
            /* ============================================================ */
            <>
              {/* 2. HERO REVENUE CARD (Penjualan Hari Ini) */}
              <div className="w-full bg-white rounded-[24px] p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-medium text-slate-500 block">
                    Penjualan Toko & Kantin Hari Ini
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-red-50 text-[#eb4b2b] font-bold text-[10px]">
                    Kantin / Kasir
                  </span>
                </div>

                <div className="text-[32px] sm:text-[36px] font-black text-[#eb4b2b] tracking-tight leading-none">
                  {formatRupiah(todayRevenue)}
                </div>

                {revenueGrowth !== null ? (
                  <div className="flex items-center gap-1 text-xs font-semibold pt-0.5">
                    <span className={Number(revenueGrowth) >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                      <span className="text-sm font-bold">{Number(revenueGrowth) >= 0 ? '↗' : '↘'}</span>
                      {' '}{Number(revenueGrowth) >= 0 ? '+' : ''}{revenueGrowth}%
                    </span>
                    <span className="text-slate-500 font-medium">dibanding kemarin</span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 pt-0.5">Belum ada data pembanding kemarin</div>
                )}
              </div>

              {/* 3. 2x2 STATS KPI GRID */}
              <div className="grid grid-cols-2 gap-3">
                {/* Transaksi */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center space-x-2">
                    <Receipt className="w-4 h-4 text-[#3b82f6] stroke-[2.2]" />
                    <span className="text-xs font-medium text-slate-500">Transaksi</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                    {summary.totalTransactions}
                  </div>
                </div>

                {/* Produk Terjual */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-[#f97316] stroke-[2.2]" />
                    <span className="text-xs font-medium text-slate-500">Item Terjual</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                    {summary.totalItemsSold}
                  </div>
                </div>

                {/* Avg Basket */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-[#0ea5e9] stroke-[2.2]" />
                    <span className="text-xs font-medium text-slate-500">Rata-rata Nota</span>
                  </div>
                  <div className="text-xl font-black text-slate-900 tracking-tight mt-2">
                    {formatRupiah(summary.averageBasketSize)}
                  </div>
                </div>

                {/* Stok Menipis */}
                <div className="bg-[#fffbf0] rounded-2xl p-4 border border-[#fef3c7] shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-[#f59e0b] stroke-[2.2]" />
                    <span className="text-xs font-medium text-[#d97706]">Stok Menipis</span>
                  </div>
                  <div className="text-2xl font-black text-[#f59e0b] tracking-tight mt-2">
                    {lowStockCount}
                  </div>
                </div>
              </div>

              {/* 4. SALES TREND CHART CARD */}
              <div className="bg-white rounded-[24px] p-5 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    Tren Omzet Kantin
                  </h2>

                  <div className="flex items-center bg-slate-100/90 p-1 rounded-xl gap-1">
                    {(['HARI', 'MINGGU', 'BULAN'] as TimeFilter[]).map((tab) => {
                      const isActive = timeFilter === tab;
                      const labelMap = { HARI: 'Hari', MINGGU: 'Minggu', BULAN: 'Bulan' };
                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => {
                            setTimeFilter(tab);
                            setHoveredPoint(null);
                          }}
                          className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            isActive
                              ? 'bg-white text-[#eb4b2b] shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {labelMap[tab]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Interactive SVG Smooth Line Chart */}
                <div className="relative pt-2">
                  {hoveredPoint && (
                    <div className="absolute top-0 right-4 px-2.5 py-1 rounded-xl bg-slate-900 text-white text-[11px] font-bold shadow-md z-10 flex items-center gap-1.5">
                      <span className="text-slate-300">{hoveredPoint.label}:</span>
                      <span className="text-[#eb4b2b] font-black">{formatRupiah(hoveredPoint.value)}</span>
                    </div>
                  )}

                  <div className="w-full h-44 flex items-center justify-center">
                    <svg viewBox="0 0 335 180" className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="salesGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#eb4b2b" stopOpacity="0.28" />
                          <stop offset="60%" stopColor="#eb4b2b" stopOpacity="0.08" />
                          <stop offset="100%" stopColor="#eb4b2b" stopOpacity="0.0" />
                        </linearGradient>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#eb4b2b" floodOpacity="0.25" />
                        </filter>
                      </defs>

                      <line x1="15" y1="40" x2="320" y2="40" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="15" y1="90" x2="320" y2="90" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="15" y1="140" x2="320" y2="140" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="15" y1="175" x2="320" y2="175" stroke="#e2e8f0" strokeWidth="1" />

                      {areaPath && <path d={areaPath} fill="url(#salesGradient)" className="transition-all duration-500 ease-out" />}
                      {linePath && <path d={linePath} fill="none" stroke="#eb4b2b" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" className="transition-all duration-500 ease-out" />}

                      {currentPoints.map((pt, idx) => (
                        <g
                          key={idx}
                          className="cursor-pointer group"
                          onMouseEnter={() => setHoveredPoint({ index: idx, label: pt.label, value: pt.value })}
                          onClick={() => setHoveredPoint({ index: idx, label: pt.label, value: pt.value })}
                        >
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="5"
                            fill="#ffffff"
                            stroke="#eb4b2b"
                            strokeWidth="3"
                            className="transition-transform duration-200 group-hover:scale-150"
                          />
                          <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>
              </div>

              {/* 5. TOP SELLING PRODUCTS */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    Produk Terlaris
                  </h2>
                  <Link href="/produk" className="text-xs font-bold text-[#eb4b2b] hover:text-[#d33a1c]">
                    Lihat Semua
                  </Link>
                </div>

                {topProducts.length > 0 ? (
                  <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x">
                    {topProducts.map((prod, idx) => (
                      <div
                        key={prod.id}
                        className="w-36 sm:w-40 shrink-0 snap-start bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-2.5 group cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`w-6 h-6 rounded-lg font-black text-[11px] flex items-center justify-center ${
                            idx === 0 ? 'bg-amber-100 text-amber-800' : idx === 1 ? 'bg-slate-100 text-slate-700' : 'bg-red-50 text-[#eb4b2b]'
                          }`}>
                            #{idx + 1}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                            {prod.category}
                          </span>
                        </div>

                        <div>
                          <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate group-hover:text-[#eb4b2b] transition-colors">
                            {prod.name}
                          </h3>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                            {prod.sold} terjual
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs font-black text-[#eb4b2b]">
                            {formatRupiah(prod.price)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">Belum ada data penjualan produk.</p>
                )}
              </div>

              {/* 6. QUICK ACCESS: MANAJEMEN KARYAWAN & SHIFT */}
              <Link
                href="/karyawan"
                className="w-full p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs flex items-center justify-between transition-all group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-[#eb4b2b] border border-red-100 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-[#eb4b2b] transition-colors">
                      Manajemen Karyawan & Shift
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Kelola jadwal dan penugasan kasir
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1 text-xs font-bold text-[#eb4b2b]">
                  <span>Kelola</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </Link>
            </>
          ) : (
            /* ============================================================ */
            /* OWNER VIEW B: DASHBOARD OWNER BOOKING LAPANGAN GOR */
            /* ============================================================ */
            <>
              {/* 2. HERO REVENUE CARD (Pendapatan Booking Lapangan Hari Ini) */}
              <div className="w-full bg-white rounded-[24px] p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-medium text-slate-500 block">
                    Pendapatan Sewa Lapangan Hari Ini
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                    Arena Lapangan GOR
                  </span>
                </div>

                <div className="text-[32px] sm:text-[36px] font-black text-emerald-700 tracking-tight leading-none">
                  {formatRupiah(totalBookingRevenue)}
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="text-slate-400 font-medium">
                    {todayCourtBookings.length} booking tercatat hari ini
                  </div>
                  <span className="text-slate-400 font-medium">
                    {bookingsPendingSettlement > 0 ? `${bookingsPendingSettlement} menunggu pelunasan` : 'Semua lunas'}
                  </span>
                </div>
              </div>

              {/* 3. 2x2 STATS KPI GRID (LAPANGAN) */}
              <div className="grid grid-cols-2 gap-3">
                {/* Total Booking */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center space-x-2">
                    <CalendarCheck className="w-4 h-4 text-emerald-600 stroke-[2.2]" />
                    <span className="text-xs font-medium text-slate-500">Total Booking</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                    {todayCourtBookings.length} <span className="text-xs font-bold text-slate-400">Jadwal</span>
                  </div>
                </div>

                {/* Okupansi Lapangan */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-teal-600 stroke-[2.2]" />
                    <span className="text-xs font-medium text-slate-500">Sedang Aktif</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-600 tracking-tight mt-2">
                    {courtsInPlay} <span className="text-xs font-bold text-slate-400">Lapangan</span>
                  </div>
                </div>

                {/* Lapangan In-Play */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-[#3b82f6] stroke-[2.2]" />
                    <span className="text-xs font-medium text-slate-500">Okupansi</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                    {occupancyPct}%
                  </div>
                </div>

                {/* Menunggu Pelunasan */}
                <div className="bg-[#fffbf0] rounded-2xl p-4 border border-[#fef3c7] shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-[#f59e0b] stroke-[2.2]" />
                    <span className="text-xs font-medium text-[#d97706]">Perlu Pelunasan</span>
                  </div>
                  <div className="text-2xl font-black text-[#f59e0b] tracking-tight mt-2">
                    {bookingsPendingSettlement} <span className="text-xs font-bold text-amber-600/70">Tim</span>
                  </div>
                </div>
              </div>

              {/* 4. TREN CHART LAPANGAN */}
              <div className="bg-white rounded-[24px] p-5 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      Tren Sewa Lapangan
                    </h2>
                    <p className="text-[11px] text-slate-400 font-medium">Grafik booking & pendapatan</p>
                  </div>

                  <div className="flex items-center bg-slate-100/90 p-1 rounded-xl gap-1">
                    {(['HARI', 'MINGGU', 'BULAN'] as TimeFilter[]).map((tab) => {
                      const isActive = timeFilter === tab;
                      const labelMap = { HARI: 'Hari', MINGGU: 'Minggu', BULAN: 'Bulan' };
                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => {
                            setTimeFilter(tab);
                            setHoveredPoint(null);
                          }}
                          className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            isActive
                              ? 'bg-white text-emerald-700 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {labelMap[tab]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Interactive SVG Smooth Line Chart (Emerald Glow Theme) */}
                <div className="relative pt-2">
                  {hoveredPoint && (
                    <div className="absolute top-0 right-4 px-2.5 py-1 rounded-xl bg-slate-900 text-white text-[11px] font-bold shadow-md z-10 flex items-center gap-1.5">
                      <span className="text-slate-300">{hoveredPoint.label}:</span>
                      <span className="text-emerald-400 font-black">{formatRupiah(hoveredPoint.value)}</span>
                    </div>
                  )}

                  <div className="w-full h-44 flex items-center justify-center">
                    <svg viewBox="0 0 335 180" className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="courtGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#059669" stopOpacity="0.28" />
                          <stop offset="60%" stopColor="#059669" stopOpacity="0.08" />
                          <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
                        </linearGradient>
                        <filter id="courtGlow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#059669" floodOpacity="0.25" />
                        </filter>
                      </defs>

                      <line x1="15" y1="40" x2="320" y2="40" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="15" y1="90" x2="320" y2="90" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="15" y1="140" x2="320" y2="140" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="15" y1="175" x2="320" y2="175" stroke="#e2e8f0" strokeWidth="1" />

                      {areaPath && <path d={areaPath} fill="url(#courtGradient)" className="transition-all duration-500 ease-out" />}
                      {linePath && <path d={linePath} fill="none" stroke="#059669" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#courtGlow)" className="transition-all duration-500 ease-out" />}

                      {currentPoints.map((pt, idx) => (
                        <g
                          key={idx}
                          className="cursor-pointer group"
                          onMouseEnter={() => setHoveredPoint({ index: idx, label: pt.label, value: pt.value })}
                          onClick={() => setHoveredPoint({ index: idx, label: pt.label, value: pt.value })}
                        >
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="5"
                            fill="#ffffff"
                            stroke="#059669"
                            strokeWidth="3"
                            className="transition-transform duration-200 group-hover:scale-150"
                          />
                          <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>
              </div>

              {/* 5. STATUS REALTIME LAPANGAN */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      Status Live Lapangan
                    </h2>
                    <p className="text-[11px] text-slate-400 font-medium">Kondisi lapangan GOR saat ini</p>
                  </div>
                  <Link href="/booking" className="text-xs font-bold text-emerald-700 hover:text-emerald-800">
                    Buka Kasir
                  </Link>
                </div>

                {courts.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    {courtStatusList.map((court) => {
                      const isInPlay = court.status === 'IN_PLAY';
                      const isBooked = court.status === 'BOOKED_SOON';
                      return (
                        <div
                          key={court.id}
                          className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-2 ${
                            isInPlay
                              ? 'bg-amber-50/50 border-amber-200'
                              : isBooked
                              ? 'bg-blue-50/50 border-blue-200'
                              : 'bg-emerald-50/40 border-emerald-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                              {court.type.split(' ')[0]}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              isInPlay
                                ? 'bg-amber-100 text-amber-800'
                                : isBooked
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {court.statusLabel}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-bold text-xs text-slate-900 truncate">
                              {court.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                              {court.team}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-400">{court.time}</span>
                            <span className="font-black text-slate-800">{formatRupiah(court.pricePerHour)}/j</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">Data lapangan belum tersedia.</p>
                )}
              </div>

              {/* 6. JADWAL BOOKING TERKINI */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    Jadwal Hari Ini
                  </h2>
                  <Link href="/booking/history" className="text-xs font-bold text-emerald-700 hover:text-emerald-800">
                    Riwayat Nota
                  </Link>
                </div>

                <div className="space-y-2.5">
                  {todayCourtBookings.length > 0 ? (
                    todayCourtBookings.map((bkg) => (
                      <div
                        key={bkg.id}
                        className="p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 transition-all flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shrink-0">
                            <CalendarCheck className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                              {bkg.customerName}
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                              {bkg.courtName} • {bkg.startTime} - {bkg.endTime}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-slate-900">
                            {formatRupiah(bkg.totalAmount)}
                          </div>
                          <span className={`text-[10px] font-bold ${
                            bkg.status === 'IN_PLAY'
                              ? 'text-amber-600'
                              : bkg.status === 'SETTLED'
                              ? 'text-emerald-700'
                              : 'text-blue-600'
                          }`}>
                            {bkg.status === 'SETTLED' ? 'Lunas' : bkg.status === 'DP_PAID' ? 'DP Lunas' : bkg.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400">
                      Belum ada jadwal booking hari ini.
                    </div>
                  )}
                </div>
              </div>

              {/* 7. QUICK ACCESS LINK */}
              <Link
                href="/booking"
                className="w-full p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs flex items-center justify-between transition-all group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shrink-0">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                      Buka Kasir Operasional Lapangan
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Kelola booking, DP, pelunasan & jadwal lapangan
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1 text-xs font-bold text-emerald-700">
                  <span>Buka</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </Link>
            </>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* NOTIFICATION MODAL — data real dari DB */}
      {/* ============================================================ */}
      {isNotificationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-red-50 text-[#eb4b2b]">
                  <Bell className="w-5 h-5 fill-[#eb4b2b]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Notifikasi Owner</h3>
                  <p className="text-[10px] text-slate-400">Pembaruan performa & inventaris toko</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNotificationOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {/* Stok Menipis */}
              {lowStockCount > 0 || outOfStockCount > 0 ? (
                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Peringatan Stok
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    {outOfStockCount > 0 && `${outOfStockCount} produk habis stok. `}
                    {lowStockCount > 0 && `${lowStockCount} produk stok menipis (≤ 15).`}
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Stok Aman
                  </div>
                  <p className="text-[11px] text-emerald-800">Semua produk memiliki stok yang cukup.</p>
                </div>
              )}

              {/* Penjualan Hari Ini */}
              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-900 space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    Penjualan Hari Ini
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  {summary.totalTransactions > 0
                    ? `${summary.totalTransactions} transaksi • Total ${formatRupiah(todayRevenue)}.`
                    : 'Belum ada transaksi hari ini.'}
                </p>
              </div>

              {/* Pelunasan Booking */}
              {bookingsPendingSettlement > 0 && (
                <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-blue-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
                    Perlu Pelunasan
                  </div>
                  <p className="text-[11px] text-blue-800">
                    {bookingsPendingSettlement} booking lapangan menunggu pelunasan hari ini.
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsNotificationOpen(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={Boolean(selectedTx)}
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
        onNewTransaction={() => {
          setSelectedTx(null);
          router.push('/kasir');
        }}
      />
    </div>
  );
}
