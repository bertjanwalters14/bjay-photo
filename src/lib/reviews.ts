import redis from './redis'
import type { Client } from './types'
import { sendBrandedMail, emailButton, escapeHtml, greetingName } from './email'

const GOOGLE_REVIEW_URL = 'https://g.page/r/CZc1CoEHfp4HEAE/review'

// Hoeveel dagen na oplevering wordt de review-vraag verstuurd.
// 3 dagen is de sweet spot: foto's zijn vers, klant is enthousiast,
// maar nog niet vergeten.
const DAYS_AFTER_DELIVERY = 3

export interface PendingReviewClient {
  id: string
  name: string
  contactName?: string
  email: string
  code: string
  deliveredAt: string
  daysSinceDelivery: number
}

// Haal alle klanten op waarvan deliveredAt > N dagen geleden is en
// reviewRequestedAt nog niet gezet is. Dit is de werklijst voor de cron.
export async function getPendingReviewRequests(): Promise<PendingReviewClient[]> {
  const codes = await redis.smembers('clients:all')
  if (!codes || codes.length === 0) return []

  const now = Date.now()
  const threshold = DAYS_AFTER_DELIVERY * 24 * 60 * 60 * 1000

  const clients = await Promise.all(
    codes.map(code => redis.get<Client>(`client:${code}`)),
  )

  return clients
    .filter((c): c is Client => !!c && !!c.email && !!c.deliveredAt && !c.reviewRequestedAt)
    .map(c => {
      const deliveredMs = new Date(c.deliveredAt!).getTime()
      return {
        id: c.id,
        name: c.name,
        contactName: c.contactName,
        email: c.email,
        code: c.code,
        deliveredAt: c.deliveredAt!,
        daysSinceDelivery: Math.floor((now - deliveredMs) / (24 * 60 * 60 * 1000)),
      }
    })
    .filter(c => now - new Date(c.deliveredAt).getTime() >= threshold)
}

// Markeer een klant als 'review-vraag verzonden'.
export async function markReviewRequested(clientCode: string): Promise<void> {
  const client = await redis.get<Client>(`client:${clientCode}`)
  if (!client) return
  await redis.set(`client:${clientCode}`, {
    ...client,
    reviewRequestedAt: new Date().toISOString(),
  })
}

// Body zonder afsluiting; de handtekening wordt door sendBrandedMail toegevoegd.
// `greeting` is de al-opgeloste aanhef (zie greetingName in email.ts).
function buildReviewText(greeting: string): string {
  return `Hoi ${greeting},

Hopelijk geniet je inmiddels van de foto's!

Mocht je een momentje hebben: zou je een korte Google-review willen achterlaten? Dat helpt me enorm om beter gevonden te worden en meer mensen blij te maken met gave fotoshoots.

${GOOGLE_REVIEW_URL}

Het is zeker niet verplicht, ik vond het echt een toffe shoot en hopelijk kun je nog lang van de beelden genieten.`
}

export function buildReviewHtml(greeting: string): string {
  return `<p>Hoi ${escapeHtml(greeting)},</p>
  <p>Hopelijk geniet je inmiddels van de foto's!</p>
  <p>Mocht je een momentje hebben: zou je een korte Google-review willen achterlaten? Dat helpt me enorm om beter gevonden te worden en meer mensen blij te maken met gave fotoshoots.</p>
  ${emailButton(GOOGLE_REVIEW_URL, 'Schrijf een review')}
  <p>Het is zeker niet verplicht, ik vond het echt een toffe shoot en hopelijk kun je nog lang van de beelden genieten.</p>`
}

// Kern: stuur de review-vraag naar een naam + e-mail. Hergebruikt door zowel
// de klant-cron (personal shoots) als de handmatige knop op een bestelling
// (event-kopers). `subject` is optioneel zodat event-kopers een passende
// onderwerpregel krijgen. `contactName` gaat voor op `name` (zie greetingName).
export async function sendReviewRequestTo(opts: {
  name: string
  contactName?: string
  email: string
  subject?: string
}): Promise<boolean> {
  const greeting = greetingName({ name: opts.name, contactName: opts.contactName })
  return sendBrandedMail({
    to: opts.email,
    subject: opts.subject || 'Bedankt voor de fotoshoot bij BJAY Fotografie',
    bodyHtml: buildReviewHtml(greeting),
    bodyText: buildReviewText(greeting),
  })
}

// Stuur de review-vraag naar een klant (cron). Returnt true bij succes, false
// bij falen (cron blijft dan retry omdat reviewRequestedAt niet wordt gezet).
export async function sendReviewRequest(client: PendingReviewClient): Promise<boolean> {
  return sendReviewRequestTo({ name: client.name, contactName: client.contactName, email: client.email })
}
