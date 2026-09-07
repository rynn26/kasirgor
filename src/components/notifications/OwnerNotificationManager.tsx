'use client';

import React, { useEffect, useState } from 'react';
import { Bell, X, CheckCircle2, Volume2 } from 'lucide-react';
import {
  isUserOwner,
  isWebNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendWebPushNotificationToOwner,
  OwnerNotificationPayload,
} from '@/lib/notifications/webPush';

import { supabase } from '@/lib/supabase/client';

export const OwnerNotificationManager: React.FC = () => {
  const [isOwner, setIsOwner] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPromptBanner, setShowPromptBanner] = useState(false);

  useEffect(() => {
    // Check role strictly on client
    const ownerStatus = isUserOwner();
    setIsOwner(ownerStatus);

    if (!ownerStatus) {
      return;
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    if (isWebNotificationSupported()) {
      const perm = getNotificationPermission();
      setPermission(perm);

      // If owner hasn't decided yet and hasn't dismissed today
      const dismissed = sessionStorage.getItem('dismissed_owner_notif_prompt');
      if (perm === 'default' && !dismissed) {
        setShowPromptBanner(true);
      }
    }

    // 1. BroadcastChannel listener for notifications dispatched across tabs
    let channel: BroadcastChannel | null = null;
    try {
      if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel('kasir_owner_notifications');
        channel.onmessage = (event) => {
          if (isUserOwner() && event.data) {
            sendWebPushNotificationToOwner(event.data);
          }
        };
      }
    } catch {}

    // 2. Storage event listener fallback
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'kasir_last_owner_notification' && e.newValue) {
        try {
          const payload: OwnerNotificationPayload = JSON.parse(e.newValue);
          if (isUserOwner()) {
            sendWebPushNotificationToOwner(payload);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // 3. Supabase Realtime listener for cross-device real-time alerts
    let realtimeChannel: any = null;
    try {
      realtimeChannel = supabase
        .channel('kasir_global_events')
        .on('broadcast', { event: 'activity_log' }, (data: any) => {
          if (!isUserOwner()) return;
          const log = data?.payload;
          if (!log) return;

          // Dispatch local event so UI components immediately update their notification list!
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('kasir_activity_logged', { detail: log }));
          }

          const actionType = log.actionType || log.action_type || '';
          let title = '📢 Notifikasi Kasir GOR';
          if (
            actionType.includes('DELETE') ||
            actionType.includes('VOID') ||
            actionType.includes('CANCEL')
          ) {
            title = '🚨 ' + (log.title || 'Pembatalan Kasir');
          } else if (actionType === 'EDIT_BOOKING') {
            title = '🔄 ' + (log.title || 'Perubahan Data Booking');
          } else if (actionType === 'SHIFT_HANDOVER') {
            title = '🔄 ' + (log.title || 'Pergantian Shift');
          } else if (actionType === 'CREATE_BOOKING') {
            title = '🏸 Booking Lapangan Baru';
          } else if (actionType === 'SETTLE_BOOKING') {
            title = '💰 Pelunasan Sewa Lapangan';
          } else if (actionType === 'CREATE_TRANSACTION') {
            title = '🛒 Penjualan Toko Baru Selesai';
          } else {
            title = 'ℹ️ ' + (log.title || 'Aktivitas Kasir');
          }

          sendWebPushNotificationToOwner({
            title,
            body: log.details || '',
            tag: log.id || 'act-' + Date.now(),
            url: actionType.includes('BOOKING') ? '/booking/history' : '/laporan',
          });
        })
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'products' },
          (payload) => {
            if (!isUserOwner()) return;
            const newRow = payload.new as any;
            const oldRow = payload.old as any;
            if (!newRow) return;

            // Only trigger if stock is reduced or changed
            if (oldRow && oldRow.stock !== undefined && newRow.stock >= oldRow.stock) {
              return;
            }

            const currentStock = Number(newRow.stock || 0);
            const minStock = Number(newRow.minimum_stock || 15);

            if (currentStock === 0) {
              sendWebPushNotificationToOwner({
                title: '🚨 Peringatan: Stok Habis!',
                body: `Stok produk "${newRow.name}" telah HABIS (0 ${newRow.unit || 'pcs'}). Segera lakukan restock!`,
                url: '/produk',
                tag: `stock-empty-${newRow.id}`,
              });
            } else if (currentStock <= minStock) {
              sendWebPushNotificationToOwner({
                title: '⚠️ Peringatan: Stok Menipis!',
                body: `Stok produk "${newRow.name}" tersisa ${currentStock} ${newRow.unit || 'pcs'} (Batas minimum: ${minStock}). Segera lakukan pemesanan ulang.`,
                url: '/produk',
                tag: `stock-low-${newRow.id}`,
              });
            }
          }
        )
        .subscribe();
    } catch {}

    return () => {
      if (channel) channel.close();
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setPermission('granted');
      setShowPromptBanner(false);
      // Send immediate welcome test notification!
      sendWebPushNotificationToOwner({
        title: '🏆 Kasir GOR - Notifikasi HP Aktif!',
        body: 'Notifikasi Owner berhasil diaktifkan. Anda akan menerima info setiap ada booking, pelunasan, atau transaksi kasir.',
        url: '/dashboard',
      });
    } else {
      setPermission('denied');
      setShowPromptBanner(false);
    }
  };

  const handleDismissPrompt = () => {
    setShowPromptBanner(false);
    sessionStorage.setItem('dismissed_owner_notif_prompt', 'true');
  };

  // Strictly render nothing if not owner
  if (!isOwner || !showPromptBanner) {
    return null;
  }

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-white rounded-2xl p-3.5 shadow-2xl border border-amber-200 animate-in slide-in-from-top duration-300">
      <div className="flex items-start justify-between gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5 animate-bounce" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-black text-slate-900">Aktifkan Notifikasi Web HP (Owner)</h4>
            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-black uppercase">
              Owner
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
            Dapatkan notifikasi pop-up langsung di layar HP/Desktop saat Kasir membuat booking, menerima pembayaran, atau membatalkan transaksi.
          </p>

          <div className="flex items-center gap-2 mt-2.5">
            <button
              type="button"
              onClick={handleEnableNotifications}
              className="px-3.5 py-1.5 rounded-xl bg-[#eb4b2b] hover:bg-[#d43a1c] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Aktifkan Sekarang</span>
            </button>
            <button
              type="button"
              onClick={handleDismissPrompt}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-all cursor-pointer"
            >
              Nanti Saja
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismissPrompt}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
