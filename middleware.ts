import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/login') || pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico')) return NextResponse.next();
  if (request.cookies.get('just_us_access')?.value !== 'granted') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!api).*)'] };
