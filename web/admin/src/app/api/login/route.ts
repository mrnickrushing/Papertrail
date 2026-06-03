import { NextResponse } from 'next/server';
import { verifyPassword, SESSION_COOKIE } from '@/lib/auth';

export async function POST(req: Request) {
  const { password } = await req.json();
  if (!verifyPassword(password)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, password, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
