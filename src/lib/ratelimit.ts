import { Ratelimit } from '@upstash/ratelimit'
import redis from './redis'

// Rate limiter voor admin-login.
// Streng: 5 pogingen per minuut per IP. Dit ben jij, dus normaal max
// 1 a 2 pogingen. Vaker = brute-force aanval.
export const adminLoginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  analytics: true,
  prefix: 'ratelimit:admin-login',
})

// Rate limiter voor klant-login.
// Iets soepeler: 10 pogingen per minuut per IP. Echte klanten
// vertikken zich wel eens met hun code, daar moeten ze ruimte voor
// hebben. Maar 10/min is ruim te weinig voor brute-force op een
// random klantcode.
export const clientLoginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: 'ratelimit:client-login',
})

// Haal het IP van de client uit de request headers.
// Op Vercel zit het echte IP in 'x-forwarded-for' (eerste entry
// is de oorspronkelijke client; de rest zijn proxies).
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real
  return 'unknown'
}
