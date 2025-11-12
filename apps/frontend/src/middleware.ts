import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import frontendConfig from '@/lib/config';
import logger from '@/lib/logger';

// Middleware is lightweight; rely on `frontendConfig` for validated runtime
// values. We intentionally avoid repeated validation here — config already
// performed that step during module load.
logger.info('✅ Frontend configuration loaded');

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/auth/login',
  '/auth/register',
  '/forgot-password',
  '/about',
  '/contact',
  '/privacy',
  '/terms'
];

// Check if a route is public
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => {
    if (route === '/') return pathname === route;
    return pathname.startsWith(route);
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public routes without authentication
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }
  
  // For protected routes, let AuthContext handle validation instead of checking middleware
  // This is because httpOnly cookies with SameSite=Lax don't reach the browser on cross-origin requests
  // The AuthContext will validate the user state with the backend and redirect accordingly
  // Note: The cookie is still sent to the backend in all requests for backend authentication
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
  ],
};