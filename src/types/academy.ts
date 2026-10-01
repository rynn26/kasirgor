export type AcademyProgram = 'BADMINTON' | 'PICKLEBALL';
export type AcademyCategory = 'ANAK' | 'DEWASA';
export type AcademyPackage = '4X' | '5X';
export type AcademySessionTime = 'PAGI_SIANG' | 'SORE_MALAM';
export type AcademyPaymentMethod = 'QRIS' | 'CASH';
export type AcademyStatus = 'LUNAS' | 'DP_PAID';

export interface AcademyTransaction {
  id: string;
  receiptNumber: string;
  customerName: string;
  program: AcademyProgram;
  category?: AcademyCategory; // Badminton only
  package?: AcademyPackage;   // Badminton only
  trainingMonth?: string;     // Badminton only (e.g. "September 2026")
  sessionTime?: AcademySessionTime; // Pickleball only
  periodStart?: string;       // Pickleball only (YYYY-MM-DD)
  periodEnd?: string;         // Pickleball only (YYYY-MM-DD)
  feeAmount: number;
  dpAmount: number;
  remainingAmount: number;
  paymentMethod: AcademyPaymentMethod;
  status: AcademyStatus;
  cashierName: string;
  shift: string;
  notes?: string;
  createdAt: string;
  // Settlement fields (Pelunasan)
  settledAt?: string;
  settlementAmount?: number;
  settlementPaymentMethod?: AcademyPaymentMethod;
  settlementCashierName?: string;
}

export type MabarSportType = 'BADMINTON' | 'PICKLEBALL';

export interface OpenMabarTransaction {
  id: string;
  receiptNumber: string;
  sportType: MabarSportType;
  date: string; // YYYY-MM-DD
  nominalCash: number;
  nominalQris: number;
  totalAmount: number;
  cashierName: string;
  shift: string;
  notes?: string;
  createdAt: string;
}
