import type { Metadata } from 'next'
import { Jost, Inter } from 'next/font/google'
import './globals.css'

const jost = Jost({ subsets: ['latin'], variable: '--font-jost' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  metadataBase: new URL('https://app.bjay.photo'),
  title: 'Bjay.photo',
  description: 'Bekijk jouw foto\'s van Bjay.photo',
  openGraph: {
    title: 'Bjay.photo',
    description: 'Bekijk jouw foto\'s van Bjay.photo',
    url: '/',
    siteName: 'Bjay.photo',
    locale: 'nl_NL',
    type: 'website',
    images: [{ url: '/logoBJAYv3.0-iconbackground.png', width: 547, height: 547, alt: 'Bjay.photo' }],
  },
  twitter: {
    card: 'summary',
    title: 'Bjay.photo',
    description: 'Bekijk jouw foto\'s van Bjay.photo',
    images: ['/logoBJAYv3.0-iconbackground.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl">
      <body className={`${jost.variable} ${inter.variable}`} style={{ margin: 0, padding: 0, backgroundColor: '#053221', fontFamily: 'var(--font-inter), sans-serif', overflowX: 'hidden' }}>
        {children}
      </body>
    </html>
  )
}