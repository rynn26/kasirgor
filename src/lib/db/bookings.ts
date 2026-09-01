import { supabase } from '@/lib/supabase/client';
import { CourtBooking, BookingStatus, PaymentMethod, AdditionalItem } from '@/types/booking';
import { Court } from '@/types/booking';

export interface DbCourt {
  id: string;
  name: string;
  type: string;
  price_per_hour: number;
  description: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbCourtBooking {
  id: string;
  booking_code: string;
  customer_name: string;
  phone: string;
  community_name: string | null;
  date: string;
  court_id: string | null;
  court_name: string;
  court_type: string;
  court_price_per_hour: number;
  start_time: string;
  end_time: string;
  duration_hours: number;
  court_fee: number;
  total_amount: number;
  dp_amount: number;
  dp_payment_method: string | null;
  dp_paid_at: string | null;
  dp_cashier: string | null;
  settlement_amount: number | null;
  settlement_payment_method: string | null;
  settlement_paid_at: string | null;
  settlement_cashier: string | null;
  amount_paid_total: number;
  remaining_balance: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbAdditionalItem {
  id: string;
  booking_id: string;
  name: string;
  price: number;
  qty: number;
  created_at: string;
}

function mapDbToCourt(row: DbCourt): Court {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Court['type'],
    pricePerHour: Number(row.price_per_hour),
    description: row.description || '',
    isAvailable: row.is_available,
  };
}

function mapDbAdditionalItem(row: DbAdditionalItem): AdditionalItem {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    qty: row.qty,
  };
}

function mapDbToBooking(
  row: DbCourtBooking,
  additionalItems: AdditionalItem[]
): CourtBooking {
  return {
    id: row.id,
    bookingCode: row.booking_code,
    customerName: row.customer_name,
    phone: row.phone,
    communityName: row.community_name || undefined,
    date: row.date,
    courtId: row.court_id || '',
    courtName: row.court_name,
    courtType: row.court_type as CourtBooking['courtType'],
    courtPricePerHour: Number(row.court_price_per_hour),
    startTime: row.start_time,
    endTime: row.end_time,
    durationHours: Number(row.duration_hours),
    courtFee: Number(row.court_fee),
    additionalItems,
    totalAmount: Number(row.total_amount),
    dpAmount: Number(row.dp_amount),
    dpPaymentMethod: (row.dp_payment_method as PaymentMethod) || undefined,
    dpPaidAt: row.dp_paid_at || undefined,
    dpCashier: row.dp_cashier || undefined,
    settlementAmount: row.settlement_amount ? Number(row.settlement_amount) : undefined,
    settlementPaymentMethod:
      (row.settlement_payment_method as PaymentMethod) || undefined,
    settlementPaidAt: row.settlement_paid_at || undefined,
    settlementCashier: row.settlement_cashier || undefined,
    amountPaidTotal: Number(row.amount_paid_total),
    remainingBalance: Number(row.remaining_balance),
    status: row.status as BookingStatus,
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

export async function fetchCourts(): Promise<Court[]> {
  const { data, error } = await supabase
    .from('courts')
    .select('*')
    .order('name');

  if (error) throw error;
  return (data as DbCourt[]).map(mapDbToCourt);
}

export async function fetchBookings(date?: string): Promise<CourtBooking[]> {
  let query = supabase
    .from('court_bookings')
    .select('*')
    .order('created_at', { ascending: false });

  if (date) {
    query = query.eq('date', date);
  }

  const { data, error } = await query;
  if (error) throw error;

  const bookings: CourtBooking[] = [];

  for (const row of data as DbCourtBooking[]) {
    const { data: items } = await supabase
      .from('booking_additional_items')
      .select('*')
      .eq('booking_id', row.id);

    const additionalItems = (items as DbAdditionalItem[] || []).map(
      mapDbAdditionalItem
    );
    bookings.push(mapDbToBooking(row, additionalItems));
  }

  return bookings;
}

export async function fetchBookingById(id: string): Promise<CourtBooking | null> {
  const { data: row, error } = await supabase
    .from('court_bookings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const { data: items } = await supabase
    .from('booking_additional_items')
    .select('*')
    .eq('booking_id', id);

  return mapDbToBooking(
    row as DbCourtBooking,
    (items as DbAdditionalItem[] || []).map(mapDbAdditionalItem)
  );
}

export async function createBooking(
  booking: Omit<CourtBooking, 'id' | 'createdAt' | 'bookingCode' | 'additionalItems'> & {
    additionalItems?: Omit<AdditionalItem, 'id'>[];
  }
): Promise<CourtBooking> {
  const randomCode = Math.floor(1000 + Math.random() * 9000);
  const dateFormatted = booking.date.replace(/-/g, '').slice(2);
  const bookingCode = `BKG-${dateFormatted}-${randomCode}`;
  const bookingId = crypto.randomUUID();

  const { error: bookingError } = await supabase
    .from('court_bookings')
    .insert({
      id: bookingId,
      booking_code: bookingCode,
      customer_name: booking.customerName,
      phone: booking.phone,
      community_name: booking.communityName || null,
      date: booking.date,
      court_id: booking.courtId || null,
      court_name: booking.courtName,
      court_type: booking.courtType,
      court_price_per_hour: booking.courtPricePerHour,
      start_time: booking.startTime,
      end_time: booking.endTime,
      duration_hours: booking.durationHours,
      court_fee: booking.courtFee,
      total_amount: booking.totalAmount,
      dp_amount: booking.dpAmount,
      dp_payment_method: booking.dpPaymentMethod || null,
      dp_paid_at: booking.dpPaidAt || null,
      dp_cashier: booking.dpCashier || null,
      amount_paid_total: booking.amountPaidTotal,
      remaining_balance: booking.remainingBalance,
      status: booking.status,
      notes: booking.notes || null,
    });

  if (bookingError) throw bookingError;

  if (booking.additionalItems && booking.additionalItems.length > 0) {
    const itemsToInsert = booking.additionalItems.map((item, idx) => ({
      id: crypto.randomUUID(),
      booking_id: bookingId,
      name: item.name,
      price: item.price,
      qty: item.qty,
    }));

    const { error: itemsError } = await supabase
      .from('booking_additional_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;
  }

  const { data: created } = await supabase
    .from('court_bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  const { data: items } = await supabase
    .from('booking_additional_items')
    .select('*')
    .eq('booking_id', bookingId);

  return mapDbToBooking(
    created as DbCourtBooking,
    (items as DbAdditionalItem[] || []).map(mapDbAdditionalItem)
  );
}

export async function settleBooking(
  bookingId: string,
  settlementData: {
    settlementAmount: number;
    paymentMethod: PaymentMethod;
    cashier: string;
    additionalItems?: Omit<AdditionalItem, 'id'>[];
  }
): Promise<CourtBooking> {
  if (settlementData.additionalItems && settlementData.additionalItems.length > 0) {
    const itemsToInsert = settlementData.additionalItems.map((item, idx) => ({
      id: crypto.randomUUID(),
      booking_id: bookingId,
      name: item.name,
      price: item.price,
      qty: item.qty,
    }));

    await supabase
      .from('booking_additional_items')
      .insert(itemsToInsert);
  }

  const { data: current, error: fetchError } = await supabase
    .from('court_bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (fetchError) throw fetchError;

  const row = current as DbCourtBooking;
  const itemsTotal =
    settlementData.additionalItems?.reduce(
      (sum, it) => sum + it.price * it.qty,
      0
    ) || 0;
  const newTotal = Number(row.total_amount) + itemsTotal;
  const newPaidTotal =
    Number(row.amount_paid_total) + settlementData.settlementAmount;
  const newRemaining = Math.max(0, newTotal - newPaidTotal);

  const { data: updated, error: updateError } = await supabase
    .from('court_bookings')
    .update({
      total_amount: newTotal,
      settlement_amount: settlementData.settlementAmount,
      settlement_payment_method: settlementData.paymentMethod,
      settlement_paid_at: new Date().toISOString(),
      settlement_cashier: settlementData.cashier,
      amount_paid_total: newPaidTotal,
      remaining_balance: newRemaining,
      status: 'SETTLED',
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (updateError) throw updateError;

  const { data: items } = await supabase
    .from('booking_additional_items')
    .select('*')
    .eq('booking_id', bookingId);

  return mapDbToBooking(
    updated as DbCourtBooking,
    (items as DbAdditionalItem[] || []).map(mapDbAdditionalItem)
  );
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const { error } = await supabase
    .from('court_bookings')
    .update({ status: 'CANCELLED' })
    .eq('id', bookingId);

  if (error) throw error;
}
