import redis from './redis'
import type { Client } from './types'
import { WEB3FORMS_ACCESS_KEY } from './web3forms'

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

// Stuur de review-vraag. Twee strategieën:
//   1. Als RESEND_API_KEY is geconfigureerd: direct naar de klant via Resend.
//   2. Anders fallback: een notificatie aan BJAY zelf via web3forms met de
//      kant-en-klare tekst, zodat hij die in zijn eigen mailbox 1-op-1 kan
//      doorsturen naar de klant.
//
// Returnt true bij succes, false bij falen (cron blijft dan retry op
// volgende dag omdat reviewRequestedAt niet wordt gezet bij falen).
export async function sendReviewRequest(client: PendingReviewClient): Promise<boolean> {
  const message = buildReviewMessage(client.name)
  const subject = 'Bedankt voor de fotoshoot bij BJAY Fotografie'

  // Strategie 1: Resend (direct naar klant, volautomatisch)
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
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
    } catch (err) {
      console.error('Resend error:', err)
    }
  }

  // Strategie 2 (fallback): web3forms naar BJAY met copy-paste tekst.
  try {
    const reminderBody = [
      `Klant '${client.name}' is ${client.daysSinceDelivery} dagen geleden opgeleverd.`,
      `Email klant: ${client.email}`,
      `Klantcode: ${client.code}`,
      '',
      '--- Verstuur deze tekst aan de klant ---',
      '',
      message,
      '',
      '--- Einde ---',
    ].join('\n')

    await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: `Review-herinnering: ${client.name}`,
        name: 'Review flow',
        email: 'info@bjay.photo',
        message: reminderBody,
        botcheck: '',
      }),
    })
    return true
  } catch (err) {
    console.error('Web3forms fallback error:', err)
    return false
  }
}
