import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)

// --- Sessie aanmaken ---

export async function createClientSession(clientCode: string) {
  const token = await new SignJWT({ clientCode, role: 'client' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret)

  const cookieStore = await cookies()
  cookieStore.set('bjay_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 dagen
    path: '/',
  })
}

export async function createAdminSession() {
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1d')
    .sign(secret)

  const cookieStore = await cookies()
  cookieStore.set('bjay_admin', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 1 dag
    path: '/',
  })
}

// --- Sessie verifiëren ---

export async function getClientSession(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('bjay_session')?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, secret)
    return payload.clientCode as string
  } catch {
    return null
  }
}

export async function getAdminSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get('bjay_admin')?.value
  if (!token) return false

  try {
    const { payload } = await jwtVerify(token, secret)
    return payload.role === 'admin'
  } catch {
    return false
  }
}

// --- Sessie verwijderen ---

export async function clearClientSession() {
  const cookieStore = await cookies()
  cookieStore.delete('bjay_session')
}

export async function clearAdminSession() {
  const cookieStore = await cookies()
  cookieStore.delete('bjay_admin')
}