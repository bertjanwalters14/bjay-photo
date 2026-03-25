import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { photoUrl, format, price, clientName, clientCode } = await req.json()

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Bjay.photo <info@bjay.photo>',
        to: 'bertjanwalters@gmail.com',
        subject: `Nieuwe fotobestelling van ${clientName}`,
        text: `
Nieuwe bestelling ontvangen!

Klant: ${clientName} (code: ${clientCode})
Formaat: ${format}
Prijs: ${price}

Foto URL:
${photoUrl}
        `.trim(),
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Resend error:', data)
      return NextResponse.json({ error: 'Mail kon niet worden verstuurd', detail: data }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Orders route error:', err)
    return NextResponse.json({ error: 'Server fout', detail: String(err) }, { status: 500 })
  }
}