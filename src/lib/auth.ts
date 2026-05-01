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
    maxAge: 60 * 60 * 24 * 7,
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
    maxAge: 60 * 60 * 24,
    path: '/',
  })
}

// --- Sessie verifieren ---

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

// Geeft de clientCode terug als er een geldige client-sessie is OF een geldige
// preview-token in de URL query. Gebruik in API routes die zowel echte
// klant-bezoek als admin-preview moeten ondersteunen.
export async function getClientOrPreviewSession(req?: Request): Promise<string | null> {
  const fromSession = await getClientSession()
  if (fromSession) return fromSession

  if (req) {
    try {
      const url = new URL(req.url)
      const previewToken = url.searchParams.get('preview')
      if (previewToken) {
        const { payload } = await jwtVerify(previewToken, secret)
        if (payload.role === 'preview' && typeof payload.clientCode === 'string') {
          return payload.clientCode
        }
      }
    } catch {
      // ignore
    }
  }

  return null
}

// Geeft true als de huidige request mag handelen namens deze clientId:
// admin-sessie, regulier ingelogde klant met dezelfde code, of preview-token.
export async function canActAsClient(clientId: string, req?: Request): Promise<boolean> {
  const isAdmin = await getAdminSession()
  if (isAdmin) return true
  const code = await getClientOrPreviewSession(req)
  return code === clientId
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
