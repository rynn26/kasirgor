'use client';

import React from 'react';
import { Transaction } from '@/types/pos';
import { formatDate, formatRupiah } from '@/lib/utils';

interface ThermalReceiptProps {
  transaction: Transaction | null;
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
}

export const ThermalReceipt = React.forwardRef<HTMLDivElement, ThermalReceiptProps>(
  (
    {
      transaction,
      shopName = 'GOR SINYO ARENA',
      shopAddress = 'Jl. Perum. Pemda Graha Sukadami Blok A Raya',
      shopPhone = '0821-2478-428',
    },
    ref
  ) => {
    if (!transaction) return null;

    return (
      <div
        ref={ref}
        className="w-[78mm] max-w-[78mm] mx-auto p-4 bg-white text-black font-mono text-[11px] leading-tight print:p-0 print:w-full print:text-black print:bg-white"
        style={{ color: '#000' }}
      >
        {/* Header Toko */}
        <div className="text-center mb-3">
          <h2 className="text-sm font-black tracking-wider uppercase">{shopName}</h2>
          <p className="text-[10px] text-gray-700">{shopAddress}</p>
          <p className="text-[10px] text-gray-700">Telp: {shopPhone}</p>
        </div>

        {/* Separator */}
        <div className="border-b border-dashed border-gray-400 my-2"></div>

        {/* Info Transaksi */}
        <div className="space-y-0.5 text-[10px]">
          <div className="flex justify-between">
            <span>No. Nota:</span>
            <span className="font-bold">{transaction.invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Tanggal:</span>
            <span>{formatDate(transaction.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span>Kasir:</span>
            <span>{transaction.cashierName}</span>
          </div>
          {transaction.customerName && (
            <div className="flex justify-between">
              <span>Pelanggan:</span>
              <span>{transaction.customerName}</span>
            </div>
          )}
          {transaction.tableOrCourtNumber && (
            <div className="flex justify-between">
              <span>Meja/Lap:</span>
              <span className="font-semibold">{transaction.tableOrCourtNumber}</span>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="border-b border-dashed border-gray-400 my-2"></div>

        {/* List Item */}
        <div className="space-y-1.5 my-2">
          {transaction.items.map((item, idx) => {
            const itemTotal = item.product.price * item.quantity;
            return (
              <div key={idx} className="space-y-0.5">
                <div className="font-semibold text-gray-900 line-clamp-1">
                  {item.product.name}
                </div>
                <div className="flex justify-between text-[10px] text-gray-700">
                  <span>
                    {item.quantity} x {formatRupiah(item.product.price)}
                  </span>
                  <span className="font-medium text-black">{formatRupiah(itemTotal)}</span>
                </div>
                {item.note && (
                  <div className="text-[9px] text-gray-500 italic pl-2">
                    * {item.note}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Separator */}
        <div className="border-b border-dashed border-gray-400 my-2"></div>

        {/* Kalkulasi & Pembayaran */}
        <div className="space-y-1 text-[10px]">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatRupiah(transaction.subtotal)}</span>
          </div>
          {transaction.discountTotal > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Diskon</span>
              <span>-{formatRupiah(transaction.discountTotal)}</span>
            </div>
          )}
          {transaction.taxTotal > 0 && (
            <div className="flex justify-between">
              <span>Pajak (PPN)</span>
              <span>{formatRupiah(transaction.taxTotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-[12px] font-black border-t border-dotted border-gray-400 pt-1 my-1">
            <span>TOTAL TAGIHAN</span>
            <span>{formatRupiah(transaction.grandTotal)}</span>
          </div>

          <div className="flex justify-between pt-1">
            <span>Metode Bayar:</span>
            <span className="font-bold">{transaction.paymentMethod}</span>
          </div>
          <div className="flex justify-between">
            <span>Bayar:</span>
            <span>{formatRupiah(transaction.amountPaid)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Kembalian:</span>
            <span>{formatRupiah(transaction.change)}</span>
          </div>
        </div>

        {/* Separator */}
        <div className="border-b border-dashed border-gray-400 my-3"></div>

        {/* Footer Pesan */}
        <div className="text-center text-[10px] space-y-1 text-gray-700">
          <p className="font-medium">Terima Kasih Atas Kunjungan Anda!</p>
          <p className="text-[9px] text-gray-500">
            Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan
          </p>
          <div className="pt-2 text-[8px] tracking-widest text-gray-400">
            *** SIMPAN STRUK INI SEBAGAI BUKTI ***
          </div>
        </div>
      </div>
    );
  }
);

ThermalReceipt.displayName = 'ThermalReceipt';
