'use client';

import React from 'react';
import { useCourtBookingStore } from '@/lib/store/useCourtBookingStore';
import { useCourtPricingStore } from '@/lib/store/useCourtPricingStore';
import { formatRupiah } from '@/lib/utils';
import { CourtBooking } from '@/types/booking';
import { 
  Plus, 
  Clock, 
  User, 
  Phone, 
  CheckCircle2, 
  AlertCircle,
  PlayCircle,
  Receipt
} from 'lucide-react';

interface CourtScheduleGridProps {
  date: string;
  onSlotClick: (courtId: string, time: string) => void;
  onBookingClick: (booking: CourtBooking) => void;
  onSettleClick: (booking: CourtBooking) => void;
}

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00', '22:00'
];

export const CourtScheduleGrid: React.FC<CourtScheduleGridProps> = ({
  date,
  onSlotClick,
  onBookingClick,
  onSettleClick,
}) => {
  const { courts, getBookingsForDate } = useCourtBookingStore();
  const { getPriceForSlot } = useCourtPricingStore();
  const dateBookings = getBookingsForDate(date);

  const getBookingForSlot = (courtId: string, timeSlot: string) => {
    const slotHour = parseInt(timeSlot.split(':')[0], 10);

    return dateBookings.find((b) => {
      if (b.courtId !== courtId) return false;
      const startHour = parseInt(b.startTime.split(':')[0], 10);
      const endHour = parseInt(b.endTime.split(':')[0], 10);
      return slotHour >= startHour && slotHour < endHour;
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Grid Header Info */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
        <div>
          <h3 className="font-black text-slate-900 text-sm sm:text-base">
            Matriks Jadwal & Ketersediaan Lapangan
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Tanggal: <strong className="text-slate-800">{date}</strong> • Klik slot kosong untuk booking langsung
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Tersedia</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>DP Masuk</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Lunas</span>
          </div>
        </div>
      </div>

      {/* Responsive Horizontal Scroll Schedule Matrix */}
      <div className="overflow-x-auto">
        <div className="min-w-[760px] p-4 sm:p-5">
          {/* Header Courts Columns */}
          <div className="grid grid-cols-5 gap-2 mb-3">
            <div className="p-2.5 rounded-2xl bg-slate-100 text-slate-600 font-black text-xs flex items-center justify-center">
              Jam Main
            </div>
            {courts.map((court) => {
              const daySlotPrice = getPriceForSlot(court.id, date, '10:00', court.pricePerHour);
              const nightSlotPrice = getPriceForSlot(court.id, date, '19:00', court.pricePerHour);

              return (
                <div
                  key={court.id}
                  className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-center"
                >
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-emerald-700 block w-fit mx-auto">
                    Karpet
                  </span>
                  <h4 className="font-black text-xs text-slate-900 mt-1 line-clamp-1">
                    {court.name}
                  </h4>
                  <p className="text-[10px] font-bold text-[#b92b10]">
                    {formatRupiah(daySlotPrice.price)} - {formatRupiah(nightSlotPrice.price)}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Time Slot Rows */}
          <div className="space-y-1.5">
            {TIME_SLOTS.map((time) => {
              return (
                <div key={time} className="grid grid-cols-5 gap-2 items-center">
                  {/* Time Label */}
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-mono font-bold text-xs flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{time}</span>
                  </div>

                  {/* 4 Court Cells */}
                  {courts.map((court) => {
                    const booking = getBookingForSlot(court.id, time);
                    const slotPrice = getPriceForSlot(court.id, date, time, court.pricePerHour);

                    if (!booking) {
                      // Slot is AVAILABLE
                      return (
                        <button
                          key={court.id}
                          type="button"
                          onClick={() => onSlotClick(court.id, time)}
                          title={`Booking ${court.name} pukul ${time} (${slotPrice.period} - ${formatRupiah(slotPrice.price)})`}
                          className="h-14 p-1.5 rounded-2xl bg-emerald-50/40 hover:bg-emerald-100/70 border border-dashed border-emerald-200 hover:border-emerald-400 text-emerald-700 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-1 text-[11px] font-bold group-hover:scale-105 transition-transform">
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tersedia</span>
                          </div>
                          <span className="text-[9px] text-emerald-600 font-semibold">
                            {formatRupiah(slotPrice.price)}
                          </span>
                        </button>
                      );
                    }

                    // Slot is BOOKED
                    const isDP = booking.status === 'DP_PAID';

                    return (
                      <div
                        key={court.id}
                        className={`h-14 p-2 rounded-2xl border flex flex-col justify-between transition-all ${
                          isDP
                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                            : 'bg-blue-50 border-blue-200 text-blue-900'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-black text-[11px] truncate" title={booking.customerName}>
                            {booking.customerName}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                              isDP
                                ? 'bg-amber-200/80 text-amber-800'
                                : 'bg-blue-200/80 text-blue-800'
                            }`}
                          >
                            {isDP ? 'DP' : 'LUNAS'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-1 text-[10px]">
                          <span className="text-slate-500 font-mono">
                            {booking.startTime}-{booking.endTime}
                          </span>

                          <div className="flex items-center gap-1">
                            {isDP ? (
                              <button
                                type="button"
                                onClick={() => onSettleClick(booking)}
                                className="px-1.5 py-0.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold text-[9px] cursor-pointer shadow-2xs"
                              >
                                Lunasi
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onBookingClick(booking)}
                                className="px-1.5 py-0.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-[9px] cursor-pointer shadow-2xs"
                              >
                                Nota
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
