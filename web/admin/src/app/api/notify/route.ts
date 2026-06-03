import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { apiFetch } from '@/lib/api';

export async function POST(req: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { title, body, filter } = await req.json();
  try {
    const result = await apiFetch<{ ok: boolean; recipientCount: number; notificationId: string }>(
      '/v1/notifications/broadcast',
      { method: 'POST', body: JSON.stringify({ title, body, filter }) },
    );
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
