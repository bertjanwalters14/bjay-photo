import redis from '@/lib/redis'
import { Event, EventRequest } from '@/lib/types'
import { nanoid } from 'nanoid'

const DEFAULT_LOGIN_URL = 'https://app.bjay.photo/login'

// ---------- Redis keys ----------

const KEY_ALL_EVENTS = 'events:all'
const eventKey = (slug: string) => `event:${slug}`
const requestsKey = (slug: string) => `event-requests:${slug}`
const requestKey = (id: string) => `event-request:${id}`
const KEY_ALL_REQUESTS = 'event-requests:all'

// ---------- Slug helpers ----------

export function slugifyEvent(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
}

// ---------- Event CRUD ----------

export async function getAllEvents(): Promise<Event[]> {
  const slugs = await redis.smembers(KEY_ALL_EVENTS)
  if (!slugs.length) return []

  const events = await Promise.all(slugs.map(s => redis.get<Event>(eventKey(s))))
  return events
    .filter((e): e is Event => Boolean(e))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function getEvent(slug: string): Promise<Event | null> {
  return await redis.get<Event>(eventKey(slug))
}

export async function getPopupEvent(): Promise<Event | null> {
  const events = await getAllEvents()
  return events.find(e => e.popupActive) || null
}

export async function getRequestableEvents(): Promise<Event[]> {
  const events = await getAllEvents()
  return events.filter(e => e.requestable)
}

export async function createEvent(input: Partial<Event> & { name: string }): Promise<Event> {
  const slug = (input.slug || slugifyEvent(input.name)).toLowerCase()
  if (!slug || !/^[a-z0-9-]{2,60}$/.test(slug)) {
    throw new Error('Slug ongeldig (alleen kleine letters, cijfers en streepjes, 2-60 tekens)')
  }
  if (await redis.exists(eventKey(slug))) {
    throw new Error('Een event met deze slug bestaat al')
  }

  const now = new Date().toISOString()
  const event: Event = {
    slug,
    name: input.name.trim(),
    label: input.label?.trim() || 'Live nu',
    description: input.description?.trim() || '',
    password: input.password?.trim() || '',
    loginUrl: input.loginUrl?.trim() || DEFAULT_LOGIN_URL,
    dismissKey: input.dismissKey?.trim() || `${slug}-dismissed`,
    popupActive: Boolean(input.popupActive),
    requestable: input.requestable !== undefined ? Boolean(input.requestable) : true,
    createdAt: now,
    updatedAt: now,
  }

  // Slechts één event mag popupActive zijn — zorg daarvoor.
  if (event.popupActive) {
    await clearPopupActive(slug)
  }

  await redis.set(eventKey(slug), event)
  await redis.sadd(KEY_ALL_EVENTS, slug)
  return event
}

export async function updateEvent(slug: string, patch: Partial<Event>): Promise<Event | null> {
  const current = await getEvent(slug)
  if (!current) return null

  const updated: Event = {
    ...current,
    ...patch,
    slug: current.slug,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  }

  // Slechts één event mag popupActive zijn.
  if (updated.popupActive && !current.popupActive) {
    await clearPopupActive(slug)
  }

  await redis.set(eventKey(slug), updated)
  return updated
}

export async function deleteEvent(slug: string): Promise<boolean> {
  const exists = await redis.exists(eventKey(slug))
  if (!exists) return false

  // Bijbehorende requests ook opruimen.
  const requestIds = await redis.smembers(requestsKey(slug))
  if (requestIds.length) {
    await Promise.all(requestIds.map(id => redis.del(requestKey(id))))
    await Promise.all(requestIds.map(id => redis.srem(KEY_ALL_REQUESTS, id)))
    await redis.del(requestsKey(slug))
  }

  await redis.del(eventKey(slug))
  await redis.srem(KEY_ALL_EVENTS, slug)
  return true
}

// Helper: zet popupActive op false voor alle events behalve evt. `exceptSlug`.
async function clearPopupActive(exceptSlug?: string): Promise<void> {
  const events = await getAllEvents()
  await Promise.all(
    events
      .filter(e => e.popupActive && e.slug !== exceptSlug)
      .map(e =>
        redis.set(eventKey(e.slug), {
          ...e,
          popupActive: false,
          updatedAt: new Date().toISOString(),
        }),
      ),
  )
}

// ---------- Event requests ----------

export async function createEventRequest(input: {
  eventSlug: string
  eventName: string
  name: string
  email: string
  phone?: string
  message?: string
  context?: string
}): Promise<EventRequest> {
  const id = nanoid(12)
  const request: EventRequest = {
    id,
    eventSlug: input.eventSlug,
    eventName: input.eventName,
    name: input.name.trim(),
    email: input.email.trim(),
    phone: (input.phone || '').trim(),
    message: (input.message || '').trim(),
    context: (input.context || '').trim(),
    handled: false,
    createdAt: new Date().toISOString(),
  }

  await redis.set(requestKey(id), request)
  await redis.sadd(requestsKey(input.eventSlug), id)
  await redis.sadd(KEY_ALL_REQUESTS, id)
  return request
}

export async function getAllRequests(): Promise<EventRequest[]> {
  const ids = await redis.smembers(KEY_ALL_REQUESTS)
  if (!ids.length) return []

  const requests = await Promise.all(ids.map(id => redis.get<EventRequest>(requestKey(id))))
  return requests
    .filter((r): r is EventRequest => Boolean(r))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function markRequestHandled(id: string, handled: boolean): Promise<EventRequest | null> {
  const current = await redis.get<EventRequest>(requestKey(id))
  if (!current) return null

  const updated: EventRequest = { ...current, handled }
  await redis.set(requestKey(id), updated)
  return updated
}

export async function deleteRequest(id: string): Promise<boolean> {
  const current = await redis.get<EventRequest>(requestKey(id))
  if (!current) return false

  await redis.del(requestKey(id))
  await redis.srem(requestsKey(current.eventSlug), id)
  await redis.srem(KEY_ALL_REQUESTS, id)
  return true
}

// ---------- Email notification via Resend ----------

export async function sendRequestNotification(request: EventRequest): Promise<void> {
  const subject = `Wachtwoord-aanvraag: ${request.eventName}`
  const lines = [
    `Nieuwe wachtwoord-aanvraag voor event "${request.eventName}"`,
    '',
    `Naam: ${request.name}`,
    `Email: ${request.email}`,
    request.phone ? `Telefoon: ${request.phone}` : '',
    request.context ? `Context: ${request.context}` : '',
    request.message ? `Bericht: ${request.message}` : '',
    '',
    `Aanvraag-ID: ${request.id}`,
    `Tijd: ${new Date(request.createdAt).toLocaleString('nl-NL')}`,
  ].filter(Boolean)

  // Notificatie naar BJAY via Resend. reply_to = de aanvrager, zodat je in je
  // mail direct op Beantwoorden kunt klikken om het wachtwoord te sturen.
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.error('RESEND_API_KEY ontbreekt - aanvraag-notificatie niet verstuurd')
    return
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Bjay.photo <info@bjay.photo>',
        to: 'info@bjay.photo',
        reply_to: request.email,
        subject,
        text: lines.join('\n'),
      }),
    })
    if (!res.ok) {
      console.error('Resend notificatie faalt:', await res.text())
    }
  } catch (err) {
    // Email-falen mag de aanvraag-opslag niet blokkeren.
    console.error('Aanvraag-notificatie mislukt:', err)
  }
}
