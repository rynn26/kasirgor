import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, role = 'owner' } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
    }

    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    // Save to Supabase table push_subscriptions
    try {
      await supabase.from('push_subscriptions').upsert({
        id: Buffer.from(endpoint).toString('base64').slice(0, 48),
        endpoint,
        p256dh,
        auth,
        role,
        created_at: new Date().toISOString(),
      }, { onConflict: 'endpoint' });
    } catch (dbErr) {
      console.error('Failed to store push subscription to Supabase:', dbErr);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Push subscribe error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to subscribe' }, { status: 500 });
  }
}
