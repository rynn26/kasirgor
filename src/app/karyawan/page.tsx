'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Clock,
  Sun,
  Moon,
  Store,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  MoreVertical,
  Search,
  Plus,
  X,
  Edit3,
  Trash2,
  FileText,
  Shield,
  ArrowRight,
  TrendingUp,
  Banknote
} from 'lucide-react';
import {
  useStaffStore,
} from '@/lib/store/useStaffStore';
import { staffMember } from '@/types/staff';
import { useToastStore } from '@/lib/store/useToastStore';
import { formatRupiah } from '@/lib/utils';

type ActiveTab = 'KARYAWAN' | 'SHIFT' | 'LOG_SHIFT';

export default function ManajemenKaryawanPage() {
  const {
    staffList,
    shiftSchedules,
    shiftLogs,
    isLoading,
    loadStaff,
    loadShiftSchedules,
    loadShiftLogs,
    addStaff,
    updateStaff,
    deleteStaff,
    toggleStaffStatus,
    addShiftSchedule,
    deleteShiftSchedule 
  } = useStaffStore();
  const { showToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<ActiveTab>('KARYAWAN');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('SEMUA');

  // Modal States
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<staffMember | null>(null);

  // New Staff Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState<staffMember['role']>('Kasir');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [assignedShift, setAssignedShift] = useState('Shift Pagi (08:00 - 17:00)');
  const [assignedUnit, setAssignedUnit] = useState<'Kasir Toko & F&B' | 'Booking Lapangan' | 'Semua Unit'>('Kasir Toko & F&B');

  // New Shift Form State
  const [shiftName, setShiftName] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');

  // Load data from Supabase on mount
  useEffect(() => {
    loadStaff();
    loadShiftSchedules();
    loadShiftLogs();
  }, []);

  // Filtered staff
  const filteredStaff = staffList.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.includes(searchTerm) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchRole = roleFilter === 'SEMUA' || s.role === roleFilter;
    return matchSearch && matchRole;
  });

  const activeStaffCount = staffList.filter(s => s.status === 'AKTIF').length;

  const handleOpenAddStaff = () => {
    setStaffToEdit(null);
    setName('');
    setRole('Kasir');
    setPhone('');
    setEmail('');
    setAssignedShift('Shift Pagi (08:00 - 17:00)');
    setAssignedUnit('Kasir Toko & F&B');
    setIsAddStaffOpen(true);
  };

  const handleOpenEditStaff = (staff: staffMember) => {
    setStaffToEdit(staff);
    setName(staff.name);
    setRole(staff.role);
    setPhone(staff.phone);
    setEmail(staff.email || '');
    setAssignedShift(staff.assignedShift);
    setAssignedUnit(staff.assignedUnit);
    setIsAddStaffOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      showToast('Harap isi nama dan nomor telepon');
      return;
    }

    try {
      if (staffToEdit) {
        await updateStaff(staffToEdit.id, {
          name,
          role,
          phone,
          email: email.trim() || undefined,
          assignedShift,
          assignedUnit,
        });
        showToast(`Data staf "${name}" berhasil diperbarui`);
      } else {
        await addStaff({
          name,
          role,
          phone,
          email: email.trim() || undefined,
          assignedShift,
          assignedUnit,
          status: 'AKTIF',
        });
        showToast(`Karyawan "${name}" berhasil ditambahkan`);
      }
      setIsAddStaffOpen(false);
    } catch (err) {
      showToast('Gagal menyimpan data karyawan. Coba lagi.');
    }
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftName.trim()) {
      showToast('Harap masukkan nama shift');
      return;
    }

    try {
      await addShiftSchedule({
        name: shiftName,
        startTime,
        endTime,
        assignedStaffCount: 0,
        isActive: true,
      });
      showToast(`Jadwal shift "${shiftName}" berhasil dibuat`);
      setShiftName('');
      setIsAddShiftOpen(false);
    } catch (err) {
      showToast('Gagal menyimpan jadwal shift. Coba lagi.');
    }
  };

  return (
    <div className="min-h-full bg-[#f8fafc] p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5 pb-28">
      
      {/* ============================================================ */}
      {/* 1. TOP HEADER BANNER */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#eb4b2b] border border-red-100 flex items-center justify-center shadow-xs shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Manajemen Karyawan & Shift
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola penugasan kasir, jadwal pergantian shift, dan rekap kas handover operasional.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAddStaff}
          className="px-5 py-3 rounded-2xl bg-[#eb4b2b] hover:bg-[#d43a1c] active:scale-[0.99] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-[#eb4b2b]/25 transition-all cursor-pointer whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Tambah Karyawan</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* 2. STATS KPI CARDS */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#eb4b2b] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Total Karyawan</p>
            <h3 className="text-xl font-black text-slate-900">{staffList.length} Orang</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Karyawan Aktif</p>
            <h3 className="text-xl font-black text-emerald-600">{activeStaffCount} Bertugas</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Shift Operasional</p>
            <h3 className="text-xl font-black text-slate-900">{shiftSchedules.length} Shift Aktif</h3>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. TAB CONTROLS */}
      {/* ============================================================ */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-2xl max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('KARYAWAN')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'KARYAWAN'
              ? 'bg-white text-[#eb4b2b] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Daftar Karyawan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SHIFT')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'SHIFT'
              ? 'bg-white text-[#eb4b2b] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Jadwal Shift</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('LOG_SHIFT')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'LOG_SHIFT'
              ? 'bg-white text-[#eb4b2b] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Rekap Kasir</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: DAFTAR KARYAWAN */}
      {/* ============================================================ */}
      {activeTab === 'KARYAWAN' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama karyawan, no. HP, atau email..."
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#eb4b2b] focus:bg-white"
              />
            </div>

            {/* Role Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
              {['SEMUA', 'Kasir', 'Owner'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap ${
                    roleFilter === r
                      ? 'bg-[#eb4b2b] text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {r === 'SEMUA' ? 'Semua Role' : r}
                </button>
              ))}
            </div>
          </div>

          {/* Staff Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredStaff.map((staff) => {
              const isMorning = staff.assignedShift.includes('Pagi');
              return (
                <div
                  key={staff.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  {/* Top: Avatar, Name, Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${staff.avatarColor || 'from-orange-500 to-red-600'} text-white font-black text-base flex items-center justify-center shadow-xs shrink-0`}>
                        {staff.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-tight">
                          {staff.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {staff.role}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Gabung: {staff.joinDate}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Pill Toggle */}
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await toggleStaffStatus(staff.id);
                          showToast(`Status ${staff.name} diubah`);
                        } catch {
                          showToast('Gagal mengubah status karyawan.');
                        }
                      }}
                      title="Klik untuk ubah status"
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase transition-all cursor-pointer ${
                        staff.status === 'AKTIF'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : staff.status === 'CUTI'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                          : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {staff.status}
                    </button>
                  </div>

                  {/* Middle Info: Unit & Shift & Contact */}
                  <div className="space-y-2 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Unit Tugas</span>
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        {staff.assignedUnit === 'Booking Lapangan' ? (
                          <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Store className="w-3.5 h-3.5 text-[#eb4b2b]" />
                        )}
                        {staff.assignedUnit}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Jadwal Shift</span>
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        {isMorning ? (
                          <Sun className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <Moon className="w-3.5 h-3.5 text-indigo-500" />
                        )}
                        {staff.assignedShift}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-slate-400 text-[11px]">No. Telepon</span>
                      <a 
                        href={`https://wa.me/${staff.phone.replace(/\D/g, '')}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="font-bold text-[#eb4b2b] hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {staff.phone}
                      </a>
                    </div>
                  </div>

                  {/* Bottom Row: Actions (Edit & Hapus) */}
                  <div className="flex items-center justify-end space-x-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleOpenEditStaff(staff)}
                      className="p-2 rounded-xl text-slate-600 hover:text-[#eb4b2b] hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Data</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm(`Yakin ingin menghapus ${staff.name}?`)) {
                          try {
                            await deleteStaff(staff.id);
                            showToast(`Staf "${staff.name}" telah dihapus`);
                          } catch {
                            showToast('Gagal menghapus karyawan. Coba lagi.');
                          }
                        }
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 text-xs transition-colors cursor-pointer"
                      title="Hapus Karyawan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: PENGATURAN SHIFT */}
      {/* ============================================================ */}
      {activeTab === 'SHIFT' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Jadwal Shift Kerja Kasir & Lapangan</h2>
              <p className="text-xs text-slate-500">Atur jam mulai dan selesai shift untuk kasir toko & resepsionis booking</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddShiftOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Shift</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shiftSchedules.map((shf, idx) => {
              const isMorning = shf.startTime < '12:00';
              const Icon = isMorning ? Sun : Moon;
              const assignedStaff = staffList.filter(s => s.assignedShift.includes(shf.name));

              return (
                <div
                  key={shf.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 rounded-2xl bg-orange-50 text-[#eb4b2b] border border-orange-100 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-slate-900">{shf.name}</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{shf.startTime} - {shf.endTime} WIB</span>
                        </p>
                      </div>
                    </div>

                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                      Aktif Beroperasi
                    </span>
                  </div>

                  {/* Assigned Staff on this Shift */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 block uppercase">
                      Staf Bertugas di Shift Ini ({assignedStaff.length} Orang):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {assignedStaff.length > 0 ? (
                        assignedStaff.map(st => (
                          <span
                            key={st.id}
                            className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center gap-1.5"
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            {st.name} ({st.role})
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">Belum ada staf yang ditetapkan.</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm(`Hapus konfigurasi ${shf.name}?`)) {
                          try {
                            await deleteShiftSchedule(shf.id);
                            showToast(`Shift ${shf.name} dihapus`);
                          } catch {
                            showToast('Gagal menghapus shift.');
                          }
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Hapus Shift"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: REKAP KASIR / HANDOVER */}
      {/* ============================================================ */}
      {activeTab === 'LOG_SHIFT' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div>
            <h2 className="text-base font-bold text-slate-900">Riwayat Sesi Kasir & Handover</h2>
            <p className="text-xs text-slate-500">Laporan modal awal, total omzet transaksi, dan serah terima kas kasir</p>
          </div>

          <div className="space-y-3">
            {shiftLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start space-x-3.5">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    log.status === 'SELESAI'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      : 'bg-amber-50 text-amber-600 border border-amber-100'
                  }`}>
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm sm:text-base text-slate-900">
                        {log.staffName}
                      </h4>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                        {log.shiftName}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        log.status === 'SELESAI'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {log.status === 'SELESAI' ? 'Shift Ditutup' : 'Sedang Bertugas'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {log.date} • Pukul {log.startTime} {log.endTime ? `- ${log.endTime} WIB` : 'WIB (Aktif)'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-right md:text-left text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Modal Awal</span>
                    <span className="font-bold text-slate-800">{formatRupiah(log.openingCash)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Omzet Transaksi</span>
                    <span className="font-black text-[#eb4b2b]">{formatRupiah(log.totalSales)} ({log.totalTransactions} Nota)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total Kas Akhir</span>
                    <span className="font-bold text-emerald-700">
                      {log.closingCash ? formatRupiah(log.closingCash) : 'Dalam Proses'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: TAMBAH / EDIT KARYAWAN */}
      {/* ============================================================ */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-red-50 text-[#eb4b2b]">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900">
                  {staffToEdit ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddStaffOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Rian Pratama"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#eb4b2b] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Peran (Role)</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as staffMember['role'])}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#eb4b2b] focus:bg-white cursor-pointer"
                  >
                    <option value="Kasir">Kasir</option>
                    <option value="Owner">Owner</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">No. WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#eb4b2b] focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Penugasan Unit Operasional</label>
                <select
                  value={assignedUnit}
                  onChange={(e) => setAssignedUnit(e.target.value as 'Kasir Toko & F&B' | 'Booking Lapangan' | 'Semua Unit')}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#eb4b2b] focus:bg-white cursor-pointer"
                >
                  <option value="Kasir Toko & F&B">Kasir Toko & F&B</option>
                  <option value="Booking Lapangan">Booking Lapangan</option>
                  <option value="Semua Unit">Semua Unit (Fleksibel)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Jadwal Shift Utama</label>
                <select
                  value={assignedShift}
                  onChange={(e) => setAssignedShift(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#eb4b2b] focus:bg-white cursor-pointer"
                >
                  <option value="Shift Pagi (08:00 - 17:00)">Shift Pagi (08:00 - 17:00)</option>
                  <option value="Shift Sore (17:00 - 23:00)">Shift Sore (17:00 - 23:00)</option>
                  <option value="Fleksibel">Fleksibel / Rolling</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#eb4b2b] hover:bg-[#d43a1c] text-white font-bold text-xs rounded-xl shadow-md shadow-[#eb4b2b]/25 cursor-pointer"
                >
                  {staffToEdit ? 'Simpan Perubahan' : 'Simpan Karyawan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: TAMBAH SHIFT BARU */}
      {/* ============================================================ */}
      {isAddShiftOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Buat Jadwal Shift Baru</h3>
              <button
                type="button"
                onClick={() => setIsAddShiftOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShift} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Nama Shift</label>
                <input
                  type="text"
                  required
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  placeholder="Contoh: Shift Siang - Malam"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#eb4b2b]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Jam Mulai</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#eb4b2b]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Jam Selesai</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#eb4b2b]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddShiftOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#eb4b2b] hover:bg-[#d43a1c] text-white font-bold text-xs rounded-xl shadow-md shadow-[#eb4b2b]/25"
                >
                  Simpan Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
