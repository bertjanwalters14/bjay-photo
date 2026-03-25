import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { photoUrl, format, price, clientName, clientCode } = await req.json()

  const res = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_key: 'aa1038ea-0718-4fbc-a78b-9f0f4686c164',
      email: 'info@bjay.photo',
      subject: `📸 Nieuwe fotobestelling van ${clientName}`,
      from_name: 'Bjay.photo Galerij',
      message: `
Nieuwe bestelling ontvangen!

Klant: ${clientName} (code: ${clientCode})
Formaat: ${format}
Prijs: ${price}

Foto URL:
${photoUrl}
      `.trim(),
    }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Bestelling kon niet worden verstuurd' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}