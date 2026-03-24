import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Admin routes beschermen
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = req.cookies.get('bjay_admin')?.value
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
    try {
      await jwtVerify(token, secret)
    } catch {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
  }

  // Galerij routes beschermen
  if (pathname.startsWith('/gallery')) {
    const token = req.cookies.get('bjay_session')?.value
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    try {
      await jwtVerify(token, secret)
    } catch {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/gallery/:path*'],
}