'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, Eye, EyeOff, AlertCircle, ShieldCheck, Store, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { staffMember } from '@/types/staff';

type RoleType = 'KASIR' | 'OWNER';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<RoleType>('OWNER');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registeredStaff, setRegisteredStaff] = useState<staffMember[]>([]);

  // Load registered staff for easy selection/validation
  React.useEffect(() => {
    async function loadStaff() {
      try {
        const { data } = await supabase.from('staff').select('*').order('name');
        if (data) {
          setRegisteredStaff(
            data.map((d: any) => ({
              id: d.id,
              name: d.name,
              role: d.role,
              phone: d.phone || '',
              email: d.email || '',
              assignedShift: d.assigned_shift || '',
              assignedUnit: d.assigned_unit || 'Semua Unit',
              status: d.status,
              joinDate: d.created_at,
              avatarColor: d.avatar_color || '',
            }))
          );
        }
      } catch (err) {
        console.error('Gagal memuat staf:', err);
      }
    }
    loadStaff();
  }, []);

  const handleLogin = async (e?: React.FormEvent, customRole?: RoleType, customUser?: string) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const targetRole = customRole || role;
    const targetUser = (customUser || usernameOrEmail).trim();

    if (!targetUser) {
      setErrorMsg('Harap isi username atau email.');
      return;
    }

    if (!password && !customUser) {
      setErrorMsg('Harap masukkan password.');
      return;
    }

    setIsLoading(true);

    try {
      // If user inputs an email, attempt official Supabase Auth signInWithPassword first
      if (targetUser.includes('@')) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: targetUser,
          password: password,
        });

        if (!authError && authData?.user) {
          // Authentication with Supabase Auth succeeded!
          // Check if this user exists in the staff table, if not -> auto-create profile
          const { data: existingStaff } = await supabase
            .from('staff')
            .select('*')
            .eq('email', authData.user.email)
            .maybeSingle();

          let staffProfile = existingStaff;

          if (!staffProfile) {
            // Auto-sync into staff table
            const newRole = targetRole === 'OWNER' ? 'Owner' : 'Kasir';
            const displayName = authData.user.user_metadata?.name || targetUser.split('@')[0];
            const { data: createdStaff, error: createError } = await supabase
              .from('staff')
              .insert({
                name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
                role: newRole,
                email: authData.user.email,
                phone: authData.user.phone || null,
                status: 'AKTIF',
                assigned_unit: 'Semua Unit',
                assigned_shift: 'Shift Pagi (08:00 - 17:00)',
                avatar_color: 'from-orange-500 to-red-600',
              })
              .select()
              .single();

            if (!createError && createdStaff) {
              staffProfile = createdStaff;
            }
          }

          const rawRole = (staffProfile?.role || (targetRole === 'OWNER' ? 'Owner' : 'Kasir')).toLowerCase();
          const userRole = rawRole === 'owner' ? 'owner' : 'kasir';
          const userName = staffProfile?.name || targetUser.split('@')[0];

          if (typeof window !== 'undefined') {
            localStorage.setItem(
              'kasir_session',
              JSON.stringify({
                user: targetUser,
                role: userRole,
                name: userName,
                id: authData.user.id,
                email: authData.user.email,
                shift: staffProfile?.assigned_shift,
                unit: staffProfile?.assigned_unit,
              })
            );
          }

          if (userRole === 'owner' || targetRole === 'OWNER') {
            router.push('/dashboard');
          } else {
            router.push('/shift');
          }
          return;
        }

        // If authError was invalid credentials, show clear message
        if (authError && authError.message.toLowerCase().includes('invalid login credentials')) {
          setErrorMsg('Email atau password salah.');
          return;
        }
      }

      // 2. Lookup in staff table (for username / kasir name / fallback)
      const { data: dbStaff, error: dbError } = await supabase
        .from('staff')
        .select('*');

      if (dbError) throw dbError;

      const staffList: any[] = dbStaff || [];

      if (targetRole === 'OWNER') {
        const isDefaultOwner = targetUser.toLowerCase() === 'owner' || targetUser.toLowerCase() === 'owner@kasirgor.com';
        const foundOwnerInDb = staffList.find(
          (s) =>
            s.role?.toLowerCase() === 'owner' &&
            (s.email?.toLowerCase() === targetUser.toLowerCase() ||
             s.name?.toLowerCase() === targetUser.toLowerCase() ||
             s.phone === targetUser)
        );

        if (!isDefaultOwner && !foundOwnerInDb) {
          setErrorMsg('Akun Owner tidak ditemukan di database. Pastikan email atau nama sudah terdaftar.');
          return;
        }

        if (foundOwnerInDb && foundOwnerInDb.status === 'NONAKTIF') {
          setErrorMsg('Akun Owner ini sedang berstatus NONAKTIF.');
          return;
        }

        const sessionName = foundOwnerInDb?.name || 'Wilson';
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'kasir_session',
            JSON.stringify({
              user: targetUser,
              role: 'owner',
              name: sessionName,
              id: foundOwnerInDb?.id || 'owner-default',
            })
          );
        }

        router.push('/dashboard');
      } else {
        // Role KASIR: Must exist in staff database
        const foundStaff = staffList.find(
          (s) =>
            s.email?.toLowerCase() === targetUser.toLowerCase() ||
            s.name?.toLowerCase() === targetUser.toLowerCase() ||
            s.phone === targetUser
        );

        const isDefaultKasir =
          targetUser.toLowerCase() === 'yuli' ||
          targetUser.toLowerCase() === 'asfia' ||
          targetUser.toLowerCase() === 'andi' ||
          targetUser.toLowerCase() === 'kasir';

        if (!foundStaff && !isDefaultKasir) {
          setErrorMsg(`Akun "${targetUser}" tidak ditemukan di database staf. Silakan tambahkan staf di menu Karyawan terlebih dahulu.`);
          return;
        }

        if (foundStaff && foundStaff.status !== 'AKTIF') {
          setErrorMsg(`Akun "${foundStaff.name}" tidak dapat login karena berstatus ${foundStaff.status}.`);
          return;
        }

        const sessionName = foundStaff?.name || targetUser || 'Yuli';
        const sessionRole = foundStaff?.role?.toLowerCase() === 'owner' ? 'owner' : 'kasir';

        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'kasir_session',
            JSON.stringify({
              user: targetUser,
              role: sessionRole,
              name: sessionName,
              id: foundStaff?.id || 'staff-default',
              shift: foundStaff?.assigned_shift || 'Shift Pagi (08:00 - 17:00)',
              unit: foundStaff?.assigned_unit || 'Semua Unit',
            })
          );
        }

        router.push('/shift');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg(err?.message || 'Gagal login. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (targetRole: RoleType, customName?: string) => {
    if (targetRole === 'OWNER') {
      setUsernameOrEmail('Wilson');
      setPassword('123456');
      handleLogin(undefined, 'OWNER', 'Wilson');
    } else {
      const name = customName || 'Yuli';
      setUsernameOrEmail(name);
      setPassword('123456');
      handleLogin(undefined, 'KASIR', name);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] relative flex flex-col items-center justify-center p-4 selection:bg-[#b92b10] selection:text-white">
      {/* Background Dot Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'radial-gradient(#94a3b8 1.2px, transparent 1.2px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Main Login Card Container */}
      <div className="w-full max-w-[400px] bg-white rounded-[28px] shadow-xl p-6 sm:p-8 relative z-10 flex flex-col items-center border border-slate-200">
        
        {/* Top Logo / Avatar */}
        <div className="relative -mt-2 mb-3">
          <div className="w-20 h-20 rounded-full bg-white p-1 shadow-md ring-1 ring-slate-200 overflow-hidden flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-orange-50 to-red-50 flex flex-col items-center justify-center text-center p-2">
              <div className="w-8 h-8 rounded-xl bg-[#eb4b2b] text-white flex items-center justify-center font-black text-xs shadow-sm mb-0.5">
                GOR
              </div>
              <span className="text-[8px] font-bold text-slate-700 tracking-wider">
                KASIR POS
              </span>
            </div>
          </div>
        </div>

        {/* Header Greeting */}
        <div className="text-center mb-5 w-full">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-1.5">
            <span>Selamat Datang</span>
            <span className="text-2xl">👋</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Pilih role untuk masuk ke aplikasi
          </p>
        </div>

        {/* Role Selector Tabs (Kasir vs Owner) */}
        <div className="w-full grid grid-cols-2 p-1 bg-slate-100/90 rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => setRole('OWNER')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              role === 'OWNER'
                ? 'bg-white text-[#eb4b2b] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Owner / Pemilik</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('KASIR')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              role === 'KASIR'
                ? 'bg-white text-[#eb4b2b] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Kasir POS</span>
          </button>
        </div>

        {/* Error Alert if any */}
        {errorMsg && (
          <div className="w-full mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-[#eb4b2b] text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="w-full space-y-3.5">
          {/* Username / Email */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 block">
                {role === 'OWNER' ? 'Email / Username Owner' : 'Nama Kasir / No. HP'}
              </label>
              {role === 'KASIR' && registeredStaff.length > 0 && (
                <span className="text-[10px] text-slate-400 font-medium">
                  {registeredStaff.filter((s) => s.status === 'AKTIF').length} staf aktif terdaftar
                </span>
              )}
            </div>

            {role === 'KASIR' && registeredStaff.filter((s) => s.status === 'AKTIF').length > 0 ? (
              <div className="space-y-2">
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder="Ketik nama kasir / no. HP atau pilih di bawah..."
                    className="w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#eb4b2b] focus:bg-white focus:ring-2 focus:ring-[#eb4b2b]/15 transition-all"
                  />
                </div>

                {/* Quick select pills for registered active staff */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {registeredStaff
                    .filter((s) => s.status === 'AKTIF')
                    .map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setUsernameOrEmail(st.name)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                          usernameOrEmail.toLowerCase() === st.name.toLowerCase()
                            ? 'bg-red-50 text-[#eb4b2b] border-[#eb4b2b]'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {st.name} ({st.role})
                      </button>
                    ))}
                </div>
              </div>
            ) : (
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder={role === 'OWNER' ? 'owner@kasirgor.com atau owner' : 'Masukkan nama / ID kasir'}
                  className="w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#eb4b2b] focus:bg-white focus:ring-2 focus:ring-[#eb4b2b]/15 transition-all"
                />
              </div>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#eb4b2b] focus:bg-white focus:ring-2 focus:ring-[#eb4b2b]/15 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#eb4b2b] hover:bg-[#d43a1c] active:scale-[0.99] text-white font-black text-xs tracking-wider uppercase shadow-lg shadow-[#eb4b2b]/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>MEMPROSES...</span>
              ) : (
                <>
                  <span>MASUK SEBAGAI {role}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Demo Login Badges */}
        <div className="w-full mt-5 pt-4 border-t border-slate-100 space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center">
            Akses Cepat 1-Klik (Demo)
          </span>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickLogin('OWNER')}
              className="p-2 rounded-xl bg-orange-50 hover:bg-orange-100/80 border border-orange-200/60 text-[#eb4b2b] text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Wilson (Owner)</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('KASIR', 'Yuli')}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer"
            >
              <Store className="w-3.5 h-3.5" />
              <span>Yuli (Kasir)</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('KASIR', 'Asfia')}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer"
            >
              <Store className="w-3.5 h-3.5" />
              <span>Asfia (Kasir)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
