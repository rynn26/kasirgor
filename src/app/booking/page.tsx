'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCourtBookingStore } from '@/lib/store/useCourtBookingStore';
import { useShiftStore } from '@/lib/store/useShiftStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { formatRupiah, formatDate } from '@/lib/utils';
import { CourtBooking, BookingStatus } from '@/types/booking';
import {
  CalendarCheck,
  CalendarDays,
  ReceiptText,
  Zap,
  ChevronRight,
  Search,
  Clock,
  User,
  Phone,
  Store,
  CheckCircle2,
  Printer,
  Calendar,
  History as HistoryIcon,
  Plus,
  Settings
} from 'lucide-react';
import { CreateDpBookingModal } from '@/components/booking/CreateDpBookingModal';
import { SettlementModal } from '@/components/booking/SettlementModal';
import { BookingReceiptModal } from '@/components/booking/BookingReceiptModal';

export default function BookingLapanganPage() {
  const router = useRouter();
  const { cashierName, selectedShift, setUnit } = useShiftStore();
  const {
    bookings,
    selectedDate,
    loadCourts,
    loadBookings,
    setSelectedDate,
  } = useCourtBookingStore();
  const { showToast } = useToastStore();

  // View state
  const [activeTab, setActiveTab] = useState<'LIST' | 'GRID'>('LIST');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DP_PAID' | 'SETTLED' | 'IN_PLAY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isDpModalOpen, setIsDpModalOpen] = useState(false);
  const [dpModalMode, setDpModalMode] = useState<'DP' | 'FULL'>('DP');
  const [prefilledCourtId, setPrefilledCourtId] = useState<string | undefined>();
  const [prefilledStartTime, setPrefilledStartTime] = useState<string | undefined>();

  const [isSettlementOpen, setIsSettlementOpen] = useState(false);

  // Load data from Supabase on mount
  useEffect(() => {
    loadCourts();
    loadBookings();
  }, []);
  const [settlementTargetId, setSettlementTargetId] = useState<string | null>(null);

  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptBooking, setReceiptBooking] = useState<CourtBooking | null>(null);

  // Switch to POS Kantin
  const handleSwitchToPOS = () => {
    setUnit('POS_TOKO');
    router.push('/kasir');
  };

  // Pending DP count
  const pendingDpCount = bookings.filter((b) => b.status === 'DP_PAID').length;

  // Filtered bookings
  const filteredBookings = bookings.filter((b) => {
    // Match date if specified
    if (selectedDate && b.date !== selectedDate) return false;

    // Match status tab
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;

    // Match search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        b.bookingCode.toLowerCase().includes(q) ||
        b.customerName.toLowerCase().includes(q) ||
        b.phone.toLowerCase().includes(q) ||
        b.courtName.toLowerCase().includes(q) ||
        (b.communityName && b.communityName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleOpenReceipt = (booking: CourtBooking) => {
    setReceiptBooking(booking);
    setIsReceiptOpen(true);
  };

  const handleOpenSettlement = (booking: CourtBooking) => {
    setSettlementTargetId(booking.id);
    setIsSettlementOpen(true);
  };

  const handleGridSlotClick = (courtId: string, time: string) => {
    setPrefilledCourtId(courtId);
    setPrefilledStartTime(time);
    setDpModalMode('DP');
    setIsDpModalOpen(true);
  };

  return (
    <div className="min-h-full bg-[#f8fafc] p-3.5 sm:p-5 lg:p-6 max-w-7xl mx-auto space-y-5 pb-24">
      
      {/* Top Header Card */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black shadow-md shadow-emerald-600/20">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-lg sm:text-xl text-slate-900 leading-tight">
                Kasir Booking Lapangan
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                Arena GOR
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Kasir: <strong className="text-slate-800 font-semibold">{cashierName || 'Yuli'}</strong> • {selectedShift?.name || (cashierName?.toLowerCase() === 'asfia' ? 'Shift Sore - Malam' : 'Shift Pagi - Siang')}
            </p>
          </div>
        </div>

        {/* Header Right Controls: Date Picker, History, Setting & Unit Switcher */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-800">
            <Calendar className="w-3.5 h-3.5 text-slate-500 mr-2" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer"
            />
          </div>

          <Link
            href="/setting/lapangan"
            title="Pengaturan Harga & Lapangan"
            className="px-3 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Settings className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Setting Lapangan</span>
          </Link>

          <Link
            href="/booking/history"
            title="Buka Riwayat Transaksi Lapangan"
            className="px-3 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <HistoryIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Riwayat Nota</span>
          </Link>

          <button
            type="button"
            onClick={handleSwitchToPOS}
            title="Beralih ke Kasir Jualan / Kantin"
            className="px-3 py-2 rounded-2xl bg-red-50 hover:bg-red-100 text-[#b92b10] border border-red-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Store className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kasir Toko</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 🌟 TRANSACTION TYPE SELECTION HUB (Consistently Styled Cards) */}
      {/* ============================================================ */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              Pilih Jenis Transaksi
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Silakan pilih jenis transaksi booking yang ingin dilakukan
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          
          {/* Card 1: DP Booking Lapangan */}
          <Link
            href="/booking/dp"
            className="group relative p-5 bg-white hover:bg-emerald-50/40 rounded-3xl border border-slate-200 hover:border-emerald-500/50 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer text-left flex items-center justify-between"
          >
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
                <CalendarDays className="w-7 h-7 stroke-[2.2]" />
              </div>
              <div>
                <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider mb-1">
                  Uang Muka
                </span>
                <h3 className="text-base font-black text-slate-900 group-hover:text-emerald-800 transition-colors">
                  DP Booking Lapangan
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">
                  Catat pembayaran DP untuk reservasi jadwal baru
                </p>
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-emerald-500 group-hover:text-white text-slate-400 flex items-center justify-center transition-colors">
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </div>
          </Link>

          {/* Card 2: Pelunasan Booking Lapangan */}
          <Link
            href="/booking/pelunasan"
            className="group relative p-5 bg-white hover:bg-blue-50/40 rounded-3xl border border-slate-200 hover:border-blue-500/50 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer text-left flex items-center justify-between"
          >
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25 group-hover:scale-105 transition-transform relative">
                <ReceiptText className="w-7 h-7 stroke-[2.2]" />
                {pendingDpCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white shadow-xs">
                    {pendingDpCount}
                  </span>
                )}
              </div>
              <div>
                <span className="inline-block px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider mb-1">
                  Sisa Tagihan
                </span>
                <h3 className="text-base font-black text-slate-900 group-hover:text-blue-800 transition-colors">
                  Pelunasan Booking
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">
                  Catat pembayaran sisa sewa sebelum main
                </p>
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-blue-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-colors">
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </div>
          </Link>

          {/* Card 3: Sewa Langsung (Walk-In / Main Sekarang) */}
          <button
            type="button"
            onClick={() => {
              setDpModalMode('FULL');
              setPrefilledCourtId(undefined);
              setPrefilledStartTime(undefined);
              setIsDpModalOpen(true);
            }}
            className="group relative p-5 bg-white hover:bg-orange-50/40 rounded-3xl border border-slate-200 hover:border-orange-500/50 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer text-left flex items-center justify-between"
          >
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-[#b92b10] text-white flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:scale-105 transition-transform">
                <Zap className="w-7 h-7 stroke-[2.2]" />
              </div>
              <div>
                <span className="inline-block px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 text-[10px] font-black uppercase tracking-wider mb-1">
                  Walk-In / Langsung
                </span>
                <h3 className="text-base font-black text-slate-900 group-hover:text-orange-800 transition-colors">
                  Sewa Langsung (100%)
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">
                  Main sekarang dan bayar lunas di kasir
                </p>
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-[#b92b10] group-hover:text-white text-slate-400 flex items-center justify-center transition-colors">
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </div>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 📋 DAFTAR RESERVASI & FILTER STATUS */}
      {/* ============================================================ */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Quick Status Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            {[
              { id: 'ALL', label: 'Semua Booking', count: bookings.length },
              { id: 'DP_PAID', label: 'Menunggu Pelunasan (DP)', count: pendingDpCount },
              { id: 'SETTLED', label: 'Lunas', count: bookings.filter((b) => b.status === 'SETTLED').length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Right: Search Filter */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari pemesan, nomor WA, kode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#b92b10] shadow-2xs"
            />
          </div>
        </div>

        {/* Bookings List Cards */}
          {filteredBookings.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Tidak Ada Data Booking</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Belum ada reservasi untuk tanggal ini atau filter yang dipilih. Silakan catat DP booking baru.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDpModalMode('DP');
                  setIsDpModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat DP Booking Sekarang</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredBookings.map((bkg) => {
                const isDP = bkg.status === 'DP_PAID';
                const isSettled = bkg.status === 'SETTLED';

                return (
                  <div
                    key={bkg.id}
                    className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow space-y-3.5 flex flex-col justify-between"
                  >
                    {/* Top Row: Code & Status */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-black text-sm text-slate-900 mt-0.5">
                            {bkg.customerName}
                          </h3>
                          {bkg.communityName && (
                            <p className="text-[11px] font-semibold text-emerald-700">
                              {bkg.communityName}
                            </p>
                          )}
                        </div>

                        <div>
                          {isDP && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              DP Terbayar
                            </span>
                          )}
                          {isSettled && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Lunas
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Schedule info box */}
                      <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                        <div className="font-bold text-slate-800 flex items-center justify-between">
                          <span>{bkg.courtName}</span>
                          <span className="text-[10px] font-semibold text-slate-500">{bkg.courtType}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 text-[11px]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {bkg.date}
                          </span>
                          <span className="font-bold text-slate-900 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {bkg.startTime} - {bkg.endTime} ({bkg.durationHours} Jam)
                          </span>
                        </div>
                        {bkg.phone && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono pt-0.5 border-t border-slate-200/60">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{bkg.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Payment Breakdown Box */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Total Tarif Sewa</span>
                          <span className="font-black text-slate-800">{formatRupiah(bkg.totalAmount)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">
                            {isDP ? 'Sisa Pelunasan' : 'DP Masuk'}
                          </span>
                          <span className={`font-black ${isDP ? 'text-amber-600' : 'text-emerald-700'}`}>
                            {isDP ? formatRupiah(bkg.remainingBalance) : formatRupiah(bkg.dpAmount)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action CTAs */}
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      {isDP ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenSettlement(bkg)}
                            className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <ReceiptText className="w-3.5 h-3.5" />
                            <span>Lunasi</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenReceipt(bkg)}
                            title="Cetak Bukti DP"
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenReceipt(bkg)}
                            className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Nota Lunas</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      {/* ============================================================ */}
      {/* 🪟 MODALS INTEGRATION */}
      {/* ============================================================ */}

      {/* Modal 1: Create DP or Full Booking */}
      <CreateDpBookingModal
        isOpen={isDpModalOpen}
        initialMode={dpModalMode}
        initialCourtId={prefilledCourtId}
        initialStartTime={prefilledStartTime}
        initialDate={selectedDate}
        onClose={() => setIsDpModalOpen(false)}
        onSuccess={(booking) => {
          setIsDpModalOpen(false);
          setReceiptBooking(booking);
          setIsReceiptOpen(true);
        }}
      />

      {/* Modal 2: Pelunasan Booking */}
      <SettlementModal
        isOpen={isSettlementOpen}
        selectedBookingId={settlementTargetId}
        onClose={() => {
          setIsSettlementOpen(false);
          setSettlementTargetId(null);
        }}
        onSuccess={(updatedBooking) => {
          setIsSettlementOpen(false);
          setReceiptBooking(updatedBooking);
          setIsReceiptOpen(true);
        }}
      />

      {/* Modal 3: Thermal Receipt & WhatsApp Share */}
      <BookingReceiptModal
        isOpen={isReceiptOpen}
        booking={receiptBooking}
        onClose={() => {
          setIsReceiptOpen(false);
          setReceiptBooking(null);
        }}
      />
    </div>
  );
}
