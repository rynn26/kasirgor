import * as XLSX from 'xlsx';
import { Transaction, normalizeProductCategory } from '@/types/pos';
import { CourtBooking } from '@/types/booking';
import { useProductStore } from '@/lib/store/useProductStore';
import { getBookingAmountInPeriod, getBookingPaymentItemsInPeriod, getBookingSettleDate, getJakartaToday } from '@/lib/bookingUtils';

export interface KantinSalesItemRow {
  no: number;
  barang: string;
  kategori: string;
  satuan: string;
  terjual: number;
  harga: number;
  modal: number;
  cuanPerPcs: number;
  omset: number;
  cuanTotal: number;
}

// Helper to escape HTML entities to prevent XSS
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Helper to build grouped sales rows from real transactions
 */
export function buildKantinItemRows(transactions: Transaction[]): KantinSalesItemRow[] {
  const itemMap: Record<
    string,
    {
      name: string;
      category: string;
      unit: string;
      qty: number;
      price: number;
      costPrice: number;
      omset: number;
      cuanTotal: number;
    }
  > = {};

  const validTx = transactions.filter((t) => t.status === 'COMPLETED');
  const storeProducts = useProductStore.getState().products;

  validTx.forEach((tx) => {
    tx.items.forEach((item) => {
      const key = item.product.id || item.product.name;
      const price = item.product.price;
      const matched = storeProducts.find(
        (p) => (item.product.id && p.id === item.product.id) ||
               (p.name && item.product.name && p.name.trim().toLowerCase() === item.product.name.trim().toLowerCase())
      );
      const cost = item.product.costPrice ?? matched?.costPrice ?? 0;
      const cuanPerUnit = Math.max(0, price - cost);

      if (!itemMap[key]) {
        itemMap[key] = {
          name: item.product.name,
          category: normalizeProductCategory(item.product.category),
          unit: item.product.unit || 'pcs',
          qty: 0,
          price: price,
          costPrice: cost,
          omset: 0,
          cuanTotal: 0,
        };
      }

      itemMap[key].qty += item.quantity;
      itemMap[key].omset += price * item.quantity;
      itemMap[key].cuanTotal += cuanPerUnit * item.quantity;
    });
  });

  return Object.values(itemMap)
    .sort((a, b) => b.omset - a.omset)
    .map((item, idx) => ({
      no: idx + 1,
      barang: item.name,
      kategori: item.category,
      satuan: item.unit,
      terjual: item.qty,
      harga: item.price,
      modal: item.costPrice,
      cuanPerPcs: item.price - item.costPrice,
      omset: item.omset,
      cuanTotal: item.cuanTotal,
    }));
}

/**
 * Export Kantin / POS Toko sales to Excel (.xlsx) from actual database transactions
 */
export function exportKantinToExcel(
  periodLabel: string,
  transactions: Transaction[]
) {
  const rows = buildKantinItemRows(transactions);
  const totalOmset = rows.reduce((s, r) => s + r.omset, 0);
  const totalCuan = rows.reduce((s, r) => s + r.cuanTotal, 0);
  const totalTerjual = rows.reduce((s, r) => s + r.terjual, 0);

  const data: (string | number)[][] = [
    [`LAPORAN PENJUALAN KANTIN & TOKO GOR - ${periodLabel.toUpperCase()}`],
    [`Total Transaksi: ${transactions.filter(t => t.status === 'COMPLETED').length} Nota | Total Item Terjual: ${totalTerjual} pcs`],
    [],
    ['No.', 'Nama Produk / Barang', 'Kategori', 'Satuan', 'Terjual (Qty)', 'Harga Jual (Rp)', 'Modal HPP (Rp)', 'Cuan / Pcs (Rp)', 'Total Omset (Rp)', 'Total Keuntungan (Rp)'],
  ];

  if (rows.length === 0) {
    data.push(['-', 'Belum ada data penjualan pada periode ini', '-', '-', 0, 0, 0, 0, 0, 0]);
  } else {
    rows.forEach((r) => {
      data.push([
        r.no,
        r.barang,
        r.kategori,
        r.satuan,
        r.terjual,
        r.harga,
        r.modal,
        r.cuanPerPcs,
        r.omset,
        r.cuanTotal,
      ]);
    });
  }

  // TOTAL Row
  data.push([
    'TOTAL KESELURUHAN',
    '',
    '',
    '',
    totalTerjual,
    '',
    '',
    '',
    totalOmset,
    totalCuan,
  ]);

  data.push([]);
  data.push(['', '', '', '', '', '', '', 'Keuntungan Bersih', totalCuan, '']);

  const ws = XLSX.utils.aoa_to_sheet(data);

  ws['!cols'] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 18 },
    { wch: 10 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Penjualan Kantin');
  XLSX.writeFile(wb, `Laporan_Kantin_${Date.now()}.xlsx`);
}

/**
 * Print & Export Kantin Sales to PDF from actual transactions
 */
export function printKantinPDF(
  periodLabel: string,
  transactions: Transaction[]
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const rows = buildKantinItemRows(transactions);
  const totalOmset = rows.reduce((s, r) => s + r.omset, 0);
  const totalCuan = rows.reduce((s, r) => s + r.cuanTotal, 0);
  const totalTerjual = rows.reduce((s, r) => s + r.terjual, 0);
  const completedTx = transactions.filter((t) => t.status === 'COMPLETED');
  const kantinCash = completedTx.filter((t) => t.paymentMethod === 'CASH').reduce((s, t) => s + t.grandTotal, 0);
  const kantinQris = completedTx.filter((t) => t.paymentMethod === 'QRIS').reduce((s, t) => s + t.grandTotal, 0);
  const cashTxCount = completedTx.filter((t) => t.paymentMethod === 'CASH').length;
  const qrisTxCount = completedTx.filter((t) => t.paymentMethod === 'QRIS').length;

  const tableRows = rows.length > 0
    ? rows
        .map(
          (r, idx) => `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; font-size: 11px;">
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${r.no}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-weight: bold; color: #0f172a;">${escapeHtml(r.barang)}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; color: #475569;">${r.kategori}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: bold;">${r.terjual} ${r.satuan}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right;">Rp ${r.harga.toLocaleString('id-ID')}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; color: #64748b;">Rp ${r.modal.toLocaleString('id-ID')}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; font-weight: bold; color: #0f172a;">Rp ${r.omset.toLocaleString('id-ID')}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; font-weight: bold; color: #15803d;">Rp ${r.cuanTotal.toLocaleString('id-ID')}</td>
        </tr>
      `
        )
        .join('')
    : `<tr><td colspan="8" style="text-align: center; padding: 16px; color: #94a3b8;">Belum ada data transaksi penjualan pada periode ini.</td></tr>`;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Laporan Penjualan Kantin - ${periodLabel}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 24px;
            color: #0f172a;
            background: #fff;
          }
          .header-box {
            text-align: center;
            border-bottom: 2px solid #b92b10;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .title { font-size: 18px; font-weight: 900; color: #b92b10; margin: 0; }
          .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; font-weight: 600; }
          .summary-cards {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
          }
          .summary-card {
            flex: 1;
            padding: 10px 12px;
            border-radius: 8px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
          }
          .summary-title { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; }
          .summary-val { font-size: 15px; font-weight: 900; color: #0f172a; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th {
            background-color: #b92b10;
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
            text-align: center;
            padding: 8px 6px;
            border: 1px solid #991b1b;
          }
          .total-row td {
            background-color: #0f172a;
            color: #ffffff;
            font-size: 12px;
            font-weight: 900;
            padding: 8px;
            border: 1px solid #0f172a;
          }
          @media print {
            body { padding: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <h1 class="title">LAPORAN PENJUALAN KANTIN & TOKO GOR</h1>
          <div class="subtitle">Periode: ${periodLabel} - Dicetak: ${new Date().toLocaleString('id-ID')}</div>
        </div>

        <div class="summary-cards">
          <div class="summary-card">
            <div class="summary-title">TOTAL TRANSAKSI</div>
            <div class="summary-val">${completedTx.length} Nota</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">TOTAL PRODUK TERJUAL</div>
            <div class="summary-val">${totalTerjual} pcs</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">TOTAL OMZET PENJUALAN</div>
            <div class="summary-val" style="color: #b92b10;">Rp ${totalOmset.toLocaleString('id-ID')}</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">TOTAL KEUNTUNGAN BERSIH</div>
            <div class="summary-val" style="color: #15803d;">Rp ${totalCuan.toLocaleString('id-ID')}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">No.</th>
              <th>Nama Produk</th>
              <th style="width: 90px;">Kategori</th>
              <th style="width: 70px;">Terjual</th>
              <th style="width: 85px;">Harga Jual</th>
              <th style="width: 85px;">Modal HPP</th>
              <th style="width: 100px;">Total Omset</th>
              <th style="width: 100px;">Keuntungan</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            <tr class="total-row">
              <td colspan="3" style="text-align: center; font-weight: 900;">TOTAL KESELURUHAN</td>
              <td colspan="3"></td>
              <td style="text-align: right; color: #ffffff; font-weight: 900;">Rp ${totalOmset.toLocaleString('id-ID')}</td>
              <td style="text-align: right; color: #4ade80; font-weight: 900;">Rp ${totalCuan.toLocaleString('id-ID')}</td>
            </tr>
          </tbody>
        </table>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * Export Court Bookings (Sewa Lapangan) to Excel (.xlsx) from actual database bookings
 */
export function exportCourtBookingsToExcel(
  periodLabel: string,
  bookings: CourtBooking[],
  startDate?: string,
  endDate?: string
) {
  const activeBookings = bookings.filter((b) => b.status !== 'CANCELLED');
  const totalOmset = activeBookings.reduce((s, b) => s + b.totalAmount, 0);
  const totalPaid = activeBookings.reduce(
    (s, b) => s + (startDate && endDate ? getBookingAmountInPeriod(b, startDate, endDate) : b.amountPaidTotal),
    0
  );
  const totalRemaining = activeBookings.reduce((s, b) => s + b.remainingBalance, 0);
  const totalHours = activeBookings.reduce((s, b) => s + b.durationHours, 0);

  const data: (string | number)[][] = [
    [`LAPORAN SEWA LAPANGAN GOR - ${periodLabel.toUpperCase()}`],
    [`Total Booking: ${activeBookings.length} Reservasi | Total Jam Main: ${totalHours} Jam`],
    [],
    [
      'No.',
      'Kode Booking',
      'Tgl Booking',
      'Tgl Main',
      'Tgl Pelunasan',
      'Nama Pemesan',
      'No. WhatsApp',
      'Kategori',
      'Lapangan',
      'Jam Main',
      'Durasi (Jam)',
      'Total Tarif (Rp)',
      startDate && endDate ? 'Masuk Periode Ini (Rp)' : 'Sudah Bayar (Rp)',
      'Total Terbayar (Rp)',
      'Sisa Tagihan (Rp)',
      'Status',
      'Metode Bayar',
    ],
  ];

  if (activeBookings.length === 0) {
    data.push(['-', 'Belum ada data sewa lapangan pada periode ini', '-', '-', '-', '-', '-', '-', '-', '-', 0, 0, 0, 0, 0, '-', '-']);
  } else {
    activeBookings.forEach((b, idx) => {
      const isMember = b.memberType === 'MEMBER' || b.communityName?.includes('Member');
      const kategori = isMember ? 'Member' : 'Insidentil';
      const isLunas = b.status === 'SETTLED' || b.remainingBalance === 0;
      const statusLabel = isLunas ? 'LUNAS' : b.status === 'DP_PAID' ? 'DP' : b.status;
      const paymentMethod = b.settlementPaymentMethod || b.dpPaymentMethod || '-';
      const tglPelunasan = isLunas ? getBookingSettleDate(b) : '-';

      const paidInPeriod = (startDate && endDate)
        ? getBookingAmountInPeriod(b, startDate, endDate)
        : b.amountPaidTotal;

      data.push([
        idx + 1,
        b.bookingCode,
        b.bookingDate || b.date,
        b.date,
        tglPelunasan,
        b.customerName,
        b.phone,
        kategori,
        b.courtName,
        `${b.startTime} - ${b.endTime}`,
        b.durationHours,
        b.totalAmount,
        paidInPeriod,
        b.amountPaidTotal,
        b.remainingBalance,
        statusLabel,
        paymentMethod,
      ]);
    });
  }

  // TOTAL Row
  data.push([
    'TOTAL KESELURUHAN',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    totalHours,
    totalOmset,
    totalPaid,
    activeBookings.reduce((s, b) => s + b.amountPaidTotal, 0),
    totalRemaining,
    '',
    '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet(data);

  ws['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 22 },
    { wch: 16 },
    { wch: 14 },
    { wch: 24 },
    { wch: 16 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
    { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sewa Lapangan');
  XLSX.writeFile(wb, `Laporan_Sewa_Lapangan_${Date.now()}.xlsx`);
}

/**
 * Helper to format date into Indonesian standard header (e.g. "Jumat, 4 September 2026")
 */
function formatIndonesianDateHeader(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(d);
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Print & Export Court Bookings (Sewa Lapangan) to PDF from actual bookings, grouped by date
 */
export function printCourtBookingsPDF(
  periodLabel: string,
  bookings: CourtBooking[],
  startDate?: string,
  endDate?: string
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const activeBookings = bookings.filter((b) => b.status !== 'CANCELLED');
  const totalOmset = activeBookings.reduce((s, b) => s + b.totalAmount, 0);
  const totalRemaining = activeBookings.reduce((s, b) => s + b.remainingBalance, 0);
  const totalHours = activeBookings.reduce((s, b) => s + b.durationHours, 0);
  const lunasCount = activeBookings.filter((b) => b.status === 'SETTLED' || b.remainingBalance === 0).length;

  const sDate = startDate || '2000-01-01';
  const eDate = endDate || '2099-12-31';

  let dpCash = 0;
  let dpQris = 0;
  let dpCount = 0;

  let settleCash = 0;
  let settleQris = 0;
  let settleCount = 0;

  activeBookings.forEach((b) => {
    const items = getBookingPaymentItemsInPeriod(b, sDate, eDate);
    items.forEach((it) => {
      if (it.type === 'DP') {
        dpCount += 1;
        if (it.method === 'CASH') {
          dpCash += it.amount;
        } else {
          dpQris += it.amount;
        }
      } else if (it.type === 'PELUNASAN' || it.type === 'LUNAS_LANGSUNG') {
        settleCount += 1;
        if (it.method === 'CASH') {
          settleCash += it.amount;
        } else {
          settleQris += it.amount;
        }
      }
    });
  });

  const dpTotal = dpCash + dpQris;
  const settleTotal = settleCash + settleQris;
  const totalPaidCash = dpCash + settleCash;
  const totalPaidQris = dpQris + settleQris;
  const totalPaid = totalPaidCash + totalPaidQris;

  // Group by date (ascending)
  const groupedByDate: Record<string, CourtBooking[]> = {};
  activeBookings.forEach((b) => {
    const d = b.date || 'Lainnya';
    if (!groupedByDate[d]) groupedByDate[d] = [];
    groupedByDate[d].push(b);
  });

  const sortedDates = Object.keys(groupedByDate).sort();
  sortedDates.forEach((d) => {
    groupedByDate[d].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  });

  let globalRowNumber = 0;
  const tableRows = sortedDates.length > 0
    ? sortedDates
        .map((dateStr) => {
          const dateBookings = groupedByDate[dateStr];
          const dateHours = dateBookings.reduce((s, b) => s + b.durationHours, 0);
          const dateOmset = dateBookings.reduce((s, b) => s + b.totalAmount, 0);
          const dateRemaining = dateBookings.reduce((s, b) => s + b.remainingBalance, 0);
          const formattedDate = formatIndonesianDateHeader(dateStr);

          let dateDpCash = 0;
          let dateDpQris = 0;
          let dateSettleCash = 0;
          let dateSettleQris = 0;

          dateBookings.forEach((b) => {
            const items = getBookingPaymentItemsInPeriod(b, sDate, eDate);
            items.forEach((it) => {
              if (it.type === 'DP') {
                if (it.method === 'CASH') dateDpCash += it.amount;
                else dateDpQris += it.amount;
              } else if (it.type === 'PELUNASAN' || it.type === 'LUNAS_LANGSUNG') {
                if (it.method === 'CASH') dateSettleCash += it.amount;
                else dateSettleQris += it.amount;
              }
            });
          });

          const datePaidCash = dateDpCash + dateSettleCash;
          const datePaidQris = dateDpQris + dateSettleQris;
          const datePaid = datePaidCash + datePaidQris;

          const bookingRows = dateBookings
            .map((b, idx) => {
              globalRowNumber++;
              const isMember = b.memberType === 'MEMBER' || b.communityName?.includes('Member');
              const isLunas = b.status === 'SETTLED' || b.remainingBalance === 0;
              const cleanCourt = (b.courtName || '')
                .replace(/\s*\([^)]*VIP[^)]*\)/gi, '')
                .replace(/\s*\([^)]*Vinyl[^)]*\)/gi, '')
                .trim();
              const items = getBookingPaymentItemsInPeriod(b, sDate, eDate);
              const paidInPeriod = items.reduce((s, it) => s + it.amount, 0);
              const isPartial = Boolean(startDate && endDate && paidInPeriod !== b.amountPaidTotal);

              return `
            <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; font-size: 11px;">
              <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: center; color: #64748b;">${globalRowNumber}</td>
              <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: center; font-weight: 700; color: #0f172a; white-space: nowrap;">
                ${b.startTime} - ${b.endTime}
                <div style="font-size: 9px; color: #64748b; font-weight: normal;">(${b.durationHours} Jam)</div>
              </td>
              <td style="border: 1px solid #cbd5e1; padding: 5px 8px;">
                <div style="font-weight: 700; color: #0f172a;">${escapeHtml(b.customerName)}</div>
                ${b.communityName ? `<div style="font-size: 9px; color: #64748b;">${escapeHtml(b.communityName)}</div>` : ''}
              </td>
              <td style="border: 1px solid #cbd5e1; padding: 5px 8px; font-weight: 600; color: #0f172a;">
                ${escapeHtml(cleanCourt || b.courtName)}
              </td>
              <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: center;">
                <span style="display: inline-block; padding: 1.5px 6px; border-radius: 4px; font-size: 8.5px; font-weight: bold; ${
                  isMember
                    ? 'background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;'
                    : 'background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;'
                }">
                  ${isMember ? 'MEMBER' : 'INSIDENTIL'}
                </span>
              </td>
              <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: right; font-weight: 600; color: #334155;">
                Rp ${b.totalAmount.toLocaleString('id-ID')}
              </td>
              <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: right; font-weight: 700; color: #047857;">
                Rp ${paidInPeriod.toLocaleString('id-ID')}
                ${items.length > 0 ? `
                  <div style="font-size: 8px; margin-top: 2px; display: flex; flex-direction: column; gap: 1px; align-items: flex-end;">
                    ${items.map(it => `
                      <span style="display: inline-block; padding: 0.5px 3.5px; border-radius: 3px; font-weight: 700; white-space: nowrap; ${
                        it.method === 'CASH'
                          ? 'background: #fef3c7; color: #92400e; border: 1px solid #fde68a;'
                          : 'background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0;'
                      }">
                        ${it.type === 'DP' ? 'DP' : 'Pelunasan'}: ${it.method === 'CASH' ? 'Cash' : 'QRIS'} Rp ${it.amount.toLocaleString('id-ID')}
                      </span>
                    `).join('')}
                  </div>
                ` : ''}
                ${isPartial ? `<div style="font-size: 8px; color: #64748b; font-weight: normal; margin-top: 1px;">(Total Semua: Rp ${b.amountPaidTotal.toLocaleString('id-ID')})</div>` : ''}
              </td>
              <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: center;">
                <span style="font-weight: 700; font-size: 9.5px; color: ${isLunas ? '#059669' : '#d97706'};">
                  ${isLunas ? `✓ LUNAS<br><span style="font-size: 8px; font-weight: 600; color: #065f46;">Pelunasan: ${getBookingSettleDate(b)}</span>` : `DP (Sisa Rp ${b.remainingBalance.toLocaleString('id-ID')})`}
                </span>
              </td>
            </tr>
          `;
            })
            .join('');

          return `
          <!-- PEMBATAS TANGGAL -->
          <tr class="date-header-row" style="background-color: #ecfdf5; border-top: 2px solid #059669; border-bottom: 1.5px solid #10b981;">
            <td colspan="8" style="padding: 6px 10px; border: 1px solid #cbd5e1; border-top: 2px solid #059669;">
              <table style="width: 100%; border: none; border-collapse: collapse; background: transparent; margin: 0;">
                <tr style="background: transparent;">
                  <td style="border: none; padding: 0; font-size: 11.5px; font-weight: 800; color: #065f46; text-align: left;">
                    📅 ${formattedDate}
                  </td>
                  <td style="border: none; padding: 0; font-size: 10px; font-weight: 700; color: #047857; text-align: right;">
                    ${dateBookings.length} Booking &bull; ${dateHours} Jam &bull; Total: Rp ${dateOmset.toLocaleString('id-ID')} &bull; Masuk: Rp ${datePaid.toLocaleString('id-ID')}
                    <span style="font-size: 9px; font-weight: normal; color: #065f46; margin-left: 4px;">
                      (Cash: Rp ${datePaidCash.toLocaleString('id-ID')} &bull; QRIS: Rp ${datePaidQris.toLocaleString('id-ID')})
                    </span>
                    ${dateRemaining > 0 ? ` &bull; <span style="color: #b45309;">Sisa: Rp ${dateRemaining.toLocaleString('id-ID')}</span>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${bookingRows}
        `;
        })
        .join('')
    : `<tr><td colspan="8" style="text-align: center; padding: 16px; color: #94a3b8;">Belum ada data reservasi lapangan pada periode ini.</td></tr>`;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Laporan Sewa Lapangan - ${periodLabel}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            color: #0f172a;
            background: #fff;
          }
          .header-box {
            text-align: center;
            border-bottom: 2px solid #059669;
            padding-bottom: 10px;
            margin-bottom: 14px;
          }
          .title { font-size: 17px; font-weight: 900; color: #059669; margin: 0; letter-spacing: -0.3px; }
          .subtitle { font-size: 11px; color: #64748b; margin-top: 3px; font-weight: 600; }
          .summary-cards {
            display: flex;
            gap: 8px;
            margin-bottom: 14px;
            flex-wrap: wrap;
          }
          .summary-card {
            flex: 1;
            min-width: 120px;
            padding: 8px 10px;
            border-radius: 8px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
          }
          .summary-title { font-size: 9.5px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px; }
          .summary-val { font-size: 13.5px; font-weight: 900; color: #0f172a; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th {
            background-color: #059669;
            color: #ffffff;
            font-size: 10.5px;
            font-weight: 800;
            text-align: center;
            padding: 7px 5px;
            border: 1px solid #047857;
          }
          .date-header-row {
            page-break-after: avoid;
          }
          tr {
            page-break-inside: avoid;
          }
          .total-row {
            page-break-inside: avoid;
          }
          .total-row td {
            background-color: #0f172a;
            color: #ffffff;
            font-size: 11px;
            font-weight: 900;
            padding: 7px 6px;
            border: 1px solid #0f172a;
          }
          @media print {
            body { padding: 8px; }
            @page { margin: 10mm 8mm; size: auto; }
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <h1 class="title">LAPORAN SEWA LAPANGAN GOR</h1>
          <div class="subtitle">Periode: ${periodLabel} • Dicetak: ${new Date().toLocaleString('id-ID')}</div>
        </div>

        <div class="summary-cards">
          <div class="summary-card">
            <div class="summary-title">Total Reservasi</div>
            <div class="summary-val">${activeBookings.length} Booking</div>
            <div style="font-size: 8.5px; color: #64748b; font-weight: 600; margin-top: 2px;">${lunasCount} Lunas &bull; ${totalHours} Jam Main</div>
          </div>
          <div class="summary-card" style="background: #f0fdf4; border-color: #bbf7d0;">
            <div class="summary-title" style="color: #166534;">🟢 DP Masuk (${dpCount} Tim)</div>
            <div class="summary-val" style="color: #15803d;">Rp ${dpTotal.toLocaleString('id-ID')}</div>
            <div style="font-size: 8.5px; color: #166534; font-weight: 600; margin-top: 2px;">
              Cash: <strong>Rp ${dpCash.toLocaleString('id-ID')}</strong> &bull; QRIS: <strong>Rp ${dpQris.toLocaleString('id-ID')}</strong>
            </div>
          </div>
          <div class="summary-card" style="background: #eff6ff; border-color: #bfdbfe;">
            <div class="summary-title" style="color: #1e40af;">🔵 Pelunasan (${settleCount} Tim)</div>
            <div class="summary-val" style="color: #1d4ed8;">Rp ${settleTotal.toLocaleString('id-ID')}</div>
            <div style="font-size: 8.5px; color: #1e40af; font-weight: 600; margin-top: 2px;">
              Cash: <strong>Rp ${settleCash.toLocaleString('id-ID')}</strong> &bull; QRIS: <strong>Rp ${settleQris.toLocaleString('id-ID')}</strong>
            </div>
          </div>
          <div class="summary-card" style="background: #f8fafc; border-color: #cbd5e1;">
            <div class="summary-title" style="color: #0f172a;">💰 Total Masuk (Uang Riil)</div>
            <div class="summary-val" style="color: #059669;">Rp ${totalPaid.toLocaleString('id-ID')}</div>
            <div style="font-size: 8.5px; color: #334155; font-weight: 700; margin-top: 2px;">
              Cash: Rp ${totalPaidCash.toLocaleString('id-ID')} &bull; QRIS: Rp ${totalPaidQris.toLocaleString('id-ID')}
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Belum Lunas</div>
            <div class="summary-val" style="color: #d97706;">Rp ${totalRemaining.toLocaleString('id-ID')}</div>
            <div style="font-size: 8.5px; color: #b45309; font-weight: 600; margin-top: 2px;">Dari ${activeBookings.length - lunasCount} booking</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 28px;">No.</th>
              <th style="width: 95px;">Jadwal</th>
              <th>Nama Penyewa</th>
              <th style="width: 115px;">Lapangan</th>
              <th style="width: 80px;">Kategori</th>
              <th style="width: 90px;">Total Sewa</th>
              <th style="width: 110px;">Terbayar</th>
              <th style="width: 105px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            <tr class="total-row">
              <td colspan="3" style="text-align: center;">TOTAL KESELURUHAN</td>
              <td style="text-align: center;">${activeBookings.length} Booking</td>
              <td style="text-align: center;">${totalHours} Jam</td>
              <td style="text-align: right;">Rp ${totalOmset.toLocaleString('id-ID')}</td>
              <td style="text-align: right; color: #4ade80;">
                <div>Rp ${totalPaid.toLocaleString('id-ID')}</div>
                <div style="font-size: 8px; font-weight: bold; color: #fde68a; margin-top: 2px;">
                  Cash: Rp ${totalPaidCash.toLocaleString('id-ID')} &bull; QRIS: Rp ${totalPaidQris.toLocaleString('id-ID')}
                </div>
              </td>
              <td style="text-align: center; color: #fde047;">${totalRemaining > 0 ? `Sisa Rp ${totalRemaining.toLocaleString('id-ID')}` : 'LUNAS'}</td>
            </tr>
          </tbody>
        </table>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * Print & Export Combined Daily Financial Report (Kantin POS + Sewa Lapangan) to PDF
 */
export function printCombinedReportPDF(
  periodLabel: string,
  transactions: Transaction[],
  bookings: CourtBooking[],
  startDate?: string,
  endDate?: string
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const validTx = transactions.filter((t) => t.status === 'COMPLETED');
  const activeBookings = bookings.filter((b) => b.status !== 'CANCELLED');

  let s = startDate;
  let e = endDate;

  if (!s || !e) {
    const allDates: string[] = [];
    validTx.forEach((t) => {
      if (t.createdAt) allDates.push(t.createdAt.split('T')[0]);
    });
    activeBookings.forEach((b) => {
      if (b.date) allDates.push(b.date);
    });
    allDates.sort();
    s = allDates[0] || getJakartaToday();
    e = allDates[allDates.length - 1] || s;
  }

  const dateList: string[] = [];
  try {
    const [sy, sm, sd] = s.split('-').map(Number);
    const [ey, em, ed] = e.split('-').map(Number);
    const curr = new Date(sy, sm - 1, sd);
    const endObj = new Date(ey, em - 1, ed);

    while (curr <= endObj) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      dateList.push(`${y}-${m}-${d}`);
      curr.setDate(curr.getDate() + 1);
    }
  } catch {
    dateList.push(s);
  }

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  let totalDpCash = 0;
  let totalDpQris = 0;
  let totalDpMasuk = 0;
  let totalKanCash = 0;
  let totalKanQris = 0;
  let totalKan = 0;
  let totalLapCash = 0;
  let totalLapQris = 0;
  let totalLap = 0;
  let grandTotal = 0;

  const rowsHtml = dateList
    .map((dStr, idx) => {
      const [dy, dm, dd] = dStr.split('-').map(Number);
      const dObj = new Date(dy, dm - 1, dd);
      const hari = dayNames[dObj.getDay()];
      const tanggal = `${String(dd).padStart(2, '0')}/${String(dm).padStart(2, '0')}/${dy}`;

      // 1. DP MASUK (CASH & QRIS) & 2. LAPANGAN (PELUNASAN)
      let dpCash = 0;
      let dpQris = 0;
      let lapCash = 0;
      let lapQris = 0;

      activeBookings.forEach((b) => {
        const items = getBookingPaymentItemsInPeriod(b, dStr, dStr);
        items.forEach((it) => {
          if (it.type === 'DP') {
            if (it.method === 'CASH') {
              dpCash += it.amount;
            } else {
              dpQris += it.amount;
            }
          } else if (it.type === 'PELUNASAN' || it.type === 'LUNAS_LANGSUNG') {
            if (it.method === 'CASH') {
              lapCash += it.amount;
            } else {
              lapQris += it.amount;
            }
          }
        });
      });

      const dpTotal = dpCash + dpQris;
      const lapTotal = lapCash + lapQris;

      // 3. KANTIN
      let kanCash = 0;
      let kanQris = 0;

      validTx.forEach((t) => {
        if (t.createdAt.split('T')[0] === dStr) {
          if (t.paymentMethod === 'CASH') {
            kanCash += t.grandTotal;
          } else if (t.paymentMethod === 'QRIS') {
            kanQris += t.grandTotal;
          }
        }
      });

      const kanTotal = kanCash + kanQris;
      const totalHarian = dpTotal + kanTotal + lapTotal;

      totalDpCash += dpCash;
      totalDpQris += dpQris;
      totalDpMasuk += dpTotal;
      totalKanCash += kanCash;
      totalKanQris += kanQris;
      totalKan += kanTotal;
      totalLapCash += lapCash;
      totalLapQris += lapQris;
      totalLap += lapTotal;
      grandTotal += totalHarian;

      const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

      return `
        <tr class="${idx % 2 === 0 ? 'row-even' : 'row-odd'}">
          <td class="col-day">${hari}</td>
          <td class="col-date">${tanggal}</td>
          <td class="col-money">${fmt(dpCash)}</td>
          <td class="col-money">${fmt(dpQris)}</td>
          <td class="col-money" style="font-weight: 700; color: #15803d;">${fmt(dpTotal)}</td>
          <td class="col-money">${fmt(kanCash)}</td>
          <td class="col-money">${fmt(kanQris)}</td>
          <td class="col-money" style="font-weight: 700; color: #b92b10;">${fmt(kanTotal)}</td>
          <td class="col-money">${fmt(lapCash)}</td>
          <td class="col-money">${fmt(lapQris)}</td>
          <td class="col-money" style="font-weight: 700; color: #047857;">${fmt(lapTotal)}</td>
          <td class="col-total">${fmt(totalHarian)}</td>
        </tr>
      `;
    })
    .join('');

  const grandCash = totalDpCash + totalKanCash + totalLapCash;
  const grandQris = totalDpQris + totalKanQris + totalLapQris;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Laporan Rekapitulasi Omset - ${periodLabel}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 8mm 6mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            margin: 0;
            padding: 12px 14px;
            color: #0f172a;
            background: #fff;
          }
          .header-box {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2.5px solid #0f2b48;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .title {
            font-size: 16px;
            font-weight: 900;
            color: #0f2b48;
            margin: 0;
            letter-spacing: -0.2px;
          }
          .subtitle {
            font-size: 10.5px;
            color: #475569;
            margin-top: 2px;
            font-weight: 600;
          }
          .print-info {
            font-size: 9.5px;
            color: #64748b;
            text-align: right;
          }
          .summary-cards {
            display: flex;
            gap: 8px;
            margin-bottom: 10px;
          }
          .summary-card {
            flex: 1;
            padding: 6px 10px;
            border-radius: 6px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
          }
          .summary-title {
            font-size: 8.5px;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .summary-val {
            font-size: 13px;
            font-weight: 900;
            color: #0f172a;
            margin-top: 1px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5px;
          }
          th {
            background-color: #0f2b48;
            color: #ffffff;
            font-size: 9px;
            font-weight: 800;
            text-align: center;
            padding: 5px 3px;
            border: 1px solid #1e3a5f;
            letter-spacing: 0.3px;
          }
          td {
            border: 1px solid #cbd5e1;
            padding: 4px 4px;
          }
          .col-day { text-align: center; font-weight: 600; color: #334155; }
          .col-date { text-align: center; font-weight: 600; color: #334155; }
          .col-money { text-align: right; font-variant-numeric: tabular-nums; }
          .col-total { text-align: right; font-weight: 800; color: #0f172a; }
          .row-even { background-color: #ffffff; }
          .row-odd { background-color: #f8fafc; }
          .total-row {
            background-color: #70ad47 !important;
            color: #ffffff !important;
          }
          .total-row td {
            border: 1px solid #5a9335;
            padding: 6px 4px;
            color: #ffffff !important;
            font-weight: 900;
            font-size: 10px;
          }
          @media print {
            body { padding: 0; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <h1 class="title">LAPORAN REKAPITULASI OMSET (KANTIN & SEWA LAPANGAN)</h1>
            <div class="subtitle">Periode: ${periodLabel}</div>
          </div>
          <div class="print-info">
            Dicetak: ${new Date().toLocaleString('id-ID')}
          </div>
        </div>

        <div class="summary-cards">
          <div class="summary-card" style="background: #f0fdf4; border-color: #bbf7d0;">
            <div class="summary-title" style="color: #166534;">🟢 TOTAL DP MASUK</div>
            <div class="summary-val" style="color: #15803d;">Rp ${totalDpMasuk.toLocaleString('id-ID')}</div>
            <div style="font-size: 8px; color: #14532d; margin-top: 1px;">Cash: Rp ${totalDpCash.toLocaleString('id-ID')} + QRIS: Rp ${totalDpQris.toLocaleString('id-ID')}</div>
          </div>
          <div class="summary-card" style="background: #fef2f2; border-color: #fecaca;">
            <div class="summary-title" style="color: #991b1b;">🏪 TOTAL KANTIN / TOKO</div>
            <div class="summary-val" style="color: #b91c1c;">Rp ${totalKan.toLocaleString('id-ID')}</div>
            <div style="font-size: 8px; color: #7f1d1d; margin-top: 1px;">Cash: Rp ${totalKanCash.toLocaleString('id-ID')} + QRIS: Rp ${totalKanQris.toLocaleString('id-ID')}</div>
          </div>
          <div class="summary-card" style="background: #eff6ff; border-color: #bfdbfe;">
            <div class="summary-title" style="color: #1e40af;">⚡ TOTAL PELUNASAN LAPANGAN</div>
            <div class="summary-val" style="color: #1d4ed8;">Rp ${totalLap.toLocaleString('id-ID')}</div>
            <div style="font-size: 8px; color: #1e3a8a; margin-top: 1px;">Cash: Rp ${totalLapCash.toLocaleString('id-ID')} + QRIS: Rp ${totalLapQris.toLocaleString('id-ID')}</div>
          </div>
          <div class="summary-card" style="background: #0f172a; border-color: #0f172a; color: #ffffff;">
            <div class="summary-title" style="color: #cbd5e1;">⭐ GRAND TOTAL KESELURUHAN</div>
            <div class="summary-val" style="color: #4ade80;">Rp ${grandTotal.toLocaleString('id-ID')}</div>
            <div style="font-size: 8px; color: #cbd5e1; margin-top: 1px;">Fisik Cash: Rp ${grandCash.toLocaleString('id-ID')} + QRIS: Rp ${grandQris.toLocaleString('id-ID')}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th rowspan="2" style="width: 55px;">HARI</th>
              <th rowspan="2" style="width: 68px;">TANGGAL</th>
              <th colspan="3">DP MASUK</th>
              <th colspan="3">KANTIN</th>
              <th colspan="3">PELUNASAN LAPANGAN</th>
              <th rowspan="2" style="width: 90px;">TOTAL</th>
            </tr>
            <tr>
              <th style="width: 65px;">CASH</th>
              <th style="width: 65px;">QRIS</th>
              <th style="width: 72px;">TOTAL</th>
              <th style="width: 65px;">CASH</th>
              <th style="width: 65px;">QRIS</th>
              <th style="width: 72px;">TOTAL</th>
              <th style="width: 65px;">CASH</th>
              <th style="width: 65px;">QRIS</th>
              <th style="width: 72px;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr class="total-row">
              <td colspan="2" style="text-align: center; letter-spacing: 0.5px;">TOTAL</td>
              <td style="text-align: right;">Rp ${totalDpCash.toLocaleString('id-ID')}</td>
              <td style="text-align: right;">Rp ${totalDpQris.toLocaleString('id-ID')}</td>
              <td style="text-align: right;">Rp ${totalDpMasuk.toLocaleString('id-ID')}</td>
              <td style="text-align: right;">Rp ${totalKanCash.toLocaleString('id-ID')}</td>
              <td style="text-align: right;">Rp ${totalKanQris.toLocaleString('id-ID')}</td>
              <td style="text-align: right;">Rp ${totalKan.toLocaleString('id-ID')}</td>
              <td style="text-align: right;">Rp ${totalLapCash.toLocaleString('id-ID')}</td>
              <td style="text-align: right;">Rp ${totalLapQris.toLocaleString('id-ID')}</td>
              <td style="text-align: right;">Rp ${totalLap.toLocaleString('id-ID')}</td>
              <td style="text-align: right;">Rp ${grandTotal.toLocaleString('id-ID')}</td>
            </tr>
          </tbody>
        </table>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * Print & Export Combined Daily Financial Report (Kantin POS + Sewa Lapangan) to Excel
 */
export function exportCombinedReportToExcel(
  periodLabel: string,
  transactions: Transaction[],
  bookings: CourtBooking[],
  startDate?: string,
  endDate?: string
) {
  const validTx = transactions.filter((t) => t.status === 'COMPLETED');
  const activeBookings = bookings.filter((b) => b.status !== 'CANCELLED');

  let s = startDate;
  let e = endDate;
  if (!s || !e) {
    const allDates: string[] = [];
    validTx.forEach((t) => { if (t.createdAt) allDates.push(t.createdAt.split('T')[0]); });
    activeBookings.forEach((b) => { if (b.date) allDates.push(b.date); });
    allDates.sort();
    s = allDates[0] || getJakartaToday();
    e = allDates[allDates.length - 1] || s;
  }

  const dateList: string[] = [];
  try {
    const [sy, sm, sd] = s.split('-').map(Number);
    const [ey, em, ed] = e.split('-').map(Number);
    const curr = new Date(sy, sm - 1, sd);
    const endObj = new Date(ey, em - 1, ed);
    while (curr <= endObj) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      dateList.push(`${y}-${m}-${d}`);
      curr.setDate(curr.getDate() + 1);
    }
  } catch {
    dateList.push(s);
  }

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  let totalDpCash = 0;
  let totalDpQris = 0;
  let totalDpMasuk = 0;
  let totalKanCash = 0;
  let totalKanQris = 0;
  let totalKan = 0;
  let totalLapCash = 0;
  let totalLapQris = 0;
  let totalLap = 0;
  let grandTotal = 0;

  const excelRows: any[][] = [
    ['LAPORAN REKAPITULASI OMSET (KANTIN & SEWA LAPANGAN)'],
    [`Periode: ${periodLabel}`, '', '', '', '', '', '', '', '', '', '', ''],
    ['HARI', 'TANGGAL', 'DP MASUK', '', '', 'KANTIN', '', '', 'PELUNASAN LAPANGAN', '', '', 'TOTAL'],
    ['', '', 'CASH', 'QRIS', 'TOTAL', 'CASH', 'QRIS', 'TOTAL', 'CASH', 'QRIS', 'TOTAL', ''],
  ];

  dateList.forEach((dStr) => {
    const [dy, dm, dd] = dStr.split('-').map(Number);
    const dObj = new Date(dy, dm - 1, dd);
    const hari = dayNames[dObj.getDay()];
    const tanggal = `${String(dd).padStart(2, '0')}/${String(dm).padStart(2, '0')}/${dy}`;

    let dpCash = 0;
    let dpQris = 0;
    let lapCash = 0;
    let lapQris = 0;

    activeBookings.forEach((b) => {
      const items = getBookingPaymentItemsInPeriod(b, dStr, dStr);
      items.forEach((it) => {
        if (it.type === 'DP') {
          if (it.method === 'CASH') dpCash += it.amount;
          else dpQris += it.amount;
        } else if (it.type === 'PELUNASAN' || it.type === 'LUNAS_LANGSUNG') {
          if (it.method === 'CASH') lapCash += it.amount;
          else lapQris += it.amount;
        }
      });
    });

    const dpTotal = dpCash + dpQris;
    const lapTotal = lapCash + lapQris;

    let kanCash = 0;
    let kanQris = 0;
    validTx.forEach((t) => {
      if (t.createdAt.split('T')[0] === dStr) {
        if (t.paymentMethod === 'CASH') kanCash += t.grandTotal;
        else if (t.paymentMethod === 'QRIS') kanQris += t.grandTotal;
      }
    });

    const kanTotal = kanCash + kanQris;
    const totalHarian = dpTotal + kanTotal + lapTotal;

    totalDpCash += dpCash;
    totalDpQris += dpQris;
    totalDpMasuk += dpTotal;
    totalKanCash += kanCash;
    totalKanQris += kanQris;
    totalKan += kanTotal;
    totalLapCash += lapCash;
    totalLapQris += lapQris;
    totalLap += lapTotal;
    grandTotal += totalHarian;

    excelRows.push([
      hari,
      tanggal,
      dpCash,
      dpQris,
      dpTotal,
      kanCash,
      kanQris,
      kanTotal,
      lapCash,
      lapQris,
      lapTotal,
      totalHarian,
    ]);
  });

  // Total bar
  excelRows.push([
    'TOTAL',
    '',
    totalDpCash,
    totalDpQris,
    totalDpMasuk,
    totalKanCash,
    totalKanQris,
    totalKan,
    totalLapCash,
    totalLapQris,
    totalLap,
    grandTotal,
  ]);

  const ws = XLSX.utils.aoa_to_sheet(excelRows);

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },
    { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } },
    { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } },
    { s: { r: 2, c: 2 }, e: { r: 2, c: 4 } }, // DP MASUK (CASH, QRIS, TOTAL)
    { s: { r: 2, c: 5 }, e: { r: 2, c: 7 } }, // KANTIN (CASH, QRIS, TOTAL)
    { s: { r: 2, c: 8 }, e: { r: 2, c: 10 } }, // LAPANGAN (CASH, QRIS, TOTAL)
    { s: { r: 2, c: 11 }, e: { r: 3, c: 11 } }, // TOTAL
    { s: { r: excelRows.length - 1, c: 0 }, e: { r: excelRows.length - 1, c: 1 } },
  ];

  ws['!cols'] = [
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 15 },
    { wch: 14 },
    { wch: 14 },
    { wch: 15 },
    { wch: 14 },
    { wch: 14 },
    { wch: 15 },
    { wch: 18 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Gabungan');
  XLSX.writeFile(wb, `Laporan_Gabungan_POS_Lapangan_${Date.now()}.xlsx`);
}

/**
 * Backward-compatible exports
 */
export const exportSalesToExcel = exportKantinToExcel;
export const printSalesPDF = printKantinPDF;
