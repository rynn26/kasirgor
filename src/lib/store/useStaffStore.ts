import { create } from 'zustand';
import { staffMember, ShiftSchedule } from '@/types/staff';
import { fetchStaff, createStaff, updateStaff, deleteStaff, fetchShiftSchedules, fetchShiftLogs } from '@/lib/db/staff';

interface StaffState {
  staffList: staffMember[];
  shiftSchedules: ShiftSchedule[];
  shiftLogs: import('@/types/staff').ShiftLog[];
  isLoading: boolean;
  error: string | null;

  loadStaff: () => Promise<void>;
  loadShiftSchedules: () => Promise<void>;
  loadShiftLogs: () => Promise<void>;
  addStaff: (staff: Omit<staffMember, 'id' | 'joinDate'>) => Promise<void>;
  updateStaff: (id: string, updated: Partial<staffMember>) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;
  toggleStaffStatus: (id: string) => Promise<void>;
  addShiftSchedule: (schedule: Omit<ShiftSchedule, 'id'>) => Promise<void>;
  deleteShiftSchedule: (id: string) => Promise<void>;
}

export const useStaffStore = create<StaffState>((set, get) => ({
  staffList: [],
  shiftSchedules: [],
  shiftLogs: [],
  isLoading: false,
  error: null,

  loadStaff: async () => {
    set({ isLoading: true, error: null });
    try {
      const staffList = await fetchStaff();
      set({ staffList, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal memuat staff', isLoading: false });
    }
  },

  loadShiftSchedules: async () => {
    try {
      const shiftSchedules = await fetchShiftSchedules();
      set({ shiftSchedules });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal memuat jadwal shift' });
    }
  },

  loadShiftLogs: async () => {
    try {
      const shiftLogs = await fetchShiftLogs();
      set({ shiftLogs });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal memuat log shift' });
    }
  },

  addStaff: async (newStaff) => {
    set({ isLoading: true, error: null });
    try {
      const colors = [
        'from-orange-500 to-red-600',
        'from-pink-500 to-rose-600',
        'from-emerald-500 to-teal-600',
        'from-blue-500 to-indigo-600',
        'from-purple-500 to-violet-600',
      ];
      const avatarColor = colors[Math.floor(Math.random() * colors.length)];
      const created = await createStaff({ ...newStaff, avatarColor });
      set((state) => ({
        staffList: [...state.staffList, created],
        isLoading: false,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal menambah staff', isLoading: false });
      throw err;
    }
  },

  updateStaff: async (id, updated) => {
    set({ isLoading: true, error: null });
    try {
      const result = await updateStaff(id, updated);
      set((state) => ({
        staffList: state.staffList.map((s) => (s.id === id ? result : s)),
        isLoading: false,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal update staff', isLoading: false });
      throw err;
    }
  },

  deleteStaff: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await deleteStaff(id);
      set((state) => ({
        staffList: state.staffList.filter((s) => s.id !== id),
        isLoading: false,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal hapus staff', isLoading: false });
      throw err;
    }
  },

  toggleStaffStatus: async (id) => {
    const staff = get().staffList.find((s) => s.id === id);
    if (!staff) return;
    const nextStatus = staff.status === 'AKTIF' ? 'CUTI' : staff.status === 'CUTI' ? 'NONAKTIF' : 'AKTIF';
    try {
      await updateStaff(id, { status: nextStatus });
      set((state) => ({
        staffList: state.staffList.map((s) =>
          s.id === id ? { ...s, status: nextStatus } : s
        ),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal update status staff' });
    }
  },

  addShiftSchedule: async (schedule) => {
    set({ isLoading: true });
    try {
      const { data, error } = await import('@/lib/supabase/client').then(m =>
        m.supabase
          .from('shift_schedules')
          .insert({
            name: schedule.name,
            start_time: schedule.startTime,
            end_time: schedule.endTime,
            assigned_staff_count: schedule.assignedStaffCount || 0,
            is_active: schedule.isActive ?? true,
          })
          .select()
          .single()
      );
      if (error) throw error;
      const newSchedule: import('@/types/staff').ShiftSchedule = {
        id: data.id,
        name: data.name,
        startTime: data.start_time,
        endTime: data.end_time,
        assignedStaffCount: data.assigned_staff_count,
        isActive: data.is_active,
      };
      set((state) => ({
        shiftSchedules: [...state.shiftSchedules, newSchedule],
        isLoading: false,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal menambah shift', isLoading: false });
      throw err;
    }
  },

  deleteShiftSchedule: async (id) => {
    try {
      const { error } = await import('@/lib/supabase/client').then(m =>
        m.supabase.from('shift_schedules').delete().eq('id', id)
      );
      if (error) throw error;
      set((state) => ({
        shiftSchedules: state.shiftSchedules.filter((s) => s.id !== id),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal menghapus shift' });
      throw err;
    }
  },
}));
