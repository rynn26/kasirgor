'use client';

import React, { useRef } from 'react';
import { CourtBooking } from '@/types/booking';
import { formatDate, formatRupiah } from '@/lib/utils';
import { 
  Printer, 
  X, 
  CheckCircle2, 
  Share2, 
  MessageCircle, 
  Copy,
  Calendar,
  Clock,
  MapPin,
  User,
  ShieldCheck,
  Pencil,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useToastStore } from '@/lib/store/useToastStore';

interface BookingReceiptModalProps {
  isOpen: boolean;
  booking: CourtBooking | null;
  onClose: () => void;
  onEdit?: (booking: CourtBooking) => void;
  onDelete?: (booking: CourtBooking) => void;
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
}

export const BookingReceiptModal: React.FC<BookingReceiptModalProps> = ({
  isOpen,
  booking,
  onClose,
  onEdit,
  onDelete,
  shopName = 'GOR SINYO ARENA',
  shopAddress = 'Jl. Perum. Pemda Graha Sukadami Blok A Raya',
  shopPhone = '0821-2478-428',
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToastStore();

  if (!isOpen || !booking) return null;

  const isLunas = booking.status === 'SETTLED' || booking.remainingBalance === 0;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyWhatsApp = () => {
    const isMember = booking.memberType === 'MEMBER' || booking.communityName?.includes('Member');

    const bookingDateStr = booking.bookingDate || (booking.dpPaidAt ? booking.dpPaidAt.split('T')[0] : '');

    const isDirectLunas = booking.dpAmount >= booking.totalAmount || (!booking.settlementAmount || booking.settlementAmount === 0);
    const settleDateStr = booking.settlementPaidAt || booking.dpPaidAt || booking.createdAt;

    // Format tanggal dengan jam realtime sekarang (WIB)
    const now = new Date();
    const realtimeTime = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now);

    const formattedTanggal = `${formatDate(booking.date, false)}, ${realtimeTime}`;

    const text = `*BUKTI RESERVASI LAPANGAN - ${shopName.toUpperCase()}*
----------------------------------------
Nama: *${booking.customerName}*
Kategori: *${booking.communityName || 'Umum'}*
Tanggal: *${formattedTanggal}*
Waktu: *${booking.startTime} - ${booking.endTime} WIB* (${booking.durationHours} Jam)
----------------------------------------
Total Biaya Sewa: ${formatRupiah(booking.courtFee)}
${booking.additionalItems.length > 0 ? `Tambahan: ${booking.additionalItems.map(i => `${i.name} (${i.qty}x)`).join(', ')}\n` : ''}Total Tagihan: ${formatRupiah(booking.totalAmount)}
${isDirectLunas ? `Bayar Lunas: ${formatRupiah(booking.amountPaidTotal || booking.totalAmount)} (${booking.dpPaymentMethod || 'TUNAI'})` : `DP Terbayar: ${formatRupiah(booking.dpAmount)} (${booking.dpPaymentMethod || 'TUNAI'})\nPelunasan: ${formatRupiah(booking.settlementAmount || 0)} (${booking.settlementPaymentMethod || 'TUNAI'})`}
${isLunas ? `*STATUS: SUDAH LUNAS* ✅\nTanggal Pelunasan: *${formatDate(settleDateStr)}*` : `*SISA PELUNASAN: ${formatRupiah(booking.remainingBalance)}* ⚠️\n(Harap dilunasi sebelum bermain)`}
----------------------------------------
Harap hadir 10 menit sebelum jadwal bermain.
Terima kasih telah bermain di ${shopName}!`;

    navigator.clipboard.writeText(text);
    showToast('Teks bukti booking berhasil disalin ke clipboard!');
  };

  const handleOpenWhatsApp = () => {
    let cleanPhone = booking.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    const isMember = booking.memberType === 'MEMBER' || booking.communityName?.includes('Member');
    const bookingDateStr = booking.bookingDate || (booking.dpPaidAt ? booking.dpPaidAt.split('T')[0] : '');
    const isDirectLunas = booking.dpAmount >= booking.totalAmount || (!booking.settlementAmount || booking.settlementAmount === 0);
    const settleDateStr = booking.settlementPaidAt || booking.dpPaidAt || booking.createdAt;

    const message = encodeURIComponent(
      `Halo Kak *${booking.customerName}*, berikut bukti reservasi lapangan di *${shopName}*:\n\n` +
      `👤 *Nama*: ${booking.customerName}\n` +
      (isMember ? `🏷️ *Kategori*: Member Bulanan (Rutin Tiap Minggu)\n` : '') +
      (booking.notes ? `🗓️ *Jadwal Member*: ${booking.notes}\n` : '') +
      (bookingDateStr ? `📝 *Tgl Booking*: ${bookingDateStr}\n` : '') +
      `📅 *Tgl Main*: ${booking.date}\n` +
      `⏰ *Waktu*: ${booking.startTime} - ${booking.endTime} WIB (${booking.durationHours} Jam)\n` +
      `💰 *Total*: ${formatRupiah(booking.totalAmount)}\n` +
      `💳 *${isDirectLunas ? 'Pembayaran Diterima' : 'DP Diterima'}*: ${formatRupiah(booking.amountPaidTotal || booking.dpAmount)}\n` +
      (isLunas 
        ? `✅ *Status*: LUNAS\n🏁 *Tgl Pelunasan*: ${formatDate(settleDateStr)}` 
        : `⚠️ *Sisa Pembayaran*: ${formatRupiah(booking.remainingBalance)} (Pelunasan di lokasi sebelum main)`) +
      `\n\nTerima kasih! Ditunggu kehadirannya ya kak.`
    );

    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              isLunas ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base leading-tight">
                {isLunas ? 'Struk Pelunasan Sewa' : 'Bukti DP Booking Lapangan'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {booking.customerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60 flex justify-center">
          
          {/* Thermal Paper Simulation */}
          <div
            ref={receiptRef}
            className="w-full max-w-[340px] bg-white p-5 rounded-2xl shadow-md border border-slate-200 text-black font-mono text-[11px] leading-tight"
          >
            {/* Header Toko */}
            <div className="text-center mb-3">
              <h2 className="text-xs font-black tracking-wider uppercase">{shopName}</h2>
              <p className="text-[10px] text-gray-600">{shopAddress}</p>
              <p className="text-[10px] text-gray-600">Telp/WA: {shopPhone}</p>
            </div>

            {/* Status Badge in Receipt */}
            <div className="my-2 py-1.5 px-2 rounded-lg text-center font-bold text-xs border border-dashed border-gray-400 bg-gray-50">
              {isLunas ? '*** NOTA LUNAS SEWA LAPANGAN ***' : '*** BUKTI PEMBAYARAN DP BOOKING ***'}
            </div>

            {/* Detail Transaksi */}
            <div className="space-y-1 text-[10px] py-1 border-b border-dashed border-gray-300">
              <div className="flex justify-between">
                <span className="text-gray-600">Tgl/Jam Booking:</span>
                <span>{formatDate(booking.dpPaidAt || booking.createdAt || booking.date)}</span>
              </div>
              {isLunas && (
                <div className="flex justify-between font-bold text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded">
                  <span>Tgl Pelunasan:</span>
                  <span>{formatDate(booking.settlementPaidAt || booking.dpPaidAt || booking.createdAt)}</span>
                </div>
              )}
              {isLunas && booking.settlementCashier && (
                <div className="flex justify-between text-gray-600">
                  <span>Kasir Pelunasan:</span>
                  <span>{booking.settlementCashier}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Nama:</span>
                <span className="font-bold">{booking.customerName}</span>
              </div>
              {booking.communityName && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Kategori:</span>
                  <span className="font-semibold text-blue-900">{booking.communityName}</span>
                </div>
              )}
              {booking.notes && booking.memberType === 'MEMBER' && (
                <div className="text-[9px] bg-blue-50 p-1.5 rounded text-blue-950 font-medium">
                  {booking.notes}
                </div>
              )}
            </div>

            {/* Detail Sewa Lapangan */}
            <div className="py-2 border-b border-dashed border-gray-300 space-y-1.5">
              <div className="flex justify-between text-[10px] text-gray-700">
                <span>Tanggal Main:</span>
                <span className="font-semibold">{booking.date}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-700">
                <span>Jam Main:</span>
                <span className="font-bold">{booking.startTime} - {booking.endTime} WIB</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-700">
                <span>Durasi:</span>
                <span>{booking.durationHours} Jam @ {formatRupiah(booking.courtPricePerHour)}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-gray-900 pt-0.5">
                <span>Subtotal Lapangan:</span>
                <span>{formatRupiah(booking.courtFee)}</span>
              </div>
            </div>

            {/* Additional Items if any */}
            {booking.additionalItems.length > 0 && (
              <div className="py-2 border-b border-dashed border-gray-300 space-y-1">
                <div className="text-[10px] font-bold text-gray-600">Item Tambahan:</div>
                {booking.additionalItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[10px]">
                    <span>{item.qty}x {item.name}</span>
                    <span>{formatRupiah(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Kalkulasi Pembayaran */}
            <div className="space-y-1 text-[10px] pt-2">
              <div className="flex justify-between font-bold text-xs text-gray-900">
                <span>TOTAL BIAYA:</span>
                <span>{formatRupiah(booking.totalAmount)}</span>
              </div>

              {/* Jika lunas langsung tanpa pelunasan terpisah */}
              {booking.dpAmount >= booking.totalAmount || (!booking.settlementAmount || booking.settlementAmount === 0) ? (
                <div className="flex justify-between text-gray-700">
                  <span>Bayar Lunas ({booking.dpPaymentMethod || 'TUNAI'}):</span>
                  <span className="font-semibold text-emerald-700">-{formatRupiah(booking.amountPaidTotal || booking.totalAmount)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-gray-700">
                    <span>DP Dibayar ({booking.dpPaymentMethod || 'TUNAI'}):</span>
                    <span className="font-semibold text-emerald-700">-{formatRupiah(booking.dpAmount)}</span>
                  </div>

                  {booking.settlementAmount && booking.settlementAmount > 0 && (
                    <div className="flex justify-between text-gray-700">
                      <span>Pelunasan ({booking.settlementPaymentMethod || 'TUNAI'}):</span>
                      <span className="font-semibold text-emerald-700">-{formatRupiah(booking.settlementAmount)}</span>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-between font-bold text-xs pt-1 border-t border-dotted border-gray-400">
                <span>SISA TAGIHAN:</span>
                <span className={isLunas ? 'text-emerald-700' : 'text-red-600'}>
                  {isLunas ? 'LUNAS (Rp 0)' : formatRupiah(booking.remainingBalance)}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-dashed border-gray-300 my-3"></div>
            <div className="text-center text-[9px] text-gray-600 space-y-1">
              <p className="font-bold">Terima Kasih Atas Reservasi Anda!</p>
              <p>Harap hadir tepat waktu. Tunjukkan nota ini kepada petugas lapangan.</p>
              <div className="pt-1 text-[8px] text-gray-400 tracking-widest">
                *** GOR SINYO ARENA SYSTEM ***
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-slate-100 flex flex-col gap-2">
          {/* Print & WA */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handlePrint}
              className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Struk</span>
            </button>

            <button
              onClick={handleOpenWhatsApp}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Kirim WhatsApp</span>
            </button>
          </div>

          {/* Edit & Delete Actions */}
          <div className="grid grid-cols-2 gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(booking)}
                className="py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Data</span>
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(booking)}
                className="py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus / Void</span>
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopyWhatsApp}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Salin Teks Nota</span>
            </button>

            <button
              onClick={onClose}
              className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
