import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const path = request.nextUrl.pathname

  // If accessing protected pages
  const isProtected = path.startsWith('/') || path.startsWith('/product')

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('auth/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
