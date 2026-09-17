'use client';

import React, { useEffect, useState, useRef } from 'react';
import { 
  Bell, 
  X, 
  ShoppingCart, 
  Calendar, 
  AlertTriangle, 
  ArrowRight
} from 'lucide-react';
import {
  isUserOwner,
  isWebNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendWebPushNotificationToOwner,
  playNotificationChime,
  subscribeToPushService,
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

  // Permanent Set of processed log IDs during this session — NEVER DELETED to prevent spam
  const processedLogIdsRef = useRef<Set<string>>(new Set());
  // Timestamp when this page was opened: activities created BEFORE this time will NOT pop up or chime
  const sessionStartTimeRef = useRef<number>(Date.now() - 1000);
  const lastAlertTimeRef = useRef<number>(0);
  const alertTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Central handler for live incoming activities
  const handleIncomingActivity = (log: any, isRealtimeLive = true) => {
    if (!isUserOwner() || !log) return;

    const logId = String(log.id || `log-${Date.now()}`);

    // Strict deduplication: if already processed in this browser session, ignore completely
    if (processedLogIdsRef.current.has(logId)) {
      return;
    }
    processedLogIdsRef.current.add(logId);

    // 1. Dispatch custom event so live UI (Dashboard counters, tables) update silently
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

    // ANTI-SPAM & ANTI-FLOOD GUARD:
    // If the activity was created before this page session started, DO NOT pop up banner or play sound!
    const logTimestamp = new Date(log.timestamp || log.created_at || Date.now()).getTime();
    if (!isRealtimeLive || logTimestamp < sessionStartTimeRef.current) {
      return;
    }

    // Determine title & target navigation URL
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

    // Throttle audio chime (at least 2 seconds between chimes to prevent loud overlapping spam)
    const now = Date.now();
    if (now - lastAlertTimeRef.current > 2000) {
      playNotificationChime();
      lastAlertTimeRef.current = now;
    }

    // Show In-App Floating Notification Banner at top of the screen
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
    }, 6000);

    // Trigger Web Push Notification for OS system tray (if permission granted and tab in background)
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

    // Set baseline session time to now
    sessionStartTimeRef.current = Date.now() - 1000;

    // Register service worker for PWA push
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => {
          // If already granted, ensure subscription is synced to server
          if (getNotificationPermission() === 'granted') {
            subscribeToPushService().catch(() => {});
          }
        })
        .catch(() => {});
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

    // 1. BroadcastChannel listener for notifications dispatched across tabs on the same computer
    let channel: BroadcastChannel | null = null;
    try {
      if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel('kasir_owner_notifications');
        channel.onmessage = (event) => {
          if (event.data) {
            handleIncomingActivity(event.data, true);
          }
        };
      }
    } catch {}

    // 2. Supabase Realtime listener for cross-device alerts
    let realtimeChannel: any = null;
    try {
      realtimeChannel = supabase
        .channel('kasir_global_events', {
          config: { broadcast: { ack: true } },
        })
        .on('broadcast', { event: 'activity_log' }, (data: any) => {
          if (data?.payload) {
            handleIncomingActivity(data.payload, true);
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
              }, true);
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

            // Only trigger if stock was actually reduced
            if (oldRow && oldRow.stock !== undefined && newRow.stock >= oldRow.stock) {
              return;
            }

            const currentStock = Number(newRow.stock || 0);
            const minStock = Number(newRow.minimum_stock || 15);
            // Deduplication slot: 5-minute window per product ID
            const slot = Math.floor(Date.now() / (5 * 60 * 1000));

            if (currentStock === 0) {
              handleIncomingActivity({
                id: `stock-0-${newRow.id}-${slot}`,
                title: '🚨 Peringatan: Stok Habis!',
                details: `Stok produk "${newRow.name}" telah HABIS (0 ${newRow.unit || 'pcs'}). Segera lakukan restock!`,
                actionType: 'STOCK_EMPTY',
                staffName: 'Sistem',
                role: 'Sistem',
              }, true);
            } else if (currentStock <= minStock) {
              handleIncomingActivity({
                id: `stock-low-${newRow.id}-${slot}`,
                title: '⚠️ Peringatan: Stok Menipis!',
                details: `Stok produk "${newRow.name}" tersisa ${currentStock} ${newRow.unit || 'pcs'} (Batas minimum: ${minStock}).`,
                actionType: 'STOCK_LOW',
                staffName: 'Sistem',
                role: 'Sistem',
              }, true);
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.error('Supabase realtime subscription error:', err);
    }

    return () => {
      if (channel) channel.close();
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    };
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setPermission('granted');
      setShowPromptBanner(false);
      // Register web push subscription to backend
      await subscribeToPushService();
      // Send single welcome alert
      handleIncomingActivity({
        id: `welcome-${Date.now()}`,
        title: '🏆 Kasir GOR - Notifikasi HP Aktif!',
        details: 'Notifikasi Owner berhasil diaktifkan. Anda akan menerima info setiap ada booking, pelunasan, atau transaksi kasir.',
        actionType: 'TEST_NOTIFICATION',
        staffName: 'Sistem',
        role: 'Owner',
      }, true);
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
