'use client';

import React, { useEffect, useState, useRef } from 'react';
import { 
  Bell, 
  X, 
  CheckCircle2, 
  Volume2, 
  ExternalLink, 
  ShoppingCart, 
  Calendar, 
  AlertTriangle, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import {
  isUserOwner,
  isWebNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendWebPushNotificationToOwner,
  playNotificationChime,
  OwnerNotificationPayload,
} from '@/lib/notifications/webPush';

import { supabase } from '@/lib/supabase/client';

export interface FloatingAlertData {
  id: string;
  title: string;
  details: string;
  staffName: string;
  role: string;
  actionType: string;
  url: string;
  timestamp: string;
}

export const OwnerNotificationManager: React.FC = () => {
  const [isOwner, setIsOwner] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPromptBanner, setShowPromptBanner] = useState(false);
  const [floatingAlert, setFloatingAlert] = useState<FloatingAlertData | null>(null);

  // Set of recently handled log IDs to avoid duplicate alerts (valid for 15s)
  const processedLogIdsRef = useRef<Map<string, number>>(new Map());
  const lastSeenTimeRef = useRef<string>(new Date(Date.now() - 5000).toISOString());
  const alertTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Central handler for all incoming activity logs
  const handleIncomingActivity = (log: any) => {
    if (!isUserOwner() || !log) return;

    const logId = log.id || `log-${Date.now()}-${Math.random()}`;
    const now = Date.now();

    // Clean old entries in cache (> 15s)
    for (const [id, time] of processedLogIdsRef.current.entries()) {
      if (now - time > 15000) {
        processedLogIdsRef.current.delete(id);
      }
    }

    if (processedLogIdsRef.current.has(logId)) {
      return;
    }
    processedLogIdsRef.current.set(logId, now);

    // Update last seen timestamp
    if (log.timestamp || log.created_at) {
      const t = log.timestamp || log.created_at;
      if (t > lastSeenTimeRef.current) {
        lastSeenTimeRef.current = t;
      }
    }

    // 1. Dispatch custom event so live UI (Dashboard counters, tables) update immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('kasir_activity_logged', {
          detail: {
            id: logId,
            timestamp: log.timestamp || log.created_at || new Date().toISOString(),
            staffName: log.staffName || log.staff_name || 'Kasir',
            role: log.role || 'Kasir',
            actionType: log.actionType || log.action_type || 'ACTIVITY',
            title: log.title || 'Aktivitas Kasir',
            details: log.details || '',
            metadata: log.metadata || {},
          },
        })
      );
    }

    // 2. Determine title & target navigation URL
    const actionType = log.actionType || log.action_type || '';
    let title = '📢 Notifikasi Kasir GOR';
    if (
      actionType.includes('DELETE') ||
      actionType.includes('VOID') ||
      actionType.includes('CANCEL')
    ) {
      title = '🚨 ' + (log.title || 'Pembatalan Transaksi Kasir');
    } else if (actionType === 'EDIT_BOOKING') {
      title = '🔄 ' + (log.title || 'Perubahan Data Booking');
    } else if (actionType === 'SHIFT_HANDOVER') {
      title = '🔄 ' + (log.title || 'Pergantian Shift Kasir');
    } else if (actionType === 'CREATE_BOOKING') {
      title = '🏸 ' + (log.title || 'Booking Lapangan Baru');
    } else if (actionType === 'SETTLE_BOOKING') {
      title = '💰 ' + (log.title || 'Pelunasan Sewa Lapangan');
    } else if (actionType === 'CREATE_TRANSACTION') {
      title = '🛒 ' + (log.title || 'Penjualan Toko Baru Selesai');
    } else if (actionType === 'CREATE_PRODUCT') {
      title = '📦 ' + (log.title || 'Produk Baru Ditambahkan');
    } else if (actionType === 'EDIT_PRODUCT') {
      title = '✏️ ' + (log.title || 'Pembaruan Stok / Produk');
    } else {
      title = 'ℹ️ ' + (log.title || 'Aktivitas Kasir Terbaru');
    }

    let url = '/dashboard';
    if (actionType.includes('BOOKING')) {
      url = '/booking/history';
    } else if (actionType.includes('PRODUCT') || actionType.includes('STOCK')) {
      url = '/produk';
    } else if (actionType.includes('TRANSACTION')) {
      url = '/laporan';
    }

    // 3. Play audio chime so owner hears sound immediately
    playNotificationChime();

    // 4. Show In-App Floating Notification Banner at the top of the screen
    setFloatingAlert({
      id: logId,
      title,
      details: log.details || '',
      staffName: log.staffName || log.staff_name || 'Kasir',
      role: log.role || 'Kasir',
      actionType,
      url,
      timestamp: log.timestamp || log.created_at || new Date().toISOString(),
    });

    if (alertTimerRef.current) {
      clearTimeout(alertTimerRef.current);
    }
    alertTimerRef.current = setTimeout(() => {
      setFloatingAlert(null);
    }, 7000);

    // 5. Trigger Web Push Notification for OS / system tray
    sendWebPushNotificationToOwner({
      title,
      body: log.details || '',
      tag: logId,
      url,
    });
  };

  useEffect(() => {
    // Check role strictly on client
    const ownerStatus = isUserOwner();
    setIsOwner(ownerStatus);

    if (!ownerStatus) {
      return;
    }

    // Register service worker for PWA push
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

    // 1. BroadcastChannel listener for notifications dispatched across tabs on same device
    let channel: BroadcastChannel | null = null;
    try {
      if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel('kasir_owner_notifications');
        channel.onmessage = (event) => {
          if (event.data) {
            handleIncomingActivity(event.data);
          }
        };
      }
    } catch {}

    // 2. Storage event listener fallback (same device across tabs)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'kasir_last_owner_notification' && e.newValue) {
        try {
          const payload = JSON.parse(e.newValue);
          handleIncomingActivity(payload);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // 3. Supabase Realtime listener for cross-device alerts
    let realtimeChannel: any = null;
    try {
      realtimeChannel = supabase
        .channel('kasir_global_events', {
          config: { broadcast: { ack: true } },
        })
        .on('broadcast', { event: 'activity_log' }, (data: any) => {
          if (data?.payload) {
            handleIncomingActivity(data.payload);
          }
        })
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'activity_logs' },
          (payload) => {
            const log = payload.new as any;
            if (log) {
              handleIncomingActivity({
                id: log.id,
                timestamp: log.created_at,
                staffName: log.staff_name,
                role: log.role,
                actionType: log.action_type,
                title: log.title,
                details: log.details,
                metadata: log.metadata,
              });
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'products' },
          (payload) => {
            const newRow = payload.new as any;
            const oldRow = payload.old as any;
            if (!newRow) return;

            // Only trigger if stock was reduced
            if (oldRow && oldRow.stock !== undefined && newRow.stock >= oldRow.stock) {
              return;
            }

            const currentStock = Number(newRow.stock || 0);
            const minStock = Number(newRow.minimum_stock || 15);

            if (currentStock === 0) {
              handleIncomingActivity({
                id: `stock-0-${newRow.id}-${Date.now()}`,
                title: '🚨 Peringatan: Stok Habis!',
                details: `Stok produk "${newRow.name}" telah HABIS (0 ${newRow.unit || 'pcs'}). Segera lakukan restock!`,
                actionType: 'STOCK_EMPTY',
                staffName: 'Sistem',
                role: 'Sistem',
              });
            } else if (currentStock <= minStock) {
              handleIncomingActivity({
                id: `stock-low-${newRow.id}-${Date.now()}`,
                title: '⚠️ Peringatan: Stok Menipis!',
                details: `Stok produk "${newRow.name}" tersisa ${currentStock} ${newRow.unit || 'pcs'} (Batas minimum: ${minStock}).`,
                actionType: 'STOCK_LOW',
                staffName: 'Sistem',
                role: 'Sistem',
              });
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.error('Supabase realtime subscription error:', err);
    }

    // 4. Fallback Polling (Every 10 seconds)
    // Ensures that even if WebSocket sleeps or drops, new activities in Supabase are reliably received!
    const pollInterval = setInterval(async () => {
      if (!isUserOwner()) return;
      try {
        const { data, error } = await supabase
          .from('activity_logs')
          .select('*')
          .gt('created_at', lastSeenTimeRef.current)
          .order('created_at', { ascending: true })
          .limit(10);

        if (!error && data && data.length > 0) {
          data.forEach((row: any) => {
            handleIncomingActivity({
              id: row.id,
              timestamp: row.created_at,
              staffName: row.staff_name,
              role: row.role,
              actionType: row.action_type,
              title: row.title,
              details: row.details,
              metadata: row.metadata,
            });
          });
        }
      } catch {}
    }, 10000);

    return () => {
      if (channel) channel.close();
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
      window.removeEventListener('storage', handleStorage);
      clearInterval(pollInterval);
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    };
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setPermission('granted');
      setShowPromptBanner(false);
      // Send immediate welcome test notification!
      handleIncomingActivity({
        id: `welcome-${Date.now()}`,
        title: '🏆 Kasir GOR - Notifikasi HP Aktif!',
        details: 'Notifikasi Owner berhasil diaktifkan. Anda akan menerima info setiap ada booking, pelunasan, atau transaksi kasir.',
        actionType: 'TEST_NOTIFICATION',
        staffName: 'Sistem',
        role: 'Owner',
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
  if (!isOwner) {
    return null;
  }

  const getAlertIcon = (actionType: string) => {
    if (actionType.includes('TRANSACTION')) return <ShoppingCart className="w-5 h-5 text-white" />;
    if (actionType.includes('BOOKING')) return <Calendar className="w-5 h-5 text-white" />;
    if (actionType.includes('DELETE') || actionType.includes('CANCEL') || actionType.includes('VOID')) {
      return <AlertTriangle className="w-5 h-5 text-white" />;
    }
    return <Bell className="w-5 h-5 text-white animate-bounce" />;
  };

  return (
    <>
      {/* ============================================================ */}
      {/* 1. LIVE FLOATING NOTIFICATION BANNER (In-App Top Dropdown)   */}
      {/* ============================================================ */}
      {floatingAlert && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] w-[94%] max-w-lg animate-in slide-in-from-top-4 duration-300 pointer-events-auto">
          <div className="bg-slate-900/95 text-white rounded-2xl p-4 shadow-2xl border border-slate-700/80 backdrop-blur-xl flex items-start gap-3.5 ring-1 ring-white/10">
            {/* Icon */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#eb4b2b] to-red-600 flex items-center justify-center shrink-0 shadow-md">
              {getAlertIcon(floatingAlert.actionType)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm font-black text-white truncate">
                  {floatingAlert.title}
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  {floatingAlert.staffName} ({floatingAlert.role})
                </span>
              </div>

              <p className="text-[11px] sm:text-xs text-slate-300 mt-1 leading-snug line-clamp-2">
                {floatingAlert.details}
              </p>

              <div className="flex items-center gap-2 mt-2.5">
                <a
                  href={floatingAlert.url}
                  onClick={() => setFloatingAlert(null)}
                  className="px-3 py-1.5 rounded-xl bg-[#eb4b2b] hover:bg-[#d93f20] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Buka Menu Terkait</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setFloatingAlert(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={() => setFloatingAlert(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. PROMPT PERMISSION BANNER (Jika belum izinkan notifikasi)  */}
      {/* ============================================================ */}
      {showPromptBanner && !floatingAlert && (
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
      )}
    </>
  );
};
