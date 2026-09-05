import { supabase } from '@/lib/supabase/client';
import { staffMember, ShiftSchedule, ShiftLog } from '@/types/staff';

export interface DbStaff {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
  assigned_shift: string | null;
  assigned_unit: string | null;
  status: string;
  avatar_color: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbShiftSchedule {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  assigned_staff_count: number;
  is_active: boolean;
  created_at: string;
}

export interface DbShiftLog {
  id: string;
  staff_name: string;
  shift_name: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  opening_cash: number;
  closing_cash: number | null;
  total_sales: number;
  total_transactions: number;
  status: string;
  created_at: string;
  updated_at: string;
}

function mapDbToStaff(row: DbStaff): staffMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role as staffMember['role'],
    phone: row.phone || '',
    email: row.email || undefined,
    assignedShift: row.assigned_shift || '',
    assignedUnit: (row.assigned_unit as staffMember['assignedUnit']) || 'Semua Unit',
    status: row.status as staffMember['status'],
    joinDate: new Date(row.created_at).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    avatarColor: row.avatar_color || 'from-gray-500 to-gray-600',
  };
}

function mapDbToShiftSchedule(row: DbShiftSchedule): ShiftSchedule {
  return {
    id: row.id,
    name: row.name,
    startTime: row.start_time,
    endTime: row.end_time,
    assignedStaffCount: row.assigned_staff_count,
    isActive: row.is_active,
  };
}

function mapDbToShiftLog(row: DbShiftLog): ShiftLog {
  return {
    id: row.id,
    staffName: row.staff_name,
    shiftName: row.shift_name,
    date: row.date,
    startTime: row.start_time || '',
    endTime: row.end_time || undefined,
    openingCash: Number(row.opening_cash),
    closingCash: row.closing_cash ? Number(row.closing_cash) : undefined,
    totalSales: Number(row.total_sales),
    totalTransactions: row.total_transactions,
    status: row.status as ShiftLog['status'],
  };
}

export async function ensureDefaultStaffExist(): Promise<void> {
  try {
    const { data } = await supabase.from('staff').select('email, name');
    const emails = (data || []).map((s: any) => (s.email || '').toLowerCase());
    const names = (data || []).map((s: any) => (s.name || '').toLowerCase());

    if (!emails.includes('yulibadminton11@gmail.com') && !names.includes('yuli')) {
      await supabase.from('staff').insert({
        name: 'Yuli',
        role: 'Kasir',
        phone: '0812-1111-2222',
        email: 'yulibadminton11@gmail.com',
        assigned_shift: 'Shift Pagi (08:00 - 17:00)',
        assigned_unit: 'Semua Unit',
        status: 'AKTIF',
        avatar_color: 'from-orange-500 to-red-600',
      });
    }

    if (!emails.includes('asfiapickleball99@gmail.com') && !names.includes('asfia')) {
      await supabase.from('staff').insert({
        name: 'Asfia',
        role: 'Kasir',
        phone: '0813-3333-4444',
        email: 'asfiapickleball99@gmail.com',
        assigned_shift: 'Shift Sore (17:00 - 23:00)',
        assigned_unit: 'Semua Unit',
        status: 'AKTIF',
        avatar_color: 'from-emerald-500 to-teal-600',
      });
    }
  } catch (err) {
    console.warn('Auto-sync default staff to DB:', err);
  }
}

export async function fetchStaff(): Promise<staffMember[]> {
  // Try ensuring Yuli and Asfia exist in DB table non-blockingly
  ensureDefaultStaffExist().catch(() => {});

  const { data, error } = await supabase.from('staff').select('*').order('name');
  if (error) {
    console.warn('fetchStaff db error, using fallback:', error);
    return [];
  }
  return (data as DbStaff[]).map(mapDbToStaff);
}

export async function createStaff(
  staffData: Omit<staffMember, 'id' | 'joinDate'>
): Promise<staffMember> {
  const { data, error } = await supabase
    .from('staff')
    .insert({
      name: staffData.name,
      role: staffData.role,
      phone: staffData.phone || null,
      email: staffData.email || null,
      assigned_shift: staffData.assignedShift || null,
      assigned_unit: staffData.assignedUnit || null,
      status: staffData.status,
      avatar_color: staffData.avatarColor || null,
    })
    .select()
    .single();

  if (error) throw error;
  return mapDbToStaff(data as DbStaff);
}

export async function updateStaff(
  id: string,
  updated: Partial<staffMember>
): Promise<staffMember> {
  const dbFields: Record<string, unknown> = {};
  if (updated.name) dbFields.name = updated.name;
  if (updated.role) dbFields.role = updated.role;
  if (updated.phone !== undefined) dbFields.phone = updated.phone || null;
  if (updated.email !== undefined) dbFields.email = updated.email || null;
  if (updated.assignedShift !== undefined) dbFields.assigned_shift = updated.assignedShift || null;
  if (updated.assignedUnit !== undefined) dbFields.assigned_unit = updated.assignedUnit || null;
  if (updated.status) dbFields.status = updated.status;
  if (updated.avatarColor !== undefined) dbFields.avatar_color = updated.avatarColor || null;

  const { data, error } = await supabase
    .from('staff')
    .update(dbFields)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapDbToStaff(data as DbStaff);
}

export async function deleteStaff(id: string): Promise<void> {
  const { error } = await supabase.from('staff').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchShiftSchedules(): Promise<ShiftSchedule[]> {
  const { data, error } = await supabase
    .from('shift_schedules')
    .select('*')
    .order('start_time');
  if (error) throw error;
  return (data as DbShiftSchedule[]).map(mapDbToShiftSchedule);
}

export async function fetchShiftLogs(): Promise<ShiftLog[]> {
  const { data, error } = await supabase
    .from('shift_logs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as DbShiftLog[]).map(mapDbToShiftLog);
}
