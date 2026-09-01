import * as XLSX from 'xlsx';
import { Transaction } from '@/types/pos';
import { formatRupiah } from './utils';

export interface DetailKantinRow {
  no: number;
  barang: string;
  dusIsi: string | number;
  terjual: number;
  harga: number;
  modal: number;
  cuanPerPcs: number;
  omset: number;
  cuanTotal: number;
}

export const SAMPLE_DETAIL_KANTIN: DetailKantinRow[] = [
  { no: 1, barang: 'Vit 1500ml', dusIsi: 12, terjual: 282, harga: 8000, modal: 2708, cuanPerPcs: 5292, omset: 2256000, cuanTotal: 1492250 },
  { no: 2, barang: 'Vit 600ml', dusIsi: 24, terjual: 305, harga: 5000, modal: 1292, cuanPerPcs: 3708, omset: 1525000, cuanTotal: 1131042 },
  { no: 3, barang: 'Teh Pucuk', dusIsi: 24, terjual: 94, harga: 5000, modal: 2563, cuanPerPcs: 2438, omset: 470000, cuanTotal: 229125 },
  { no: 4, barang: 'Isoplus', dusIsi: 12, terjual: 34, harga: 5000, modal: 2292, cuanPerPcs: 2708, omset: 170000, cuanTotal: 92083 },
  { no: 5, barang: 'Pocari', dusIsi: 24, terjual: 113, harga: 10000, modal: 6625, cuanPerPcs: 3375, omset: 1130000, cuanTotal: 381375 },
  { no: 6, barang: 'Milku', dusIsi: 12, terjual: 53, harga: 5000, modal: 2792, cuanPerPcs: 2208, omset: 265000, cuanTotal: 117042 },
  { no: 7, barang: 'Frestea', dusIsi: 12, terjual: 14, harga: 6000, modal: 3167, cuanPerPcs: 2833, omset: 84000, cuanTotal: 39667 },
  { no: 8, barang: 'Coca Cola', dusIsi: 12, terjual: 11, harga: 6000, modal: 2958, cuanPerPcs: 3042, omset: 66000, cuanTotal: 33458 },
  { no: 9, barang: 'Golda', dusIsi: 12, terjual: 18, harga: 5000, modal: 2833, cuanPerPcs: 2167, omset: 90000, cuanTotal: 39000 },
  { no: 10, barang: 'Hydrococo', dusIsi: 24, terjual: 23, harga: 10000, modal: 5875, cuanPerPcs: 4125, omset: 230000, cuanTotal: 94875 },
  { no: 11, barang: 'Nipis Madu', dusIsi: 12, terjual: 21, harga: 8000, modal: 3292, cuanPerPcs: 4708, omset: 168000, cuanTotal: 98875 },
  { no: 12, barang: 'Indomie + Telor', dusIsi: 40, terjual: 32, harga: 12000, modal: 4525, cuanPerPcs: 7475, omset: 384000, cuanTotal: 239200 },
  { no: 13, barang: 'Indomie', dusIsi: 40, terjual: 23, harga: 8000, modal: 2900, cuanPerPcs: 5100, omset: 184000, cuanTotal: 117300 },
  { no: 14, barang: 'Cock Bijian', dusIsi: 1, terjual: 37, harga: 15000, modal: 12000, cuanPerPcs: 3000, omset: 555000, cuanTotal: 111000 },
  { no: 15, barang: 'Cock 1 Slop', dusIsi: 12, terjual: 1, harga: 140000, modal: 130000, cuanPerPcs: 10000, omset: 140000, cuanTotal: 10000 },
  { no: 16, barang: 'Kopi', dusIsi: 10, terjual: 35, harga: 5000, modal: 3500, cuanPerPcs: 1500, omset: 175000, cuanTotal: 52500 },
  { no: 17, barang: 'Beng Beng', dusIsi: 17, terjual: 32, harga: 5000, modal: 2300, cuanPerPcs: 2700, omset: 160000, cuanTotal: 86400 },
  { no: 18, barang: 'Tango Waffle', dusIsi: 12, terjual: 14, harga: 5000, modal: 1900, cuanPerPcs: 3100, omset: 70000, cuanTotal: 43400 },
  { no: 19, barang: 'Taro', dusIsi: 10, terjual: 26, harga: 4000, modal: 1900, cuanPerPcs: 2100, omset: 104000, cuanTotal: 54600 },
  { no: 20, barang: 'Qtela', dusIsi: 10, terjual: 14, harga: 4000, modal: 1800, cuanPerPcs: 2200, omset: 56000, cuanTotal: 30800 },
  { no: 21, barang: 'Chitato', dusIsi: 10, terjual: 28, harga: 4000, modal: 1700, cuanPerPcs: 2300, omset: 112000, cuanTotal: 64400 },
  { no: 22, barang: 'Grip', dusIsi: 1, terjual: 4, harga: 8000, modal: 2743, cuanPerPcs: 5257, omset: 32000, cuanTotal: 21028 },
  { no: 23, barang: 'Telur', dusIsi: 1, terjual: 2, harga: 4000, modal: 1625, cuanPerPcs: 2375, omset: 8000, cuanTotal: 4750 },
  { no: 24, barang: 'Sewa Raket', dusIsi: '-', terjual: 2, harga: 20000, modal: 0, cuanPerPcs: 20000, omset: 40000, cuanTotal: 40000 },
];

/**
 * Export to Native Microsoft Excel (.xlsx) exactly matching the user's template
 */
export function exportSalesToExcel(
  periodName: string = 'Detail Kantin',
  rows: DetailKantinRow[] = SAMPLE_DETAIL_KANTIN
) {
  const totalOmset = rows.reduce((s, r) => s + r.omset, 0);
  const totalCuan = rows.reduce((s, r) => s + r.cuanTotal, 0);

  // 1. Build Header & Data Array
  const data: any[][] = [
    ['DETAIL KANTIN'], // Title row (Row 1)
    [], // Blank spacing
    ['No.', 'Barang', '1 dus isi', 'Terjual', 'Harga', 'Modal', 'Cuan / Botol', 'Omset', 'Cuan'], // Headers (Row 3)
  ];

  // 2. Add product rows
  rows.forEach((r) => {
    data.push([
      r.no,
      r.barang,
      r.dusIsi,
      r.terjual,
      r.harga,
      r.modal,
      r.cuanPerPcs,
      r.omset,
      r.cuanTotal,
    ]);
  });

  // 3. Add TOTAL row
  data.push([
    'TOTAL',
    '',
    '',
    '',
    '',
    '',
    '',
    totalOmset,
    totalCuan,
  ]);

  // 4. Blank row
  data.push([]);

  // 5. Add Keuntungan Bersih highlight row
  data.push([
    '',
    '',
    '',
    '',
    '',
    '',
    'Keuntungan Bersih',
    totalCuan,
    '',
  ]);

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // No.
    { wch: 22 }, // Barang
    { wch: 12 }, // 1 dus isi
    { wch: 10 }, // Terjual
    { wch: 14 }, // Harga
    { wch: 14 }, // Modal
    { wch: 14 }, // Cuan / Botol
    { wch: 16 }, // Omset
    { wch: 16 }, // Cuan
  ];

  // Merge Title Row across all columns (A1:I1)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, // DETAIL KANTIN
    { s: { r: rows.length + 3, c: 0 }, e: { r: rows.length + 3, c: 6 } }, // TOTAL
    { s: { r: rows.length + 5, c: 6 }, e: { r: rows.length + 5, c: 7 } }, // Keuntungan Bersih
  ];

  // Create workbook and append sheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'DETAIL KANTIN');

  // Trigger browser download of native .xlsx
  XLSX.writeFile(wb, `DETAIL_KANTIN_${Date.now()}.xlsx`);
}

/**
 * Print & Export to PDF
 */
export function printSalesPDF(
  periodName: string = 'Detail Kantin',
  summary?: any,
  transactions?: Transaction[],
  categoriesBreakdown?: any[]
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const rows = SAMPLE_DETAIL_KANTIN;
  const totalOmset = rows.reduce((s, r) => s + r.omset, 0);
  const totalCuan = rows.reduce((s, r) => s + r.cuanTotal, 0);

  const tableRows = rows
    .map(
      (r, idx) => `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'}; font-size: 11px;">
        <td style="border: 1px solid #d1d5db; padding: 6px; text-align: center;">${r.no}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px 8px; font-weight: 600;">${r.barang}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px; text-align: center;">${r.dusIsi}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px; text-align: center; font-weight: bold;">${r.terjual}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px; text-align: right;">Rp ${r.harga.toLocaleString('id-ID')}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px; text-align: right;">Rp ${r.modal.toLocaleString('id-ID')}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px; text-align: right; color: #166534; font-weight: 600;">Rp ${r.cuanPerPcs.toLocaleString('id-ID')}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px; text-align: right; font-weight: bold;">Rp ${r.omset.toLocaleString('id-ID')}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px; text-align: right; font-weight: bold; color: #0f172a;">Rp ${r.cuanTotal.toLocaleString('id-ID')}</td>
      </tr>
    `
    )
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Detail Kantin - Laporan Penjualan</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #1e293b;
            background: #fff;
          }
          .title-header {
            background-color: #103b68;
            color: #ffffff;
            font-size: 16px;
            font-weight: 900;
            text-align: center;
            padding: 10px;
            letter-spacing: 1px;
          }
          .table-header {
            background-color: #66bb6a;
            color: #ffffff;
            font-size: 11px;
            font-weight: bold;
            text-align: center;
            padding: 8px 4px;
            border: 1px solid #4caf50;
          }
          .total-row {
            background-color: #103b68;
            color: #ffffff;
            font-size: 12px;
            font-weight: 900;
            padding: 8px;
          }
          .cuan-box {
            background-color: #ffff00;
            color: #000000;
            font-weight: 900;
            font-size: 12px;
            padding: 8px;
            border: 1px solid #eab308;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          @media print {
            body { padding: 5px; }
          }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <td colspan="9" class="title-header">DETAIL KANTIN</td>
          </tr>
          <tr>
            <th class="table-header" style="width: 30px;">No.</th>
            <th class="table-header">Barang</th>
            <th class="table-header" style="width: 55px;">1 dus isi</th>
            <th class="table-header" style="width: 50px;">Terjual</th>
            <th class="table-header" style="width: 75px;">Harga</th>
            <th class="table-header" style="width: 75px;">Modal</th>
            <th class="table-header" style="width: 75px;">Cuan / Botol</th>
            <th class="table-header" style="width: 85px;">Omset</th>
            <th class="table-header" style="width: 85px;">Cuan</th>
          </tr>
          ${tableRows}
          <tr>
            <td colspan="7" class="total-row" style="text-align: center;">TOTAL</td>
            <td class="total-row" style="text-align: right;">Rp ${totalOmset.toLocaleString('id-ID')}</td>
            <td class="total-row" style="text-align: right;">Rp ${totalCuan.toLocaleString('id-ID')}</td>
          </tr>
          <tr><td colspan="9" style="height: 10px;"></td></tr>
          <tr>
            <td colspan="6"></td>
            <td colspan="2" class="cuan-box" style="text-align: center;">Keuntungan Bersih</td>
            <td class="cuan-box" style="text-align: right;">Rp ${totalCuan.toLocaleString('id-ID')}</td>
          </tr>
        </table>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
