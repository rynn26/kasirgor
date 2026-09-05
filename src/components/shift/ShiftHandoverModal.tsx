'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Repeat, 
  Banknote, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  User, 
  FileText,
  DollarSign
} from 'lucide-react';
import { useShiftStore, SHIFT_OPTIONS } from '@/lib/store/useShiftStore';
import { useToastStore } from '@/lib/store/useToastStore';
import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { formatRupiah, formatNumber, parseNumberInput } from '@/lib/utils';
import { recordActivityLog, updateCashierPresence } from '@/lib/db/activityLogs';

interface ShiftHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHandoverSuccess?: () => void;
}

export const ShiftHandoverModal: React.FC<ShiftHandoverModalProps> = ({
  isOpen,
  onClose,
  onHandoverSuccess,
}) => {
  const { cashierName, selectedShift, selectedUnit, openingCash, startTime, startShift, selectShift } = useShiftStore();
  const { transactions } = useTransactionStore();
  const { showToast } = useToastStore();

  const [closingCashInput, setClosingCashInput] = useState<string>('');
  const [nextCashier, setNextCashier] = useState<'Yuli' | 'Asfia' | string>('Asfia');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default next cashier based on current cashier
  useEffect(() => {
    if (isOpen) {
      if (cashierName.toLowerCase() === 'yuli') {
        setNextCashier('Asfia');
      } else if (cashierName.toLowerCase() === 'asfia') {
        setNextCashier('Yuli');
      } else {
        setNextCashier('Asfia');
      }
      setClosingCashInput('');
      setHandoverNotes('');
    }
  }, [isOpen, cashierName]);

  // Compute total sales today for this cashier / shift
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayCompletedTx = useMemo(() => {
    return transactions.filter(
      (t) => t.status === 'COMPLETED' && t.createdAt.startsWith(todayStr)
    );
  }, [transactions, todayStr]);

  const totalSales = useMemo(() => {
    return todayCompletedTx.reduce((sum, t) => sum + t.grandTotal, 0);
  }, [todayCompletedTx]);

  const totalCashSales = useMemo(() => {
    return todayCompletedTx
      .filter((t) => t.paymentMethod === 'CASH')
      .reduce((sum, t) => sum + t.grandTotal, 0);
  }, [todayCompletedTx]);

  const expectedCashInDrawer = (openingCash || 0) + totalCashSales;
  const actualClosingCash = parseNumberInput(closingCashInput);
  const cashDifference = actualClosingCash - expectedCashInDrawer;

  if (!isOpen) return null;

  const handleSubmitHandover = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!closingCashInput) {
      showToast('Harap masukkan jumlah uang kas fisik di laci.');
      return;
    }

    setIsSubmitting(true);
    try {
      const outgoingCashier = cashierName || 'Yuli';
      const incomingCashier = nextCashier;
      const outgoingShiftName = selectedShift?.name || 'Shift Pagi (08:00 - 17:00)';
      const nextShiftInfo = incomingCashier.toLowerCase() === 'asfia' ? SHIFT_OPTIONS[1] : SHIFT_OPTIONS[0];

      // 1. Record Shift Log in staff/shift system
      try {
        const { supabase } = await import('@/lib/supabase/client');
        await supabase.from('shift_logs').insert({
          staff_name: outgoingCashier,
          shift_name: outgoingShiftName,
          date: todayStr,
          start_time: startTime || '08:00',
          end_time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          opening_cash: openingCash || 0,
          closing_cash: actualClosingCash,
          total_sales: totalSales,
          total_transactions: todayCompletedTx.length,
          status: 'SELESAI',
        });
      } catch (err) {
        console.warn('Shift log insert error:', err);
      }

      // 2. Record Activity Log for Audit
      let diffNote = 'Uang Pas (Sesuai)';
      if (cashDifference > 0) diffNote = `Selisih Lebih: +${formatRupiah(cashDifference)}`;
      if (cashDifference < 0) diffNote = `Selisih Kurang: -${formatRupiah(Math.abs(cashDifference))}`;

      await recordActivityLog({
        staffName: outgoingCashier,
        staffEmail: outgoingCashier.toLowerCase() === 'asfia' ? 'asfiapickleball99@gmail.com' : 'yulibadminton11@gmail.com',
        role: 'Kasir',
        actionType: 'SHIFT_HANDOVER',
        title: 'Pergantian Shift (Handover)',
        details: `Serah terima shift dari ${outgoingCashier} (${outgoingShiftName}) ke ${incomingCashier}. Omzet: ${formatRupiah(totalSales)} (${todayCompletedTx.length} Nota), Kas Akhir Laci: ${formatRupiah(actualClosingCash)} [${diffNote}]. Catatan: ${handoverNotes || 'Tidak ada catatan khusus.'}`,
        metadata: {
          fromStaff: outgoingCashier,
          toStaff: incomingCashier,
          openingCash: openingCash || 0,
          closingCash: actualClosingCash,
          cashDifference,
          totalSales,
          totalTx: todayCompletedTx.length,
          notes: handoverNotes,
        },
      });

      // 3. Update Outgoing cashier presence to OFFLINE
      await updateCashierPresence({
        staffName: outgoingCashier,
        status: 'OFFLINE',
      });

      // 4. Update Incoming cashier presence to ONLINE
      await updateCashierPresence({
        staffName: incomingCashier,
        email: incomingCashier.toLowerCase() === 'asfia' ? 'asfiapickleball99@gmail.com' : 'yulibadminton11@gmail.com',
        role: 'Kasir',
        unit: selectedUnit === 'BOOKING_LAPANGAN' ? 'Booking Lapangan' : 'Kasir Toko & F&B',
        shift: nextShiftInfo.name,
        status: 'ONLINE',
        loginAt: new Date().toISOString(),
      });

      // 5. Update local state to the new incoming cashier
      selectShift(nextShiftInfo);
      startShift(incomingCashier, actualClosingCash);

      if (typeof window !== 'undefined') {
        const session = localStorage.getItem('kasir_session');
        const parsed = session ? JSON.parse(session) : {};
        parsed.name = incomingCashier;
        parsed.user = incomingCashier.toLowerCase() === 'asfia' ? 'asfiapickleball99@gmail.com' : 'yulibadminton11@gmail.com';
        parsed.email = incomingCashier.toLowerCase() === 'asfia' ? 'asfiapickleball99@gmail.com' : 'yulibadminton11@gmail.com';
        parsed.shift = nextShiftInfo.name;
        localStorage.setItem('kasir_session', JSON.stringify(parsed));
      }

      showToast(`Pergantian shift ke ${incomingCashier} berhasil disimpan!`);
      if (onHandoverSuccess) onHandoverSuccess();
      onClose();
    } catch (err: any) {
      showToast('Gagal menyimpan pergantian shift. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#eb4b2b] border border-orange-100 flex items-center justify-center shrink-0">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Pergantian Shift (Handover)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rekap kas akhir, serah terima laci kasir, & pergantian petugas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmitHandover} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          
          {/* Sesi Bertugas Saat Ini */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Kasir Saat Ini</span>
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {cashierName || 'Yuli'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Shift Operasional</span>
              <span className="font-bold text-slate-900">
                {selectedShift?.name || 'Shift Pagi (08:00 - 17:00)'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Jam Mulai Sesi</span>
              <span className="font-bold text-slate-700">
                {startTime || '08:00 WIB'}
              </span>
            </div>

            {openingCash > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                <span className="text-slate-500 font-medium">Modal Kas Awal</span>
                <span className="font-bold text-slate-900">
                  {formatRupiah(openingCash)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Total Omzet Transaksi Sesi Ini</span>
              <span className="font-black text-[#eb4b2b]">
                {formatRupiah(totalSales)} ({todayCompletedTx.length} Transaksi)
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>*Uang Masuk Tunai (Cash):</span>
              <span className="font-semibold text-slate-600">{formatRupiah(totalCashSales)}</span>
            </div>
          </div>

          {/* Input Kas Fisik di Laci */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 flex items-center justify-between">
              <span>Kas Fisik Akhir di Laci (Rp) *</span>
              <span className="text-[10px] text-slate-400 font-normal">
                Uang fisik riil setelah dihitung
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                required
                value={closingCashInput ? formatNumber(parseNumberInput(closingCashInput)) : ''}
                onChange={(e) => setClosingCashInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Contoh: 1.250.000"
                className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-2xl text-slate-900 font-bold text-sm focus:outline-none focus:border-[#eb4b2b] focus:ring-2 focus:ring-[#eb4b2b]/15"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Perkiraan kas di laci: Modal Awal ({formatRupiah(openingCash || 500000)}) + Penjualan Tunai ({formatRupiah(totalCashSales)}) = <strong>{formatRupiah(expectedCashInDrawer)}</strong>
            </p>
          </div>

          {/* Selisih Kas Status Alert */}
          {closingCashInput && (
            <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
              cashDifference === 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : cashDifference > 0
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="flex items-center gap-2">
                {cashDifference === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <div>
                  <span className="font-bold block">
                    {cashDifference === 0
                      ? 'Kas Laci Pas (Sesuai)'
                      : cashDifference > 0
                      ? 'Kas Lebih (Surplus)'
                      : 'Kas Kurang (Defisit)'}
                  </span>
                  <span className="text-[10px] opacity-80">
                    {cashDifference === 0
                      ? 'Jumlah uang fisik laci cocok dengan catatan transaksi.'
                      : `Selisih nominal sebesar ${formatRupiah(Math.abs(cashDifference))}`}
                  </span>
                </div>
              </div>
              <span className="font-black text-sm">
                {cashDifference === 0 ? 'Rp 0' : (cashDifference > 0 ? `+${formatRupiah(cashDifference)}` : `-${formatRupiah(Math.abs(cashDifference))}`)}
              </span>
            </div>
          )}

          {/* Pilihan Kasir Penerima Serah Terima */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 block">
              Serahkan Tugas ke Kasir Berikutnya:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['Yuli', 'Asfia'].map((name) => {
                const isSelected = nextCashier.toLowerCase() === name.toLowerCase();
                const isCurrent = (cashierName || '').toLowerCase() === name.toLowerCase();
                const shiftLabel = name === 'Yuli' ? 'Shift Pagi (08:00 - 17:00)' : 'Shift Sore (17:00 - 23:00)';

                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setNextCashier(name)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-red-50/70 border-[#eb4b2b] text-[#eb4b2b] shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{name}</span>
                      {isCurrent && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-600 font-semibold">
                          Saat ini
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{shiftLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Catatan Handover */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 block">Catatan Serah Terima (Opsional)</label>
            <textarea
              rows={2}
              value={handoverNotes}
              onChange={(e) => setHandoverNotes(e.target.value)}
              placeholder="Misal: Uang receh 200rb, lap 1 sewa raket belum selesai..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#eb4b2b] focus:bg-white text-xs"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 transition-colors cursor-pointer text-xs"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmitHandover}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-2xl bg-[#eb4b2b] hover:bg-[#d43a1c] text-white font-bold transition-colors cursor-pointer flex items-center gap-2 shadow-md shadow-[#eb4b2b]/25 text-xs disabled:opacity-50"
          >
            <Repeat className="w-4 h-4" />
            <span>{isSubmitting ? 'Memproses Serah Terima...' : `Selesaikan & Serahkan ke ${nextCashier}`}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
