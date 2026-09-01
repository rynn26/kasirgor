import { supabase } from '@/lib/supabase/client';
import { Transaction, CartItem, PaymentMethod } from '@/types/pos';

export interface DbTransaction {
  id: string;
  invoice_number: string;
  cashier_name: string;
  customer_name: string | null;
  table_or_court_number: string | null;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  service_total: number;
  grand_total: number;
  payment_method: string;
  amount_paid: number;
  change_amount: number;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface DbTransactionItem {
  id: string;
  transaction_id: string;
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  category: string | null;
  price: number;
  quantity: number;
  discount_per_item: number | null;
  note: string | null;
  created_at: string;
}

function mapDbItemToCartItem(item: DbTransactionItem): CartItem {
  return {
    product: {
      id: item.product_id || '',
      sku: item.product_sku || '',
      name: item.product_name,
      category: (item.category || 'Makanan') as never,
      price: Number(item.price),
      stock: 0,
      unit: '',
      isAvailable: true,
    },
    quantity: item.quantity,
    discountPerItem: item.discount_per_item || 0,
    note: item.note || undefined,
  };
}

function mapDbToTransaction(
  tx: DbTransaction,
  items: CartItem[]
): Transaction {
  return {
    id: tx.id,
    invoiceNumber: tx.invoice_number,
    cashierName: tx.cashier_name,
    customerName: tx.customer_name || undefined,
    tableOrCourtNumber: tx.table_or_court_number || undefined,
    items,
    subtotal: Number(tx.subtotal),
    discountTotal: Number(tx.discount_total),
    taxTotal: Number(tx.tax_total),
    serviceTotal: Number(tx.service_total),
    grandTotal: Number(tx.grand_total),
    paymentMethod: tx.payment_method as PaymentMethod,
    amountPaid: Number(tx.amount_paid),
    change: Number(tx.change_amount),
    status: tx.status as 'COMPLETED' | 'CANCELLED',
    notes: tx.notes || undefined,
    createdAt: tx.created_at,
  };
}

export async function fetchTransactions(
  limit = 100
): Promise<Transaction[]> {
  const { data: txs, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  const transactions: Transaction[] = [];

  for (const tx of txs as DbTransaction[]) {
    const { data: items, error: itemsError } = await supabase
      .from('transaction_items')
      .select('*')
      .eq('transaction_id', tx.id);

    if (itemsError) throw itemsError;

    const cartItems = (items as DbTransactionItem[]).map(mapDbItemToCartItem);
    transactions.push(mapDbToTransaction(tx, cartItems));
  }

  return transactions;
}

export async function fetchTransactionById(
  id: string
): Promise<Transaction | null> {
  const { data: tx, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const { data: items, error: itemsError } = await supabase
    .from('transaction_items')
    .select('*')
    .eq('transaction_id', id);

  if (itemsError) throw itemsError;

  return mapDbToTransaction(tx as DbTransaction, (items as DbTransactionItem[]).map(mapDbItemToCartItem));
}

export async function createTransaction(
  transaction: Omit<Transaction, 'id'>
): Promise<Transaction> {
  const txId = crypto.randomUUID();

  const { error: txError } = await supabase.from('transactions').insert({
    id: txId,
    invoice_number: transaction.invoiceNumber,
    cashier_name: transaction.cashierName,
    customer_name: transaction.customerName || null,
    table_or_court_number: transaction.tableOrCourtNumber || null,
    subtotal: transaction.subtotal,
    discount_total: transaction.discountTotal,
    tax_total: transaction.taxTotal,
    service_total: transaction.serviceTotal,
    grand_total: transaction.grandTotal,
    payment_method: transaction.paymentMethod,
    amount_paid: transaction.amountPaid,
    change_amount: transaction.change,
    status: transaction.status,
    notes: transaction.notes || null,
  });

  if (txError) throw txError;

  const itemsToInsert = transaction.items.map((item, idx) => ({
    id: crypto.randomUUID(),
    transaction_id: txId,
    product_id: item.product.id || null,
    product_name: item.product.name,
    product_sku: item.product.sku || null,
    category: item.product.category || null,
    price: item.product.price,
    quantity: item.quantity,
    discount_per_item: item.discountPerItem || 0,
    note: item.note || null,
  }));

  const { error: itemsError } = await supabase
    .from('transaction_items')
    .insert(itemsToInsert);

  if (itemsError) throw itemsError;

  return {
    id: txId,
    ...transaction,
  };
}

export async function fetchTransactionsByDate(
  date: string
): Promise<Transaction[]> {
  const start = `${date}T00:00:00.000Z`;
  const end = `${date}T23:59:59.999Z`;

  const { data: txs, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const transactions: Transaction[] = [];

  for (const tx of txs as DbTransaction[]) {
    const { data: items } = await supabase
      .from('transaction_items')
      .select('*')
      .eq('transaction_id', tx.id);

    const cartItems = (items as DbTransactionItem[] || []).map(mapDbItemToCartItem);
    transactions.push(mapDbToTransaction(tx, cartItems));
  }

  return transactions;
}

export async function cancelTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update({ status: 'CANCELLED' })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteTransaction(id: string): Promise<void> {
  // transaction_items has ON DELETE CASCADE, but delete explicitly just in case
  await supabase
    .from('transaction_items')
    .delete()
    .eq('transaction_id', id);

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function updateTransaction(
  id: string,
  data: {
    items: CartItem[];
    paymentMethod?: PaymentMethod;
    customerName?: string;
    tableOrCourtNumber?: string;
    notes?: string;
    amountPaid?: number;
    status?: 'COMPLETED' | 'CANCELLED';
  }
): Promise<Transaction> {
  // Fetch existing transaction to preserve tax and service totals
  const existingTx = await fetchTransactionById(id);
  if (!existingTx) throw new Error('Transaksi tidak ditemukan');

  const subtotal = data.items.reduce(
    (sum, item) => sum + (item.product.price - (item.discountPerItem || 0)) * item.quantity,
    0
  );
  // Preserve existing tax/service totals and recalculate grandTotal properly
  const taxTotal = existingTx.taxTotal;
  const serviceTotal = existingTx.serviceTotal;
  const discountTotal = existingTx.discountTotal;
  const grandTotal = Math.max(0, subtotal - discountTotal + taxTotal + serviceTotal);
  const amountPaid = data.amountPaid !== undefined ? data.amountPaid : grandTotal;
  const change = Math.max(0, amountPaid - grandTotal);

  const updateFields: Record<string, unknown> = {
    subtotal,
    grand_total: grandTotal,
    amount_paid: amountPaid,
    change_amount: change,
  };

  if (data.paymentMethod) updateFields.payment_method = data.paymentMethod;
  if (data.customerName !== undefined) updateFields.customer_name = data.customerName || null;
  if (data.tableOrCourtNumber !== undefined) updateFields.table_or_court_number = data.tableOrCourtNumber || null;
  if (data.notes !== undefined) updateFields.notes = data.notes || null;
  if (data.status) updateFields.status = data.status;

  const { error: txError } = await supabase
    .from('transactions')
    .update(updateFields)
    .eq('id', id);

  if (txError) throw txError;

  // Replace items
  await supabase
    .from('transaction_items')
    .delete()
    .eq('transaction_id', id);

  const itemsToInsert = data.items.map((item) => ({
    id: crypto.randomUUID(),
    transaction_id: id,
    product_id: item.product.id || null,
    product_name: item.product.name,
    product_sku: item.product.sku || null,
    category: item.product.category || null,
    price: item.product.price,
    quantity: item.quantity,
    discount_per_item: item.discountPerItem || 0,
    note: item.note || null,
  }));

  const { error: itemsError } = await supabase
    .from('transaction_items')
    .insert(itemsToInsert);

  if (itemsError) throw itemsError;

  const updatedTx = await fetchTransactionById(id);
  if (!updatedTx) throw new Error('Transaksi tidak ditemukan setelah diupdate');
  return updatedTx;
}
