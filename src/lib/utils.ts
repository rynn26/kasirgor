import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || amount === '') return '';
  const num = typeof amount === 'string' ? Number(amount.replace(/[^0-9-]/g, '')) : amount;
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('id-ID').format(num);
}

export function parseNumberInput(val: string): number {
  const clean = val.replace(/[^0-9]/g, '');
  return clean ? parseInt(clean, 10) : 0;
}

export function formatDate(dateString: string | Date | undefined | null, includeTime: boolean = true): string {
  if (!dateString) return "-";

  // Ambil jam realtime saat ini (WIB)
  const getRealtimeTimeStr = () => {
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date());
  };

  // Jika input berupa string tanggal saja (YYYY-MM-DD) tanpa jam
  if (typeof dateString === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateString.trim())) {
    const dateOnly = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(dateString));

    if (!includeTime) {
      return dateOnly;
    }

    return `${dateOnly}, ${getRealtimeTimeStr()}`;
  }

  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  
  if (isNaN(date.getTime())) return "-";

  const dateOnly = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);

  if (!includeTime) {
    return dateOnly;
  }

  const timeFormatted = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);

  // Jika jamnya dummy placeholder (12.00.00, 00.00.00, 07.00.00, 19.00.00 akibat default ISO atau midday fallback):
  const isDummyPlaceholderTime =
    timeFormatted === "12.00.00" ||
    timeFormatted === "00.00.00" ||
    timeFormatted === "07.00.00" ||
    timeFormatted === "19.00.00" ||
    (typeof dateString === "string" && (dateString.includes("T12:00:00") || dateString.includes("T00:00:00") || dateString.includes("T05:00:00")));

  if (isDummyPlaceholderTime) {
    return `${dateOnly}, ${getRealtimeTimeStr()}`;
  }

  return `${dateOnly}, ${timeFormatted}`;
}

export function generateInvoiceNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(2, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `GOR-${dateStr}-${randomSuffix}`;
}
