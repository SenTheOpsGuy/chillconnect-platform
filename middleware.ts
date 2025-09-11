import { NextResponse } from 'next/server'
import { withAuth } from 'next-auth/middleware'

export default withAuth(
  function middleware(request) {
    const { pathname } = request.nextUrl
    const token = request.nextauth.token

    // Role-based route protection
    const roleRoutes = {
      '/dashboard/seeker': ['SEEKER'],
      '/dashboard/provider': ['PROVIDER'],
      '/dashboard/employee': ['EMPLOYEE', 'SUPER_ADMIN'],
      '/dashboard/admin': ['SUPER_ADMIN'],
      '/api/employee': ['EMPLOYEE', 'SUPER_ADMIN'],
      '/api/admin': ['SUPER_ADMIN']
    }

    // Check role-based access
    for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
      if (pathname.startsWith(route)) {
        if (!token?.role || !allowedRoles.includes(token.role as string)) {
          return NextResponse.redirect(new URL('/unauthorized', request.url))
        }
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Public routes that don't require authentication
        const publicRoutes = [
          '/',
          '/login',
          '/register',
          '/verify-email',
          '/search',
          '/api/auth',
          '/api/providers/search'
        ]

        // Allow public routes
        if (publicRoutes.some(route => pathname.startsWith(route))) {
          return true
        }

        // Require authentication for all other routes
        return !!token
      }
    }
  }
)

export const config = {
  matcher: [
    '/((?!api/public|_next/static|_next/image|favicon.ico).*)',
  ]
}