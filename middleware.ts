// middleware.ts (Next.js)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Rutas privadas que requieren acceso
  if (path.startsWith('/escuchar/')) {
    const hasAccess = request.cookies.get('user_access')?.value;
    if (!hasAccess) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }
  
  return NextResponse.next();
}