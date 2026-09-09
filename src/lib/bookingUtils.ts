import { CourtBooking } from '@/types/booking';
import { PaymentMethod } from '@/types/pos';

const jakartaDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

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
    return jakartaDateFormatter.format(d);
  } catch {
    return typeof isoOrDate === 'string' ? isoOrDate.split('T')[0] : '';
  }
}

/**
 * Dapatkan tanggal hari ini (YYYY-MM-DD) dalam zona waktu Asia/Jakarta (WIB).
 */
export function getJakartaToday(): string {
  return toJakartaDateString(new Date());
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
 * Jika ada settlementPaidAt, prioritaskan tanggal tersebut.
 * Jika belum dilunasi atau belum diisi, fallback ke tanggal booking/DP.
 */
export function getBookingSettleDate(b: CourtBooking): string {
  if (b.settlementPaidAt) {
    const sDate = toJakartaDateString(b.settlementPaidAt);
    if (sDate) return sDate;
  }
  return getBookingTxDate(b);
}

/**
 * Pecah porsi pembayaran riil (DP vs Pelunasan) secara akurat berdasarkan tanggal transaksi.
 */
export function getBookingPaymentBreakdown(b: CourtBooking): {
  txDate: string;
  settleDate: string;
  realDp: number;
  realSettle: number;
  isSameDate: boolean;
} {
  const totalPaid = b.amountPaidTotal || 0;
  const txDate = getBookingTxDate(b);
  const settleDate = getBookingSettleDate(b);
  const isSameDate = txDate === settleDate;

  let realDp = 0;
  let realSettle = 0;

  if (b.status === 'SETTLED') {
    const rawDp = b.dpAmount || 0;
    const rawSettle = b.settlementAmount || 0;

    // Kasus 1: DP dan Pelunasan bertahap (rawDp + rawSettle == totalPaid)
    if (rawDp > 0 && rawSettle > 0 && rawDp + rawSettle === totalPaid) {
      realDp = rawDp;
      realSettle = rawSettle;
    } else if (rawSettle > 0 && rawSettle < totalPaid) {
      realSettle = rawSettle;
      realDp = Math.max(0, totalPaid - realSettle);
    } else if (rawDp > 0 && rawDp < totalPaid) {
      realDp = rawDp;
      realSettle = Math.max(0, totalPaid - rawDp);
    } else if (!isSameDate) {
      // Dilunasi di hari berbeda dari booking (misal bayar lunas di minggu ke-2)
      realDp = 0;
      realSettle = totalPaid;
    } else {
      // Direct Lunas di hari yang sama
      realDp = totalPaid;
      realSettle = 0;
    }
  } else {
    // DP_PAID / CONFIRMED
    realDp = Math.min(b.dpAmount || 0, totalPaid);
    realSettle = 0;
  }

  return {
    txDate,
    settleDate,
    realDp,
    realSettle,
    isSameDate,
  };
}

/**
 * Hitung uang riil yang masuk dari booking ini dalam rentang tanggal [start, end].
 * - Uang DP dihitung HANYA jika tanggal DP masuk dalam [start, end].
 * - Uang pelunasan dihitung HANYA jika tanggal pelunasan masuk dalam [start, end].
 */
export function getBookingAmountInPeriod(b: CourtBooking, start: string, end: string): number {
  if (b.status === 'CANCELLED') return 0;
  const { txDate, settleDate, realDp, realSettle } = getBookingPaymentBreakdown(b);

  let amt = 0;
  const isDpInPeriod = txDate >= start && txDate <= end;
  const isSettleInPeriod = settleDate >= start && settleDate <= end;

  if (isDpInPeriod && realDp > 0) {
    amt += realDp;
  }
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
  const { txDate, settleDate, realDp, realSettle, isSameDate } = getBookingPaymentBreakdown(b);

  const results: Array<{
    type: 'DP' | 'PELUNASAN' | 'LUNAS_LANGSUNG';
    amount: number;
    method: PaymentMethod;
    date: string;
  }> = [];

  const isDpInPeriod = txDate >= start && txDate <= end;
  const isSettleInPeriod = settleDate >= start && settleDate <= end;

  if (isDpInPeriod && realDp > 0) {
    results.push({
      type: isSameDate && realSettle === 0 ? 'LUNAS_LANGSUNG' : 'DP',
      amount: realDp,
      method: b.dpPaymentMethod || (isSameDate ? b.settlementPaymentMethod : undefined) || 'CASH',
      date: txDate,
    });
  }

  if (isSettleInPeriod && realSettle > 0) {
    results.push({
      type: isSameDate && realDp === 0 ? 'LUNAS_LANGSUNG' : 'PELUNASAN',
      amount: realSettle,
      method: b.settlementPaymentMethod || b.dpPaymentMethod || 'CASH',
      date: settleDate,
    });
  }

  return results;
}
