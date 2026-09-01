import * as XLSX from 'xlsx';
import { Transaction } from '@/types/pos';
import { CourtBooking } from '@/types/booking';

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

  validTx.forEach((tx) => {
    tx.items.forEach((item) => {
      const key = item.product.id || item.product.name;
      const price = item.product.price;
      const cost = item.product.costPrice || 0;
      const cuanPerUnit = Math.max(0, price - cost);

      if (!itemMap[key]) {
        itemMap[key] = {
          name: item.product.name,
          category: item.product.category || 'Lainnya',
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
  const totalTx = transactions.filter((t) => t.status === 'COMPLETED').length;

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
          <div class="subtitle">Periode: ${periodLabel} • Dicetak: ${new Date().toLocaleString('id-ID')}</div>
        </div>

        <div class="summary-cards">
          <div class="summary-card">
            <div class="summary-title">Total Transaksi</div>
            <div class="summary-val">${totalTx} Nota</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Total Produk Terjual</div>
            <div class="summary-val">${totalTerjual} pcs</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Total Omzet Penjualan</div>
            <div class="summary-val" style="color: #b92b10;">Rp ${totalOmset.toLocaleString('id-ID')}</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Total Keuntungan Bersih</div>
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
              <td colspan="3" style="text-align: center;">TOTAL KESELURUHAN</td>
              <td style="text-align: center;">${totalTerjual} pcs</td>
              <td colspan="2"></td>
              <td style="text-align: right;">Rp ${totalOmset.toLocaleString('id-ID')}</td>
              <td style="text-align: right; color: #4ade80;">Rp ${totalCuan.toLocaleString('id-ID')}</td>
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
  bookings: CourtBooking[]
) {
  const activeBookings = bookings.filter((b) => b.status !== 'CANCELLED');
  const totalOmset = activeBookings.reduce((s, b) => s + b.totalAmount, 0);
  const totalPaid = activeBookings.reduce((s, b) => s + b.amountPaidTotal, 0);
  const totalRemaining = activeBookings.reduce((s, b) => s + b.remainingBalance, 0);
  const totalHours = activeBookings.reduce((s, b) => s + b.durationHours, 0);

  const data: (string | number)[][] = [
    [`LAPORAN SEWA LAPANGAN GOR - ${periodLabel.toUpperCase()}`],
    [`Total Booking: ${activeBookings.length} Reservasi | Total Jam Main: ${totalHours} Jam`],
    [],
    [
      'No.',
      'Kode Booking',
      'Tanggal',
      'Nama Pemesan',
      'No. WhatsApp',
      'Kategori',
      'Lapangan',
      'Jam Main',
      'Durasi (Jam)',
      'Total Tarif (Rp)',
      'Sudah Bayar (Rp)',
      'Sisa Tagihan (Rp)',
      'Status',
      'Metode Bayar',
    ],
  ];

  if (activeBookings.length === 0) {
    data.push(['-', 'Belum ada data sewa lapangan pada periode ini', '-', '-', '-', '-', '-', '-', 0, 0, 0, 0, '-', '-']);
  } else {
    activeBookings.forEach((b, idx) => {
      const isMember = b.memberType === 'MEMBER' || b.communityName?.includes('Member');
      const kategori = isMember ? 'Member' : 'Insidentil';
      const statusLabel = b.status === 'SETTLED' ? 'LUNAS' : b.status === 'DP_PAID' ? 'DP' : b.status;
      const paymentMethod = b.settlementPaymentMethod || b.dpPaymentMethod || '-';

      data.push([
        idx + 1,
        b.bookingCode,
        b.date,
        b.customerName,
        b.phone,
        kategori,
        b.courtName,
        `${b.startTime} - ${b.endTime}`,
        b.durationHours,
        b.totalAmount,
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
    totalHours,
    totalOmset,
    totalPaid,
    totalRemaining,
    '',
    '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet(data);

  ws['!cols'] = [
    { wch: 6 },
    { wch: 18 },
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
 * Print & Export Court Bookings (Sewa Lapangan) to PDF from actual bookings
 */
export function printCourtBookingsPDF(
  periodLabel: string,
  bookings: CourtBooking[]
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const activeBookings = bookings.filter((b) => b.status !== 'CANCELLED');
  const totalOmset = activeBookings.reduce((s, b) => s + b.totalAmount, 0);
  const totalPaid = activeBookings.reduce((s, b) => s + b.amountPaidTotal, 0);
  const totalRemaining = activeBookings.reduce((s, b) => s + b.remainingBalance, 0);
  const totalHours = activeBookings.reduce((s, b) => s + b.durationHours, 0);
  const lunasCount = activeBookings.filter((b) => b.status === 'SETTLED' || b.remainingBalance === 0).length;

  const tableRows = activeBookings.length > 0
    ? activeBookings
        .map((b, idx) => {
          const isMember = b.memberType === 'MEMBER' || b.communityName?.includes('Member');
          const isLunas = b.status === 'SETTLED' || b.remainingBalance === 0;
          return `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; font-size: 11px;">
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; font-family: monospace; font-weight: bold;">${escapeHtml(b.bookingCode)}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${b.date}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-weight: bold; color: #0f172a;">${escapeHtml(b.customerName)}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">
            <span style="display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; ${isMember ? 'background: #dbeafe; color: #1e40af;' : 'background: #f1f5f9; color: #475569;'}">
              ${isMember ? 'MEMBER' : 'INSIDENTIL'}
            </span>
          </td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${escapeHtml(b.courtName)}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${b.startTime}-${b.endTime} (${b.durationHours}j)</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; font-weight: bold;">Rp ${b.totalAmount.toLocaleString('id-ID')}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; font-weight: bold; color: #059669;">Rp ${b.amountPaidTotal.toLocaleString('id-ID')}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">
            <span style="font-weight: bold; color: ${isLunas ? '#059669' : '#d97706'};">
              ${isLunas ? 'LUNAS' : `DP (Sisa Rp ${b.remainingBalance.toLocaleString('id-ID')})`}
            </span>
          </td>
        </tr>
      `;
        })
        .join('')
    : `<tr><td colspan="10" style="text-align: center; padding: 16px; color: #94a3b8;">Belum ada data reservasi lapangan pada periode ini.</td></tr>`;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Laporan Sewa Lapangan - ${periodLabel}</title>
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
            border-bottom: 2px solid #059669;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .title { font-size: 18px; font-weight: 900; color: #059669; margin: 0; }
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
            background-color: #059669;
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
            text-align: center;
            padding: 8px 6px;
            border: 1px solid #047857;
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
          <h1 class="title">LAPORAN SEWA LAPANGAN GOR</h1>
          <div class="subtitle">Periode: ${periodLabel} • Dicetak: ${new Date().toLocaleString('id-ID')}</div>
        </div>

        <div class="summary-cards">
          <div class="summary-card">
            <div class="summary-title">Total Reservasi</div>
            <div class="summary-val">${activeBookings.length} Booking (${lunasCount} Lunas)</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Total Jam Main</div>
            <div class="summary-val">${totalHours} Jam</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Total Pendapatan Masuk</div>
            <div class="summary-val" style="color: #059669;">Rp ${totalPaid.toLocaleString('id-ID')}</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Sisa Piutang / Belum Lunas</div>
            <div class="summary-val" style="color: #d97706;">Rp ${totalRemaining.toLocaleString('id-ID')}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 25px;">No.</th>
              <th style="width: 95px;">Kode</th>
              <th style="width: 75px;">Tanggal</th>
              <th>Nama Penyewa</th>
              <th style="width: 80px;">Kategori</th>
              <th>Lapangan</th>
              <th style="width: 100px;">Jadwal</th>
              <th style="width: 90px;">Total Sewa</th>
              <th style="width: 90px;">Terbayar</th>
              <th style="width: 95px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            <tr class="total-row">
              <td colspan="6" style="text-align: center;">TOTAL KESELURUHAN</td>
              <td style="text-align: center;">${totalHours} Jam</td>
              <td style="text-align: right;">Rp ${totalOmset.toLocaleString('id-ID')}</td>
              <td style="text-align: right; color: #4ade80;">Rp ${totalPaid.toLocaleString('id-ID')}</td>
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
 * Backward-compatible exports
 */
export const exportSalesToExcel = exportKantinToExcel;
export const printSalesPDF = printKantinPDF;
