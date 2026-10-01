import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { OpenMabarTransaction } from '@/types/academy';

const LOCAL_STORAGE_KEY = 'kasirgor_open_mabar_transactions';

interface DbOpenMabarTransaction {
  id: string;
  receipt_number: string;
  sport_type: 'BADMINTON' | 'PICKLEBALL';
  date: string;
  nominal_cash: number;
  nominal_qris: number;
  total_amount: number;
  cashier_name: string;
  shift: string | null;
  notes: string | null;
  created_at: string;
}

function mapDbToDomain(row: DbOpenMabarTransaction): OpenMabarTransaction {
  return {
    id: row.id,
    receiptNumber: row.receipt_number,
    sportType: row.sport_type,
    date: row.date,
    nominalCash: Number(row.nominal_cash) || 0,
    nominalQris: Number(row.nominal_qris) || 0,
    totalAmount: Number(row.total_amount) || 0,
    cashierName: row.cashier_name,
    shift: row.shift || '',
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

function getLocalTransactions(): OpenMabarTransaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalTransactions(items: OpenMabarTransaction[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save to local storage', err);
  }
}

export async function fetchOpenMabarTransactions(): Promise<OpenMabarTransaction[]> {
  if (!isSupabaseConfigured()) {
    return getLocalTransactions();
  }

  try {
    const { data, error } = await supabase
      .from('open_mabar_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetchOpenMabarTransactions failed, fallback to local:', error.message);
      return getLocalTransactions();
    }

    const mapped = (data as DbOpenMabarTransaction[]).map(mapDbToDomain);
    saveLocalTransactions(mapped);
    return mapped;
  } catch (err) {
    console.warn('Network error fetching open mabar transactions, fallback to local', err);
    return getLocalTransactions();
  }
}

export async function createOpenMabarTransaction(
  payload: Omit<OpenMabarTransaction, 'id' | 'createdAt' | 'receiptNumber'>
): Promise<OpenMabarTransaction> {
  const timestamp = Date.now();
  const dateStr = (payload.date || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const receiptNumber = `MBR-${dateStr}-${randomSuffix}`;
  const now = new Date().toISOString();
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `mbr_${timestamp}`;

  const newItem: OpenMabarTransaction = {
    ...payload,
    id,
    receiptNumber,
    createdAt: now,
  };

  // Optimistically save locally
  const current = getLocalTransactions();
  saveLocalTransactions([newItem, ...current]);

  if (!isSupabaseConfigured()) {
    return newItem;
  }

  try {
    const dbPayload: Partial<DbOpenMabarTransaction> = {
      id: newItem.id,
      receipt_number: newItem.receiptNumber,
      sport_type: newItem.sportType,
      date: newItem.date,
      nominal_cash: newItem.nominalCash,
      nominal_qris: newItem.nominalQris,
      total_amount: newItem.totalAmount,
      cashier_name: newItem.cashierName,
      shift: newItem.shift || null,
      notes: newItem.notes || null,
      created_at: newItem.createdAt,
    };

    const { data, error } = await supabase
      .from('open_mabar_transactions')
      .insert([dbPayload])
      .select()
      .single();

    if (error) {
      console.warn('Failed to insert into Supabase open_mabar_transactions (cached locally):', error.message);
      return newItem;
    }

    return mapDbToDomain(data as DbOpenMabarTransaction);
  } catch (err) {
    console.warn('Network error inserting open mabar transaction (cached locally):', err);
    return newItem;
  }
}

export async function deleteOpenMabarTransaction(id: string): Promise<void> {
  const current = getLocalTransactions();
  saveLocalTransactions(current.filter((item) => item.id !== id));

  if (!isSupabaseConfigured()) return;

  try {
    const { error } = await supabase
      .from('open_mabar_transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('Failed to delete open mabar transaction in Supabase:', error.message);
    }
  } catch (err) {
    console.warn('Error deleting open mabar transaction:', err);
  }
}
