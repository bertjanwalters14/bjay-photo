import redis from './redis'
import type { Client } from './types'

const GOOGLE_REVIEW_URL = 'https://g.page/r/CZc1CoEHfp4HEAE/review'

// Hoeveel dagen na oplevering wordt de review-vraag verstuurd.
// 3 dagen is de sweet spot: foto's zijn vers, klant is enthousiast,
// maar nog niet vergeten.
const DAYS_AFTER_DELIVERY = 3

export interface PendingReviewClient {
  id: string
  name: string
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

// Bouw de review-vraag tekst die naar de klant gestuurd wordt.
// Persoonlijke toon, korte uitleg waarom, directe Google-link.
function buildReviewMessage(name: string): string {
  // Pak alleen de voornaam voor een persoonlijke aanhef.
  const firstName = name.trim().split(/\s+/)[0]

  return `Hoi ${firstName},

Hopelijk geniet je inmiddels van de foto's!

Mocht je een momentje hebben: zou je een korte Google-review willen achterlaten? Dat helpt me enorm om beter gevonden te worden en meer mensen blij te maken met gave fotoshoots.

${GOOGLE_REVIEW_URL}

Het is zeker niet verplicht, ik vond het echt een toffe shoot en hopelijk kun je nog lang van de beelden genieten.

Bert-Jan
BJAY Fotografie
info@bjay.photo`
}

// Stuur de review-vraag via Resend (direct naar de klant, volautomatisch).
// Returnt true bij succes, false bij falen (cron blijft dan retry op
// volgende dag omdat reviewRequestedAt niet wordt gezet bij falen).
export async function sendReviewRequest(client: PendingReviewClient): Promise<boolean> {
  const message = buildReviewMessage(client.name)
  const subject = 'Bedankt voor de fotoshoot bij BJAY Fotografie'

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.error('RESEND_API_KEY ontbreekt - review-mail niet verstuurd')
    return false
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
        to: client.email,
        subject,
        text: message,
      }),
    })
    if (res.ok) return true
    console.error('Resend faalt:', await res.text())
    return false
  } catch (err) {
    console.error('Resend error:', err)
    return false
  }
}
