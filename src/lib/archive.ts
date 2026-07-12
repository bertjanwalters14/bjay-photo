import redis from './redis'
import cloudinary from './cloudinary'
import type { Client, Order } from './types'

// Retention voor event-portals: na hoeveel dagen sinds aanmaken worden de
// Cloudinary-foto's opgeruimd. Bewust hardcoded; bij wijziging update je
// dit getal en heb je per direct nieuwe gedrag.
export const ARCHIVE_AFTER_DAYS = 30
export const WARNING_BEFORE_DAYS = 7

export interface ArchiveCandidate {
  client: Client
  archiveAt: Date
  daysUntilArchive: number
}

// De datum waarop een client daadwerkelijk archiveert: archiveDeadline als
// handmatige override, anders createdAt + ARCHIVE_AFTER_DAYS.
export function effectiveArchiveAt(client: Client): Date {
  if (client.archiveDeadline) {
    const d = new Date(client.archiveDeadline)
    if (!isNaN(d.getTime())) return d
  }
  return new Date(new Date(client.createdAt).getTime() + ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000)
}

// Haal alle event-klanten op die nog niet gearchiveerd zijn, met hun archief-datum.
async function getEventClientsWithAge(): Promise<ArchiveCandidate[]> {
  const codes = await redis.smembers('clients:all')
  if (!codes.length) return []

  const clients = await Promise.all(codes.map(c => redis.get<Client>(`client:${c}`)))
  const now = Date.now()

  return clients
    .filter((c): c is Client => Boolean(c))
    .filter(c => (c.type ?? 'personal') === 'event')
    .filter(c => !c.archivedAt)
    .map(c => {
      const archiveAt = effectiveArchiveAt(c)
      return {
        client: c,
        archiveAt,
        daysUntilArchive: Math.floor((archiveAt.getTime() - now) / (24 * 60 * 60 * 1000)),
      }
    })
}

// Check of een klant openstaande orders heeft (new of contacted).
// We willen niet archiveren als de fotograaf nog moet leveren.
async function hasOpenOrders(clientCode: string): Promise<boolean> {
  const ids = await redis.lrange<string>('orders:all', 0, -1)
  if (!ids.length) return false

  const orders = await Promise.all(ids.map(id => redis.get<Order>(`order:${id}`)))
  return orders.some(
    o => o && o.clientCode === clientCode && (o.status === 'new' || o.status === 'contacted'),
  )
}

// Klanten die op de archiveer-grens zitten en geen openstaande orders hebben.
export async function getArchivableClients(): Promise<ArchiveCandidate[]> {
  const all = await getEventClientsWithAge()
  const due = all.filter(c => c.daysUntilArchive <= 0)

  // Filter op open orders
  const result: ArchiveCandidate[] = []
  for (const c of due) {
    if (!(await hasOpenOrders(c.client.code))) result.push(c)
  }
  return result
}

// Klanten die binnen WARNING_BEFORE_DAYS zullen archiveren en nog geen
// warning-mail hebben gehad (bv. na een verlenging weer gereset).
export async function getClientsNeedingWarning(): Promise<ArchiveCandidate[]> {
  const all = await getEventClientsWithAge()
  return all.filter(
    c =>
      c.daysUntilArchive <= WARNING_BEFORE_DAYS &&
      c.daysUntilArchive > 0 &&
      !c.client.archiveWarningAt,
  )
}

// Verwijder alle Cloudinary-foto's van een client en markeer als gearchiveerd.
// Likes/feedback/orders blijven staan voor je administratie.
export async function archiveClientPhotos(clientCode: string): Promise<{ ok: boolean; error?: string }> {
  const client = await redis.get<Client>(`client:${clientCode}`)
  if (!client) return { ok: false, error: 'Klant niet gevonden' }

  const prefix = `bjay/clients/${clientCode}`
  try {
    await cloudinary.api.delete_resources_by_prefix(prefix)
    try {
      await cloudinary.api.delete_folder(prefix)
    } catch {
      // folder kan al weg zijn, geen probleem
    }
  } catch (err) {
    console.error('Cloudinary cleanup failed for', clientCode, err)
    return { ok: false, error: 'Cloudinary fout' }
  }

  // Markeer in Redis
  const updated: Client = {
    ...client,
    archivedAt: new Date().toISOString(),
  }
  await redis.set(`client:${clientCode}`, updated)

  return { ok: true }
}

// Markeer dat we de waarschuwingsmail hebben verstuurd, voorkomt dubbel mailen.
export async function markWarningSent(clientCode: string): Promise<void> {
  const client = await redis.get<Client>(`client:${clientCode}`)
  if (!client) return
  await redis.set(`client:${clientCode}`, {
    ...client,
    archiveWarningAt: new Date().toISOString(),
  })
}
