import { supabase } from '@/lib/supabase/client';

export type ActivityActionType =
  | 'LOGIN'
  | 'LOGOUT'
  | 'SHIFT_START'
  | 'SHIFT_END'
  | 'SHIFT_HANDOVER'
  | 'CREATE_BOOKING'
  | 'EDIT_BOOKING'
  | 'SETTLE_BOOKING'
  | 'CANCEL_BOOKING'
  | 'CREATE_TRANSACTION'
  | 'VOID_TRANSACTION'
  | 'CREATE_PRODUCT'
  | 'EDIT_PRODUCT'
  | 'DELETE_PRODUCT'
  | 'MANUAL_EDIT';

export interface ActivityLog {
  id: string;
  timestamp: string; // ISO string
  staffName: string;
  staffEmail?: string;
  role: string; // 'Kasir' | 'Owner'
  actionType: ActivityActionType;
  title: string;
  details: string;
  metadata?: Record<string, any>;
}

export interface CashierPresence {
  staffName: string;
  email: string;
  role: string;
  unit: string;
  shift: string;
  status: 'ONLINE' | 'OFFLINE';
  lastActiveAt: string; // ISO string
  loginAt: string;
  deviceInfo?: string;
}

const ACTIVITY_LOGS_STORAGE_KEY = 'kasir_activity_logs';
const CASHIER_PRESENCE_STORAGE_KEY = 'kasir_cashier_presence';

// Default initial presence for predefined staff
const DEFAULT_PRESENCE_LIST: CashierPresence[] = [
  {
    staffName: 'Yuli',
    email: 'yulibadminton11@gmail.com',
    role: 'Kasir',
    unit: 'Semua Unit (POS & Lapangan)',
    shift: 'Shift Pagi (08:00 - 17:00)',
    status: 'ONLINE',
    lastActiveAt: new Date().toISOString(),
    loginAt: new Date(Date.now() - 3600000).toISOString(),
    deviceInfo: 'Desktop POS Terminal 1',
  },
  {
    staffName: 'Asfia',
    email: 'asfiapickleball99@gmail.com',
    role: 'Kasir',
    unit: 'Semua Unit (POS & Lapangan)',
    shift: 'Shift Sore (17:00 - 23:00)',
    status: 'OFFLINE',
    lastActiveAt: new Date(Date.now() - 86400000).toISOString(),
    loginAt: new Date(Date.now() - 86400000).toISOString(),
    deviceInfo: 'POS Lapangan 2',
  },
];

// Initial seed activity logs if empty
const SEED_ACTIVITY_LOGS: ActivityLog[] = [
  {
    id: 'log-seed-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    staffName: 'Yuli',
    staffEmail: 'yulibadminton11@gmail.com',
    role: 'Kasir',
    actionType: 'LOGIN',
    title: 'Kasir Berhasil Login',
    details: 'Kasir Yuli (yulibadminton11@gmail.com) login dan mengaktifkan sesi POS Toko & F&B.',
  },
  {
    id: 'log-seed-2',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    staffName: 'Yuli',
    staffEmail: 'yulibadminton11@gmail.com',
    role: 'Kasir',
    actionType: 'SHIFT_START',
    title: 'Mulai Sesi Shift Pagi',
    details: 'Membuka shift pagi dengan modal kas awal Rp 500.000 pada unit Kasir Toko & F&B.',
  },
  {
    id: 'log-seed-3',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    staffName: 'Yuli',
    staffEmail: 'yulibadminton11@gmail.com',
    role: 'Kasir',
    actionType: 'CREATE_BOOKING',
    title: 'Booking Lapangan Baru',
    details: 'Menambahkan DP sewa Lapangan Badminton 1 untuk Bpk. Hendra (Rp 80.000 via QRIS).',
  },
];

/**
 * Record an activity / audit log to Supabase and fallback to localStorage
 */
export async function recordActivityLog(
  entry: Omit<ActivityLog, 'id' | 'timestamp'> & { timestamp?: string }
): Promise<ActivityLog> {
  const newLog: ActivityLog = {
    id: 'act-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    timestamp: entry.timestamp || new Date().toISOString(),
    staffName: entry.staffName || 'Kasir',
    staffEmail: entry.staffEmail || '',
    role: entry.role || 'Kasir',
    actionType: entry.actionType,
    title: entry.title,
    details: entry.details,
    metadata: entry.metadata || {},
  };

  // 1. Try writing to Supabase table `activity_logs` (non-blocking)
  try {
    Promise.resolve(
      supabase
        .from('activity_logs')
        .insert({
          id: newLog.id,
          created_at: newLog.timestamp,
          staff_name: newLog.staffName,
          staff_email: newLog.staffEmail || null,
          role: newLog.role,
          action_type: newLog.actionType,
          title: newLog.title,
          details: newLog.details,
          metadata: newLog.metadata,
        })
    ).catch(() => {});
  } catch {}

  // 2. Persist to localStorage for guaranteed immediate persistence and tab-sync
  if (typeof window !== 'undefined') {
    try {
      const existingStr = localStorage.getItem(ACTIVITY_LOGS_STORAGE_KEY);
      const existing: ActivityLog[] = existingStr ? JSON.parse(existingStr) : SEED_ACTIVITY_LOGS;
      const updated = [newLog, ...existing].slice(0, 500); // retain last 500 logs
      localStorage.setItem(ACTIVITY_LOGS_STORAGE_KEY, JSON.stringify(updated));

      // Dispatch custom event for real-time reactivity in current tab
      window.dispatchEvent(
        new CustomEvent('kasir_activity_logged', { detail: newLog })
      );
    } catch (e) {
      console.error('Failed to store activity log locally:', e);
    }
  }

  return newLog;
}

/**
 * Fetch all activity logs (combining Supabase + LocalStorage fallback)
 */
export async function fetchActivityLogs(): Promise<ActivityLog[]> {
  let dbLogs: ActivityLog[] = [];

  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (!error && data && data.length > 0) {
      dbLogs = data.map((d: any) => ({
        id: d.id || `db-${d.created_at}`,
        timestamp: d.created_at,
        staffName: d.staff_name,
        staffEmail: d.staff_email || undefined,
        role: d.role,
        actionType: d.action_type as ActivityActionType,
        title: d.title,
        details: d.details,
        metadata: d.metadata || undefined,
      }));
    }
  } catch {}

  // Read local storage logs
  let localLogs: ActivityLog[] = [];
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(ACTIVITY_LOGS_STORAGE_KEY);
      if (saved) {
        localLogs = JSON.parse(saved);
      } else {
        localLogs = SEED_ACTIVITY_LOGS;
        localStorage.setItem(ACTIVITY_LOGS_STORAGE_KEY, JSON.stringify(SEED_ACTIVITY_LOGS));
      }
    } catch {}
  }

  // Merge uniquely by ID
  const map = new Map<string, ActivityLog>();
  [...dbLogs, ...localLogs].forEach((item) => {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  });

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return merged;
}

/**
 * Update cashier online presence and heartbeat
 */
export async function updateCashierPresence(presence: Partial<CashierPresence> & { staffName: string }): Promise<void> {
  const nowStr = new Date().toISOString();

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(CASHIER_PRESENCE_STORAGE_KEY);
      let list: CashierPresence[] = saved ? JSON.parse(saved) : [...DEFAULT_PRESENCE_LIST];

      const idx = list.findIndex(
        (p) => p.staffName.toLowerCase() === presence.staffName.toLowerCase()
      );

      const updatedRecord: CashierPresence = {
        staffName: presence.staffName,
        email: presence.email || (idx >= 0 ? list[idx].email : ''),
        role: presence.role || (idx >= 0 ? list[idx].role : 'Kasir'),
        unit: presence.unit || (idx >= 0 ? list[idx].unit : 'Kasir Toko & F&B'),
        shift: presence.shift || (idx >= 0 ? list[idx].shift : 'Shift Pagi (08:00 - 17:00)'),
        status: presence.status || 'ONLINE',
        lastActiveAt: presence.lastActiveAt || nowStr,
        loginAt: presence.loginAt || (idx >= 0 ? list[idx].loginAt : nowStr),
        deviceInfo: presence.deviceInfo || (idx >= 0 ? list[idx].deviceInfo : 'Web Browser'),
      };

      if (idx >= 0) {
        list[idx] = updatedRecord;
      } else {
        list.push(updatedRecord);
      }

      localStorage.setItem(CASHIER_PRESENCE_STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('kasir_presence_updated', { detail: updatedRecord }));
    } catch (err) {
      console.error('Error updating presence locally:', err);
    }
  }

  // Try updating in Supabase (if table exists)
  try {
    Promise.resolve(
      supabase
        .from('cashier_presence')
        .upsert({
          staff_name: presence.staffName,
          email: presence.email || null,
          role: presence.role || 'Kasir',
          unit: presence.unit || null,
          shift: presence.shift || null,
          status: presence.status || 'ONLINE',
          last_active_at: nowStr,
        })
    ).catch(() => {});
  } catch {}
}

/**
 * Fetch online presence list for all cashiers
 */
export async function fetchCashierPresence(): Promise<CashierPresence[]> {
  let localList: CashierPresence[] = [...DEFAULT_PRESENCE_LIST];

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(CASHIER_PRESENCE_STORAGE_KEY);
      if (saved) {
        localList = JSON.parse(saved);
      } else {
        localStorage.setItem(CASHIER_PRESENCE_STORAGE_KEY, JSON.stringify(DEFAULT_PRESENCE_LIST));
      }
    } catch {}
  }

  // Ensure both Yuli and Asfia exist in the list
  const hasYuli = localList.some((p) => p.staffName.toLowerCase() === 'yuli');
  if (!hasYuli) {
    localList.push(DEFAULT_PRESENCE_LIST[0]);
  }
  const hasAsfia = localList.some((p) => p.staffName.toLowerCase() === 'asfia');
  if (!hasAsfia) {
    localList.push(DEFAULT_PRESENCE_LIST[1]);
  }

  // Evaluate actual active status based on heartbeat (< 10 minutes)
  const nowTime = Date.now();
  return localList.map((p) => {
    const lastActiveTime = new Date(p.lastActiveAt).getTime();
    const diffMinutes = (nowTime - lastActiveTime) / (1000 * 60);

    // If marked ONLINE but no heartbeat for > 15 minutes, mark as idle/offline
    const isRecentlyActive = diffMinutes < 15;
    const effectiveStatus: 'ONLINE' | 'OFFLINE' =
      p.status === 'ONLINE' && isRecentlyActive ? 'ONLINE' : p.status === 'ONLINE' && diffMinutes < 30 ? 'ONLINE' : 'OFFLINE';

    return {
      ...p,
      status: effectiveStatus,
    };
  });
}
