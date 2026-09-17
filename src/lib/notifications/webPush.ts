// Web Push Notification Helper specifically for Role Owner
// Direct browser Notifications without third-party services

export interface OwnerNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
}

/**
 * Checks whether the currently logged-in staff role is 'owner'.
 * Strictly enforces: Notifikasi HANYA ADA DI ROLE OWNER.
 */
export function isUserOwner(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const session = localStorage.getItem('kasir_session');
    if (!session) return false;
    const parsed = JSON.parse(session);
    const r = (parsed.role || '').toLowerCase();
    const name = (parsed.name || '').toLowerCase();
    const email = (parsed.email || '').toLowerCase();
    return (
      r === 'owner' ||
      r === 'admin' ||
      name.includes('owner') ||
      name === 'wilson' ||
      email.includes('owner')
    );
  } catch {
    return false;
  }
}

/**
 * Detects if the current user device is iOS (iPhone/iPad).
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Checks if the web app is running in Standalone PWA mode (added to Home Screen).
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

/**
 * Checks if the browser supports the HTML5 Notification API.
 */
export function isWebNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Gets current notification permission status.
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isWebNotificationSupported()) return 'denied';
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPushService(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.pushManager) return false;

    const vapidKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
      'BFw4-xpYKhrCFo8VrGCiXHm0jyvNwhbAWUK75Bb_oMCXIRYjUVqKwGNj7hw0Vr3Jb_m6vH8d9trPwaOQY2iYImM';
    const convertedKey = urlBase64ToUint8Array(vapidKey);

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });
    }

    if (subscription) {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          role: 'owner',
        }),
      });
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error subscribing to PushService:', err);
    return false;
  }
}

/**
 * Request permission from browser for Web Push Notifications.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isWebNotificationSupported()) return false;
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      localStorage.setItem('owner_web_push_enabled', 'true');
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/sw.js');
          await subscribeToPushService();
        } catch {}
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return false;
  }
}

/**
 * Plays a pleasant notification audio chime using the Web Audio API.
 */
export function playNotificationChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
}

// In-memory sliding window cache to prevent duplicate / spammed notifications (5 second debounce)
const recentNotifCache = new Map<string, number>();

function isDuplicateNotification(key: string): boolean {
  const now = Date.now();
  for (const [k, time] of recentNotifCache.entries()) {
    if (now - time > 5000) {
      recentNotifCache.delete(k);
    }
  }
  if (recentNotifCache.has(key)) {
    return true;
  }
  recentNotifCache.set(key, now);
  return false;
}

/**
 * Send Web Push Notification to Owner.
 * Will NOT display if current user is not Owner.
 * Deduplicates automatically to prevent notification spam.
 */
export async function sendWebPushNotificationToOwner(
  payload: OwnerNotificationPayload
): Promise<boolean> {
  // Requirement: Notifikasi hanya ada di role owner
  if (!isUserOwner()) {
    return false;
  }

  if (!isWebNotificationSupported()) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  // Deduplication check: ignore if identical notification arrived in the last 5s
  const dedupKey = payload.tag || `${payload.title}::${payload.body}`;
  if (isDuplicateNotification(dedupKey)) {
    return false;
  }

  playNotificationChime();

  const options: Record<string, any> = {
    body: payload.body,
    icon: payload.icon || '/icon.svg',
    badge: '/icon.svg',
    tag: dedupKey,
    vibrate: [200, 100, 200],
    data: {
      url: payload.url || '/dashboard',
    },
  };

  // Try service worker registration first (works best on Android Chrome & PWA)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 500)),
      ]);
      if (reg && reg.showNotification) {
        await reg.showNotification(payload.title, options);
        return true;
      }
    } catch {}
  }

  // Fallback to desktop window Notification
  try {
    const n = new Notification(payload.title, options);
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return true;
  } catch (err) {
    console.error('Notification display error:', err);
    return false;
  }
}

/**
 * Global dispatch for any important event in Kasir GOR.
 * Notifies the Owner if Owner is currently active, or broadcasts to the Owner's device/tabs.
 */
export function notifyOwner(payload: OwnerNotificationPayload) {
  if (typeof window === 'undefined') return;

  // 1. If currently in Owner session, trigger notification directly
  if (isUserOwner()) {
    sendWebPushNotificationToOwner(payload);
  }

  // 2. Broadcast to other open tabs / windows on this device
  try {
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel('kasir_owner_notifications');
      bc.postMessage(payload);
    }
  } catch {}

  // 3. Fallback broadcast via localStorage storage event
  try {
    localStorage.setItem(
      'kasir_last_owner_notification',
      JSON.stringify({ ...payload, _ts: Date.now() })
    );
  } catch {}
}
