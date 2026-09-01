export type StaffRole = 'Kasir' | 'Owner';
export type StaffStatus = 'AKTIF' | 'CUTI' | 'NONAKTIF';

export interface staffMember {
  id: string;
  name: string;
  role: StaffRole;
  phone: string;
  email?: string;
  assignedShift: string;
  assignedUnit: 'Kasir Toko & F&B' | 'Booking Lapangan' | 'Semua Unit';
  status: StaffStatus;
  joinDate: string;
  avatarColor?: string;
}

export interface ShiftSchedule {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  assignedStaffCount: number;
  isActive: boolean;
}

export interface ShiftLog {
  id: string;
  staffName: string;
  shiftName: string;
  date: string;
  startTime: string;
  endTime?: string;
  openingCash: number;
  closingCash?: number;
  totalSales: number;
  totalTransactions: number;
  status: 'BERJALAN' | 'SELESAI';
}
