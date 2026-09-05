import { CourtBooking } from '@/types/booking';
import { PaymentMethod } from '@/types/pos';

/**
 * Konversi ISO timestamp atau Date ke string YYYY-MM-DD di zona waktu Asia/Jakarta (WIB).
 */
export function toJakartaDateString(isoOrDate?: string | Date | null): string {
  if (!isoOrDate) return '';
  if (typeof isoOrDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(isoOrDate.trim())) {
    return isoOrDate.trim();
  }
  try {
    const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
    if (isNaN(d.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    if (y && m && day) return `${y}-${m}-${day}`;
    return typeof isoOrDate === 'string' ? isoOrDate.split('T')[0] : '';
  } catch {
    return typeof isoOrDate === 'string' ? isoOrDate.split('T')[0] : '';
  }
}

/**
 * Tanggal uang DP diterima (tanggal order/booking kasir).
 */
export function getBookingTxDate(b: CourtBooking): string {
  if (b.bookingDate && /^\d{4}-\d{2}-\d{2}$/.test(b.bookingDate)) {
    return b.bookingDate;
  }
  if (b.dpPaidAt) return toJakartaDateString(b.dpPaidAt);
  if (b.createdAt) return toJakartaDateString(b.createdAt);
  return b.date;
}

/**
 * Tanggal uang pelunasan diterima (tanggal pelunasan kasir).
 * Jika belum dilunasi, fallback ke tanggal DP.
 */
export function getBookingSettleDate(b: CourtBooking): string {
  if (b.settlementPaidAt) return toJakartaDateString(b.settlementPaidAt);
  return getBookingTxDate(b);
}

/**
 * Hitung uang riil yang masuk dari booking ini dalam rentang tanggal [start, end].
 * - Uang DP dihitung HANYA jika tanggal DP masuk dalam [start, end].
 * - Uang pelunasan dihitung HANYA jika tanggal pelunasan masuk dalam [start, end].
 */
export function getBookingAmountInPeriod(b: CourtBooking, start: string, end: string): number {
  if (b.status === 'CANCELLED') return 0;
  const totalPaid = b.amountPaidTotal || 0;
  const dpAmt = b.dpAmount || 0;
  const realDp = Math.min(dpAmt, totalPaid);
  const realSettle = Math.max(0, totalPaid - realDp);

  const txDate = getBookingTxDate(b);
  const settleDate = getBookingSettleDate(b);

  let amt = 0;
  const isDpInPeriod = txDate >= start && txDate <= end;
  const isSettleInPeriod = settleDate >= start && settleDate <= end;

  // Uang DP dihitung pada tanggal transaksi DP
  if (isDpInPeriod && realDp > 0) {
    amt += realDp;
  }

  // Uang pelunasan dihitung pada tanggal pelunasan
  if (isSettleInPeriod && realSettle > 0) {
    amt += realSettle;
  }

  return amt;
}

/**
 * Dapatkan rincian porsi pembayaran (DP & Pelunasan) yang sah masuk dalam rentang [start, end].
 */
export function getBookingPaymentItemsInPeriod(
  b: CourtBooking,
  start: string,
  end: string
): Array<{
  type: 'DP' | 'PELUNASAN' | 'LUNAS_LANGSUNG';
  amount: number;
  method: PaymentMethod;
  date: string;
}> {
  if (b.status === 'CANCELLED') return [];
  const totalPaid = b.amountPaidTotal || 0;
  const dpAmt = b.dpAmount || 0;
  const realDp = Math.min(dpAmt, totalPaid);
  const realSettle = Math.max(0, totalPaid - realDp);

  const txDate = getBookingTxDate(b);
  const settleDate = getBookingSettleDate(b);

  const isDpInPeriod = txDate >= start && txDate <= end;
  const isSettleInPeriod = settleDate >= start && settleDate <= end;

  const results: Array<{
    type: 'DP' | 'PELUNASAN' | 'LUNAS_LANGSUNG';
    amount: number;
    method: PaymentMethod;
    date: string;
  }> = [];

  // Jika sewa langsung (pelunasan pada hari yang sama dengan DP)
  if (settleDate === txDate) {
    if (isDpInPeriod && totalPaid > 0) {
      results.push({
        type: b.remainingBalance === 0 ? 'LUNAS_LANGSUNG' : 'DP',
        amount: totalPaid,
        method: b.settlementPaymentMethod || b.dpPaymentMethod || 'CASH',
        date: txDate,
      });
    }
  } else {
    // DP di tanggal tertentu
    if (isDpInPeriod && realDp > 0) {
      results.push({
        type: 'DP',
        amount: realDp,
        method: b.dpPaymentMethod || 'CASH',
        date: txDate,
      });
    }
    // Pelunasan di tanggal berbeda
    if (isSettleInPeriod && realSettle > 0) {
      results.push({
        type: 'PELUNASAN',
        amount: realSettle,
        method: b.settlementPaymentMethod || b.dpPaymentMethod || 'CASH',
        date: settleDate,
      });
    }
  }

  return results;
}
