'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  User, 
  Banknote, 
  QrCode, 
  Save, 
  Award,
  Clock
} from 'lucide-react';
import { 
  AcademyTransaction, 
  AcademyProgram, 
  AcademyCategory, 
  AcademyPackage, 
  AcademyPaymentMethod, 
  AcademyStatus,
  AcademySessionTime
} from '@/types/academy';
import { updateAcademyTransaction } from '@/lib/db/academy';
import { useToastStore } from '@/lib/store/useToastStore';
import { formatRupiah, formatNumber, parseNumberInput } from '@/lib/utils';
import { toJakartaDateString, getJakartaToday } from '@/lib/bookingUtils';

interface EditAcademyModalProps {
  isOpen: boolean;
  transaction: AcademyTransaction | null;
  onClose: () => void;
  onSuccess: (updated: AcademyTransaction) => void;
}

export const EditAcademyModal: React.FC<EditAcademyModalProps> = ({
  isOpen,
  transaction,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToastStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [program, setProgram] = useState<AcademyProgram>('BADMINTON');
  const [category, setCategory] = useState<AcademyCategory>('ANAK');
  const [pkg, setPkg] = useState<AcademyPackage>('4X');
  const [trainingMonth, setTrainingMonth] = useState('');
  const [sessionTime, setSessionTime] = useState<AcademySessionTime>('PAGI_SIANG');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  // Financial & Dates
  const [bookingDate, setBookingDate] = useState('');
  const [feeAmount, setFeeAmount] = useState(0);
  const [dpAmount, setDpAmount] = useState(0);
  const [dpPaymentMethod, setDpPaymentMethod] = useState<AcademyPaymentMethod>('CASH');
  const [status, setStatus] = useState<AcademyStatus>('LUNAS');

  // Settlement (Pelunasan)
  const [settlementDate, setSettlementDate] = useState('');
  const [settlementMethod, setSettlementMethod] = useState<AcademyPaymentMethod>('CASH');
  const [settlementAmount, setSettlementAmount] = useState(0);

  const [notes, setNotes] = useState('');

  // Sync state when transaction changes or modal opens
  useEffect(() => {
    if (transaction) {
      setCustomerName(transaction.customerName || '');
      setProgram(transaction.program || 'BADMINTON');
      setCategory(transaction.category || 'ANAK');
      setPkg(transaction.package || '4X');
      setTrainingMonth(transaction.trainingMonth || '');
      setSessionTime(transaction.sessionTime || 'PAGI_SIANG');
      setPeriodStart(transaction.periodStart || '');
      setPeriodEnd(transaction.periodEnd || '');

      setBookingDate(toJakartaDateString(transaction.createdAt));
      setFeeAmount(transaction.feeAmount || 0);
      setDpAmount(transaction.dpAmount || 0);
      setDpPaymentMethod(transaction.paymentMethod || 'CASH');
      setStatus(transaction.status || 'LUNAS');

      // Settlement
      const initialSettleDate = transaction.settledAt 
        ? toJakartaDateString(transaction.settledAt)
        : getJakartaToday();
      setSettlementDate(initialSettleDate);
      setSettlementMethod(transaction.settlementPaymentMethod || transaction.paymentMethod || 'CASH');
      setSettlementAmount(
        transaction.settlementAmount !== undefined && transaction.settlementAmount > 0
          ? transaction.settlementAmount
          : Math.max(0, (transaction.feeAmount || 0) - (transaction.dpAmount || 0))
      );

      setNotes(transaction.notes || '');
    }
  }, [transaction, isOpen]);

  // Handle auto recalculation when fee or DP changes
  const handleFeeChange = (val: number) => {
    setFeeAmount(val);
    if (status === 'LUNAS') {
      if (dpAmount > val) setDpAmount(val);
      setSettlementAmount(Math.max(0, val - dpAmount));
    }
  };

  const handleDpChange = (val: number) => {
    setDpAmount(val);
    setSettlementAmount(Math.max(0, feeAmount - val));
  };

  const handleStatusChange = (newStatus: AcademyStatus) => {
    setStatus(newStatus);
    if (newStatus === 'LUNAS') {
      if (!settlementDate) {
        setSettlementDate(getJakartaToday());
      }
      setSettlementAmount(Math.max(0, feeAmount - dpAmount));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;

    if (!customerName.trim()) {
      showToast('Nama peserta tidak boleh kosong!');
      return;
    }

    if (feeAmount <= 0) {
      showToast('Total tarif pelatihan harus lebih dari 0!');
      return;
    }

    setIsSubmitting(true);
    try {
      const isLunas = status === 'LUNAS';
      const remaining = isLunas ? 0 : Math.max(0, feeAmount - dpAmount);

      // Construct booking createdAt with Jakarta timezone
      const timeStr = transaction.createdAt.includes('T') 
        ? transaction.createdAt.split('T')[1].slice(0, 8) 
        : '12:00:00';
      const updatedCreatedAt = `${bookingDate}T${timeStr}+07:00`;

      // Construct settlement date if LUNAS
      let updatedSettledAt: string | undefined = undefined;
      let updatedSettlementAmount = 0;
      let updatedSettlementMethod: AcademyPaymentMethod | undefined = undefined;

      if (isLunas) {
        // Jika pelunasan terpisah dari DP (ada selisih sisa yang dilunasi)
        if (dpAmount < feeAmount) {
          updatedSettledAt = `${settlementDate}T12:00:00+07:00`;
          updatedSettlementAmount = settlementAmount > 0 ? settlementAmount : Math.max(0, feeAmount - dpAmount);
          updatedSettlementMethod = settlementMethod;
        } else {
          // Bayar langsung lunas di awal (DP = Fee)
          updatedSettledAt = undefined;
          updatedSettlementAmount = 0;
          updatedSettlementMethod = undefined;
        }
      }

      const updated = await updateAcademyTransaction(transaction.id, {
        customerName: customerName.trim(),
        program,
        category: program === 'BADMINTON' ? category : undefined,
        package: program === 'BADMINTON' ? pkg : undefined,
        trainingMonth: program === 'BADMINTON' ? trainingMonth : undefined,
        sessionTime: program === 'PICKLEBALL' ? sessionTime : undefined,
        periodStart: program === 'PICKLEBALL' ? periodStart : undefined,
        periodEnd: program === 'PICKLEBALL' ? periodEnd : undefined,
        feeAmount,
        dpAmount,
        remainingAmount: remaining,
        paymentMethod: dpPaymentMethod,
        status,
        createdAt: updatedCreatedAt,
        settledAt: updatedSettledAt,
        settlementAmount: updatedSettlementAmount,
        settlementPaymentMethod: updatedSettlementMethod,
        notes: notes.trim() || undefined,
      });

      showToast('Data transaksi akademi berhasil diperbarui!');
      onSuccess(updated);
      onClose();
    } catch (err) {
      console.error('Error updating academy transaction:', err);
      showToast('Gagal menyimpan perubahan. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !transaction) return null;

  const isLunas = status === 'LUNAS';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-tight">
                Edit Transaksi Akademi
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Perbaiki kesalahan nama siswa, jadwal, status, atau pembayaran
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          
          {/* Customer Name */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 flex items-center gap-1">
              <span>Nama Peserta / Siswa</span>
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nama lengkap siswa..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Program Olahraga */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800">
              Program Olahraga
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProgram('BADMINTON')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  program === 'BADMINTON'
                    ? 'bg-[#c5221f] text-white border-[#c5221f] shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <span>🏸 Badminton</span>
              </button>
              <button
                type="button"
                onClick={() => setProgram('PICKLEBALL')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  program === 'PICKLEBALL'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <span>🏓 Pickleball</span>
              </button>
            </div>
          </div>

          {/* Badminton Specific Fields */}
          {program === 'BADMINTON' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50/70 border border-slate-200/80">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AcademyCategory)}
                  className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold cursor-pointer"
                >
                  <option value="ANAK">Anak</option>
                  <option value="DEWASA">Dewasa</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">Paket</label>
                <select
                  value={pkg}
                  onChange={(e) => setPkg(e.target.value as AcademyPackage)}
                  className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold cursor-pointer"
                >
                  <option value="4X">4X Pertemuan</option>
                  <option value="5X">5X Pertemuan</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">Bulan</label>
                <input
                  type="text"
                  value={trainingMonth}
                  onChange={(e) => setTrainingMonth(e.target.value)}
                  placeholder="Misal: Oktober 2026"
                  className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                />
              </div>
            </div>
          )}

          {/* Pickleball Specific Fields */}
          {program === 'PICKLEBALL' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-2xl bg-slate-50/70 border border-slate-200/80">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">Waktu Sesi</label>
                <select
                  value={sessionTime}
                  onChange={(e) => setSessionTime(e.target.value as AcademySessionTime)}
                  className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold cursor-pointer"
                >
                  <option value="PAGI_SIANG">Pagi - Siang (08.00 - 17.00)</option>
                  <option value="SORE_MALAM">Sore - Malam (17.00 - 23.00)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">Periode Mulai</label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                />
              </div>
            </div>
          )}

          {/* Tanggal Booking / DP */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 flex items-center gap-1">
              <span>Tanggal Booking / Pendaftaran</span>
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 absolute left-3 top-2.5" />
              <input
                type="date"
                required
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-indigo-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Tarif Pelatihan & Status Transaksi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-800 flex items-center gap-1">
                <span>Total Tarif Pelatihan (Rp)</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={feeAmount ? formatNumber(feeAmount) : ''}
                onChange={(e) => handleFeeChange(parseNumberInput(e.target.value))}
                placeholder="0"
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-black focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-800">
                Status Transaksi
              </label>
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as AcademyStatus)}
                className="w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold cursor-pointer"
              >
                <option value="LUNAS">Lunas (Selesai 100%)</option>
                <option value="DP_PAID">DP (Belum Lunas)</option>
              </select>
            </div>
          </div>

          {/* Rincian DP */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="font-bold text-slate-800">Nominal DP / Pendaftaran (Rp)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={typeof dpAmount === 'number' ? (dpAmount === 0 ? '0' : formatNumber(dpAmount)) : ''}
                  onChange={(e) => handleDpChange(parseNumberInput(e.target.value))}
                  placeholder="0"
                  className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800">Metode Pembayaran DP</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDpPaymentMethod('CASH')}
                    className={`py-1.5 px-2 rounded-xl font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                      dpPaymentMethod === 'CASH'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDpPaymentMethod('QRIS')}
                    className={`py-1.5 px-2 rounded-xl font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                      dpPaymentMethod === 'QRIS'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>QRIS</span>
                  </button>
                </div>
              </div>
            </div>

            {!isLunas && (
              <div className="flex items-center justify-between text-xs pt-1 text-rose-600 font-bold border-t border-slate-200/70">
                <span>Sisa Tagihan Belum Lunas:</span>
                <span>{formatRupiah(Math.max(0, feeAmount - dpAmount))}</span>
              </div>
            )}
          </div>

          {/* TANGGAL PELUNASAN (DESAIN IDENTIK DENGAN EDIT TRANSAKSI BOOKING) */}
          {isLunas && dpAmount < feeAmount && (
            <div className="space-y-2 pt-2 border-t border-slate-100 bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100">
              <label className="font-bold text-emerald-950 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Tanggal Pelunasan</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Lunas
                </span>
              </label>

              <input
                type="date"
                value={settlementDate}
                onChange={(e) => setSettlementDate(e.target.value)}
                className="w-full py-2 px-2.5 bg-white border border-emerald-200 rounded-xl text-slate-900 font-bold text-xs focus:outline-none focus:border-emerald-700 cursor-pointer"
              />

              <p className="text-[10px] text-emerald-700 font-medium">
                Tanggal pelunasan ini akan tercatat pada laporan kasir & omset harian.
              </p>

              {/* Metode Pembayaran Pelunasan */}
              <div className="pt-2 border-t border-emerald-200/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-950">
                    Metode Pelunasan:
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSettlementMethod('CASH')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        settlementMethod === 'CASH'
                          ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                          : 'bg-white text-slate-700 border-emerald-200 hover:bg-emerald-50'
                      }`}
                    >
                      Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettlementMethod('QRIS')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        settlementMethod === 'QRIS'
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                          : 'bg-white text-slate-700 border-emerald-200 hover:bg-emerald-50'
                      }`}
                    >
                      QRIS
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-bold text-emerald-950">
                    Nominal Pelunasan:
                  </span>
                  <span className="text-xs font-black text-emerald-800">
                    {formatRupiah(settlementAmount > 0 ? settlementAmount : Math.max(0, feeAmount - dpAmount))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Catatan Tambahan (Opsional) */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800">
              Catatan Tambahan (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Misal: Pelunasan via transfer, titip wali, dll..."
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
            />
          </div>

        </form>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-2xl bg-[#c5221f] hover:bg-[#a51b18] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-red-600/20 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
