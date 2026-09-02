export type CourtType = 'VIP Vinyl BWF' | 'Standar Karpet' | 'Parket Kayu' | 'Karpet' | string;

export interface Court {
  id: string;
  name: string;
  type: CourtType;
  pricePerHour: number;
  description: string;
  isAvailable: boolean;
}

export type BookingStatus = 'DP_PAID' | 'SETTLED' | 'IN_PLAY' | 'COMPLETED' | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'QRIS' | 'TRANSFER' | 'DEBIT';

export interface AdditionalItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export interface CourtBooking {
  id: string;
  bookingCode: string;
  customerName: string;
  phone: string;
  communityName?: string;
  memberType?: 'MEMBER' | 'INSIDENTIL';
  memberDay?: string;
  memberSessionsCount?: number;
  memberDates?: string[];
  date: string; // YYYY-MM-DD
  courtId: string;
  courtName: string;
  courtType: CourtType;
  courtPricePerHour: number;
  startTime: string; // e.g. "08:00"
  endTime: string; // e.g. "10:00"
  durationHours: number;
  courtFee: number;
  additionalItems: AdditionalItem[];
  totalAmount: number;
  
  // Down Payment Info
  dpAmount: number;
  dpPaymentMethod?: PaymentMethod;
  dpPaidAt?: string;
  dpCashier?: string;

  // Settlement Info
  settlementAmount?: number;
  settlementPaymentMethod?: PaymentMethod;
  settlementPaidAt?: string;
  settlementCashier?: string;
  amountPaidTotal: number;
  remainingBalance: number;

  status: BookingStatus;
  notes?: string;
  createdAt: string;
}
