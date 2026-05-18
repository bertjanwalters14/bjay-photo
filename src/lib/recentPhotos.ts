import redis from './redis'
import type { RecentPhoto } from './types'

// Eén Redis-key bevat een array van precies 4 foto's voor "Meest recente
// momenten" op de homepage. Volgorde is leidend voor weergave (slot 1 t/m 4).
const KEY = 'home:recent'

export async function getRecentPhotos(): Promise<RecentPhoto[]> {
  const data = await redis.get<RecentPhoto[]>(KEY)
  if (!data || !Array.isArray(data)) return []
  return data.slice(0, 4)
}

export async function setRecentPhotos(photos: RecentPhoto[]): Promise<void> {
  // Beperk tot 4 slots en normaliseer ontbrekende velden.
  const cleaned = photos.slice(0, 4).map(p => ({
    url: (p.url || '').trim(),
    alt: (p.alt || '').trim(),
    href: (p.href || '').trim(),
    publicId: (p.publicId || '').trim(),
  }))
  await redis.set(KEY, cleaned)
}
