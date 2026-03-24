import type { Metadata } from 'next'
import { Jost, Inter } from 'next/font/google'
import './globals.css'

const jost = Jost({ subsets: ['latin'], variable: '--font-jost' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Bjay.photo',
  description: 'Bekijk jouw foto\'s van Bjay.photo',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl">
      <body className={`${jost.variable} ${inter.variable}`} style={{ margin: 0, padding: 0, backgroundColor: '#053221', fontFamily: 'var(--font-inter), sans-serif' }}>
        {children}
      </body>
    </html>
  )
}