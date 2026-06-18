import type { Client } from './types'

const LOGIN_BASE = 'https://app.bjay.photo/login'

// Persoonlijke toegangsmail: link naar het portaal (met code voorgevuld) + de
// code als tekst, plus een vriendelijke tag-vraag voor Instagram.
function buildAccessMessage(client: Client): string {
  const firstName = client.name.trim().split(/\s+/)[0] || 'daar'
  const link = `${LOGIN_BASE}?code=${encodeURIComponent(client.code)}`
  return `Hoi ${firstName},

Je foto's staan klaar op je persoonlijke portaal!

Bekijk en download ze hier:
${link}

Je inlogcode is: ${client.code}
(de link vult 'm al voor je in, je hoeft alleen nog op "Bekijk mijn foto's" te klikken)

Veel plezier met de foto's. Vind je ze leuk? Tag me op Instagram @bjay.photo, dan deel ik je foto graag in mn story.

Met lieve groeten,
Bert-Jan
BJAY Fotografie
info@bjay.photo`
}

// Stuurt de toegangsmail via Resend. Returnt true bij succes.
export async function sendAccessMail(client: Client): Promise<boolean> {
  if (!client.email) return false

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.error('RESEND_API_KEY ontbreekt - toegangsmail niet verstuurd')
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
        subject: "Je foto's van BJAY Fotografie staan klaar",
        text: buildAccessMessage(client),
      }),
    })
    if (res.ok) return true
    console.error('Resend toegangsmail faalt:', await res.text())
    return false
  } catch (err) {
    console.error('Toegangsmail error:', err)
    return false
  }
}
