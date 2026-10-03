import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { AcademyTransaction, AcademyPaymentMethod } from '@/types/academy';
import { formatRupiah } from '@/lib/utils';
import { recordActivityLog } from '@/lib/db/activityLogs';

const LOCAL_STORAGE_KEY = 'kasirgor_academy_transactions';

interface DbAcademyTransaction {
  id: string;
  receipt_number: string;
  customer_name: string;
  program: 'BADMINTON' | 'PICKLEBALL';
  category: 'ANAK' | 'DEWASA' | null;
  package: '4X' | '5X' | null;
  training_month: string | null;
  session_time: 'PAGI_SIANG' | 'SORE_MALAM' | null;
  period_start: string | null;
  period_end: string | null;
  fee_amount: number;
  dp_amount: number;
  remaining_amount: number;
  payment_method: 'QRIS' | 'CASH';
  status: 'LUNAS' | 'DP_PAID';
  cashier_name: string;
  shift: string | null;
  notes: string | null;
  created_at: string;
  settled_at: string | null;
  settlement_amount: number | null;
  settlement_payment_method: 'QRIS' | 'CASH' | null;
  settlement_cashier_name: string | null;
}

function mapDbToDomain(row: DbAcademyTransaction): AcademyTransaction {
  return {
    id: row.id,
    receiptNumber: row.receipt_number,
    customerName: row.customer_name,
    program: row.program,
    category: row.category || undefined,
    package: row.package || undefined,
    trainingMonth: row.training_month || undefined,
    sessionTime: row.session_time || undefined,
    periodStart: row.period_start || undefined,
    periodEnd: row.period_end || undefined,
    feeAmount: Number(row.fee_amount) || 0,
    dpAmount: Number(row.dp_amount) || 0,
    remainingAmount: Number(row.remaining_amount) || 0,
    paymentMethod: row.payment_method,
    status: row.status,
    cashierName: row.cashier_name,
    shift: row.shift || '',
    notes: row.notes || undefined,
    createdAt: row.created_at,
    settledAt: row.settled_at || undefined,
    settlementAmount: Number(row.settlement_amount) || 0,
    settlementPaymentMethod: row.settlement_payment_method || undefined,
    settlementCashierName: row.settlement_cashier_name || undefined,
  };
}

function getLocalTransactions(): AcademyTransaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalTransactions(items: AcademyTransaction[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save to local storage', err);
  }
}

export async function fetchAcademyTransactions(): Promise<AcademyTransaction[]> {
  if (!isSupabaseConfigured()) {
    return getLocalTransactions();
  }

  try {
    const { data, error } = await supabase
      .from('academy_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetchAcademyTransactions failed, fallback to local:', error.message);
      return getLocalTransactions();
    }

    const mapped = (data as DbAcademyTransaction[]).map(mapDbToDomain);
    saveLocalTransactions(mapped);
    return mapped;
  } catch (err) {
    console.warn('Network error fetching academy transactions, fallback to local', err);
    return getLocalTransactions();
  }
}

export async function createAcademyTransaction(
  payload: Omit<AcademyTransaction, 'id' | 'createdAt' | 'receiptNumber'> & { createdAt?: string }
): Promise<AcademyTransaction> {
  const timestamp = Date.now();
  const now = payload.createdAt || new Date().toISOString();
  const dateStr = now.slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const receiptNumber = `ACAD-${dateStr}-${randomSuffix}`;
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `acad_${timestamp}`;

  const newItem: AcademyTransaction = {
    ...payload,
    id,
    receiptNumber,
    createdAt: now,
  };

  // Optimistically save locally
  const current = getLocalTransactions();
  saveLocalTransactions([newItem, ...current]);

  // Trigger activity log & owner notification
  try {
    const isLunas = newItem.status === 'LUNAS' || newItem.remainingAmount === 0;
    const paidAmt = isLunas ? newItem.feeAmount : newItem.dpAmount;
    recordActivityLog({
      staffName: newItem.cashierName || 'Kasir',
      role: 'Kasir',
      actionType: 'CREATE_ACADEMY',
      title: `Pendaftaran Sinyo Academy (${newItem.program})`,
      details: `${newItem.customerName} mendaftar program ${newItem.program}. Tarif: ${formatRupiah(newItem.feeAmount)}, Bayar ${isLunas ? 'Lunas' : 'DP'}: ${formatRupiah(paidAmt)} (${newItem.paymentMethod}). Dicatat oleh ${newItem.cashierName || 'Kasir'}.`,
      metadata: {
        transactionId: newItem.id,
        receiptNumber: newItem.receiptNumber,
        customerName: newItem.customerName,
        program: newItem.program,
        feeAmount: newItem.feeAmount,
        dpAmount: newItem.dpAmount,
        remainingAmount: newItem.remainingAmount,
        paymentMethod: newItem.paymentMethod,
        status: newItem.status,
      },
    }).catch(console.error);
  } catch (err) {
    console.warn('Failed to record activity log for createAcademyTransaction:', err);
  }

  if (!isSupabaseConfigured()) {
    return newItem;
  }

  try {
    const dbPayload: Partial<DbAcademyTransaction> = {
      id: newItem.id,
      receipt_number: newItem.receiptNumber,
      customer_name: newItem.customerName,
      program: newItem.program,
      category: newItem.category || null,
      package: newItem.package || null,
      training_month: newItem.trainingMonth || null,
      session_time: newItem.sessionTime || null,
      period_start: newItem.periodStart || null,
      period_end: newItem.periodEnd || null,
      fee_amount: newItem.feeAmount,
      dp_amount: newItem.dpAmount,
      remaining_amount: newItem.remainingAmount,
      payment_method: newItem.paymentMethod,
      status: newItem.status,
      cashier_name: newItem.cashierName,
      shift: newItem.shift || null,
      notes: newItem.notes || null,
      created_at: newItem.createdAt,
      settled_at: newItem.settledAt || null,
      settlement_amount: newItem.settlementAmount || 0,
      settlement_payment_method: newItem.settlementPaymentMethod || null,
      settlement_cashier_name: newItem.settlementCashierName || null,
    };

    const { data, error } = await supabase
      .from('academy_transactions')
      .insert([dbPayload])
      .select()
      .single();

    if (error) {
      console.warn('Failed to insert into Supabase academy_transactions (cached locally):', error.message);
      return newItem;
    }

    return mapDbToDomain(data as DbAcademyTransaction);
  } catch (err) {
    console.warn('Network error inserting academy transaction (cached locally):', err);
    return newItem;
  }
}

export async function settleAcademyTransaction(
  id: string,
  payload: {
    settlementAmount: number;
    paymentMethod: AcademyPaymentMethod;
    cashierName: string;
    settledAt?: string;
  }
): Promise<AcademyTransaction> {
  const settledAt = payload.settledAt || new Date().toISOString();
  const current = getLocalTransactions();
  let updatedItem: AcademyTransaction | null = null;

  const updatedList = current.map((item) => {
    if (item.id === id) {
      updatedItem = {
        ...item,
        status: 'LUNAS',
        remainingAmount: 0,
        settledAt,
        settlementAmount: payload.settlementAmount,
        settlementPaymentMethod: payload.paymentMethod,
        settlementCashierName: payload.cashierName,
      };
      return updatedItem;
    }
    return item;
  });

  saveLocalTransactions(updatedList);

  if (updatedItem) {
    const item = updatedItem as AcademyTransaction;
    try {
      recordActivityLog({
        staffName: payload.cashierName || 'Kasir',
        role: 'Kasir',
        actionType: 'SETTLE_ACADEMY',
        title: `Pelunasan Sinyo Academy (${item.program})`,
        details: `${item.customerName} melunasi sisa tagihan ${item.program} sebesar ${formatRupiah(payload.settlementAmount)} (${payload.paymentMethod}). Dicatat oleh ${payload.cashierName || 'Kasir'}.`,
        metadata: {
          transactionId: item.id,
          receiptNumber: item.receiptNumber,
          customerName: item.customerName,
          program: item.program,
          settlementAmount: payload.settlementAmount,
          settlementPaymentMethod: payload.paymentMethod,
        },
      }).catch(console.error);
    } catch (err) {
      console.warn('Failed to record activity log for settleAcademyTransaction:', err);
    }
  }

  if (!isSupabaseConfigured() || !updatedItem) {
    if (!updatedItem) throw new Error('Transaction not found');
    return updatedItem;
  }

  try {
    const updatePayload: Partial<DbAcademyTransaction> = {
      status: 'LUNAS',
      remaining_amount: 0,
      settled_at: settledAt,
      settlement_amount: payload.settlementAmount,
      settlement_payment_method: payload.paymentMethod,
      settlement_cashier_name: payload.cashierName,
    };

    const { data, error } = await supabase
      .from('academy_transactions')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.warn('Failed to update Supabase settlement (cached locally):', error.message);
      return updatedItem;
    }

    return mapDbToDomain(data as DbAcademyTransaction);
  } catch (err) {
    console.warn('Network error settling academy transaction (cached locally):', err);
    return updatedItem!;
  }
}

export async function updateAcademyTransaction(
  id: string,
  payload: Partial<AcademyTransaction>
): Promise<AcademyTransaction> {
  const current = getLocalTransactions();
  let updatedItem: AcademyTransaction | null = null;

  const updatedList = current.map((item) => {
    if (item.id === id) {
      updatedItem = {
        ...item,
        ...payload,
      };
      return updatedItem;
    }
    return item;
  });

  saveLocalTransactions(updatedList);

  if (updatedItem) {
    const item = updatedItem as AcademyTransaction;
    try {
      recordActivityLog({
        staffName: payload.cashierName || item.cashierName || 'Kasir',
        role: 'Kasir',
        actionType: 'EDIT_ACADEMY',
        title: `Edit Data Sinyo Academy (${item.program})`,
        details: `Perubahan data peserta ${item.customerName} (${item.program}). Tarif: ${formatRupiah(item.feeAmount)}, Status: ${item.status}.`,
        metadata: {
          transactionId: item.id,
          receiptNumber: item.receiptNumber,
          customerName: item.customerName,
          program: item.program,
        },
      }).catch(console.error);
    } catch (err) {
      console.warn('Failed to record activity log for updateAcademyTransaction:', err);
    }
  }

  if (!isSupabaseConfigured() || !updatedItem) {
    if (!updatedItem) throw new Error('Transaction not found');
    return updatedItem;
  }

  try {
    const dbPayload: Partial<DbAcademyTransaction> = {};
    if (payload.customerName !== undefined) dbPayload.customer_name = payload.customerName;
    if (payload.program !== undefined) dbPayload.program = payload.program;
    if (payload.category !== undefined) dbPayload.category = payload.category || null;
    if (payload.package !== undefined) dbPayload.package = payload.package || null;
    if (payload.trainingMonth !== undefined) dbPayload.training_month = payload.trainingMonth || null;
    if (payload.sessionTime !== undefined) dbPayload.session_time = payload.sessionTime || null;
    if (payload.periodStart !== undefined) dbPayload.period_start = payload.periodStart || null;
    if (payload.periodEnd !== undefined) dbPayload.period_end = payload.periodEnd || null;
    if (payload.feeAmount !== undefined) dbPayload.fee_amount = payload.feeAmount;
    if (payload.dpAmount !== undefined) dbPayload.dp_amount = payload.dpAmount;
    if (payload.remainingAmount !== undefined) dbPayload.remaining_amount = payload.remainingAmount;
    if (payload.paymentMethod !== undefined) dbPayload.payment_method = payload.paymentMethod;
    if (payload.status !== undefined) dbPayload.status = payload.status;
    if (payload.cashierName !== undefined) dbPayload.cashier_name = payload.cashierName;
    if (payload.shift !== undefined) dbPayload.shift = payload.shift || null;
    if (payload.notes !== undefined) dbPayload.notes = payload.notes || null;
    if (payload.createdAt !== undefined) dbPayload.created_at = payload.createdAt;
    if (payload.settledAt !== undefined) dbPayload.settled_at = payload.settledAt || null;
    if (payload.settlementAmount !== undefined) dbPayload.settlement_amount = payload.settlementAmount || 0;
    if (payload.settlementPaymentMethod !== undefined) dbPayload.settlement_payment_method = payload.settlementPaymentMethod || null;
    if (payload.settlementCashierName !== undefined) dbPayload.settlement_cashier_name = payload.settlementCashierName || null;

    const { data, error } = await supabase
      .from('academy_transactions')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.warn('Failed to update Supabase academy transaction (cached locally):', error.message);
      return updatedItem;
    }

    return mapDbToDomain(data as DbAcademyTransaction);
  } catch (err) {
    console.warn('Network error updating academy transaction (cached locally):', err);
    return updatedItem!;
  }
}

export async function deleteAcademyTransaction(id: string): Promise<void> {
  const current = getLocalTransactions();
  const deletedItem = current.find((item) => item.id === id);
  saveLocalTransactions(current.filter((item) => item.id !== id));

  if (deletedItem) {
    try {
      recordActivityLog({
        staffName: deletedItem.cashierName || 'Kasir',
        role: 'Kasir',
        actionType: 'DELETE_ACADEMY',
        title: `Hapus Data Sinyo Academy (${deletedItem.program})`,
        details: `Penghapusan data peserta ${deletedItem.customerName} (${deletedItem.receiptNumber}) - Total: ${formatRupiah(deletedItem.feeAmount)}.`,
        metadata: {
          transactionId: deletedItem.id,
          receiptNumber: deletedItem.receiptNumber,
          customerName: deletedItem.customerName,
          program: deletedItem.program,
        },
      }).catch(console.error);
    } catch (err) {
      console.warn('Failed to record activity log for deleteAcademyTransaction:', err);
    }
  }

  if (!isSupabaseConfigured()) return;

  try {
    const { error } = await supabase
      .from('academy_transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('Failed to delete academy transaction in Supabase:', error.message);
    }
  } catch (err) {
    console.warn('Error deleting academy transaction:', err);
  }
}
