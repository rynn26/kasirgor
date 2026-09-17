import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { supabase } from '@/lib/supabase/client';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BFw4-xpYKhrCFo8VrGCiXHm0jyvNwhbAWUK75Bb_oMCXIRYjUVqKwGNj7hw0Vr3Jb_m6vH8d9trPwaOQY2iYImM';
const privateKey = process.env.VAPID_PRIVATE_KEY || 'mZiDyboQnCiiNbi9VeEoWm1znKZ6AUZvUzEBqtWDuBs';
const subject = process.env.VAPID_SUBJECT || 'mailto:kasirgor@example.com';

try {
  webpush.setVapidDetails(subject, publicKey, privateKey);
} catch (e) {
  console.error('Error setting VAPID details:', e);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, body: messageBody, url = '/dashboard', tag } = body;

    const payload = JSON.stringify({
      title: title || '📢 Notifikasi Kasir GOR',
      body: messageBody || 'Ada aktivitas transaksi baru.',
      url: url || '/dashboard',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: tag || 'kasir-' + Date.now(),
    });

    // Fetch all active owner subscriptions from Supabase
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('role', 'owner');

    if (error || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No subscriptions found' });
    }

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (err: any) {
        // If 410 or 404, subscription has expired on Google/Apple side, remove it
        if (err.statusCode === 410 || err.statusCode === 404) {
          try {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          } catch {}
        }
      }
    });

    await Promise.allSettled(sendPromises);

    return NextResponse.json({ success: true, sent: subscriptions.length });
  } catch (err: any) {
    console.error('Failed to send push notification:', err);
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}
