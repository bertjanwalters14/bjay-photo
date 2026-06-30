import { brandedHtml } from '@/lib/email'
import { accessBodyHtml, sneakPeekBodyHtml, bookingBodyHtml, paymentRequestBodyHtml } from '@/lib/clientMail'
import { buildReviewHtml } from '@/lib/reviews'
import { orderConfirmationBodyHtml } from '@/lib/orderMail'
import type { Client } from '@/lib/types'

export const dynamic = 'force-dynamic'

// Admin-preview van alle klant-mails met test-data. Verstuurt niets, rendert
// alleen de HTML zodat je de huisstijl kunt checken. Beschermd door de
// admin-middleware (zoals de rest van /admin).
export default function MailPreviewPage() {
  const sampleClient: Client = {
    id: 'preview',
    name: 'Feest Mick & Marieke',
    contactName: 'Mick & Marieke',
    email: 'test@voorbeeld.nl',
    code: 'abc12345',
    type: 'personal',
    createdAt: new Date().toISOString(),
    date: '2026-07-05',
    price: '200',
    personalNote:
      'We hadden 2 uur afgesproken, maar ik vond het zo leuk dat het er 5 werden. Geen zorgen, dat is mijn plezier!',
  }

  const mails: { label: string; subject: string; html: string }[] = [
    {
      label: 'Boekingsbevestiging',
      subject: 'Je boeking bij BJAY Fotografie - even bevestigen',
      html: brandedHtml(bookingBodyHtml(sampleClient)),
    },
    {
      label: 'Betaalverzoek (event)',
      subject: 'Betaalverzoek - Feest Mick & Marieke - BJAY Fotografie',
      html: brandedHtml(paymentRequestBodyHtml(sampleClient)),
    },
    {
      label: 'Toegangsmail',
      subject: "Je foto's van BJAY Fotografie staan klaar",
      html: brandedHtml(accessBodyHtml(sampleClient)),
    },
    {
      label: 'Sneak peek',
      subject: "Alvast een sneak peek van je foto's",
      html: brandedHtml(sneakPeekBodyHtml(sampleClient)),
    },
    {
      label: 'Review-vraag',
      subject: 'Bedankt voor de fotoshoot bij BJAY Fotografie',
      html: brandedHtml(buildReviewHtml('Mick')),
    },
    {
      label: 'Bestelbevestiging',
      subject: 'Bevestiging van je fotobestelling - Bjay.photo',
      html: brandedHtml(
        orderConfirmationBodyHtml({
          customerName: 'Mick',
          summary: 'Formaat: 20x30 cm',
          price: '€22',
          isEvent: false,
        }),
      ),
    },
  ]

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#e8ede9', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <h1
          style={{
            color: '#053221',
            fontFamily: 'var(--font-jost), sans-serif',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontSize: 20,
            marginBottom: 4,
          }}
        >
          Mail-preview
        </h1>
        <p style={{ color: '#4a6358', fontSize: 13, marginBottom: 24 }}>
          Voorbeeld van alle klant-mails (met test-data). Er wordt niets verstuurd.
        </p>
        {mails.map(m => (
          <section key={m.label} style={{ marginBottom: 32 }}>
            <p style={{ color: '#053221', fontWeight: 500, marginBottom: 4 }}>{m.label}</p>
            <p style={{ color: '#4a6358', fontSize: 12, marginBottom: 8 }}>
              Onderwerp: {m.subject}
            </p>
            <div
              style={{
                backgroundColor: '#fff',
                border: '1px solid rgba(200,169,110,0.4)',
                borderRadius: 8,
                padding: 24,
              }}
              dangerouslySetInnerHTML={{ __html: m.html }}
            />
          </section>
        ))}
      </div>
    </main>
  )
}
