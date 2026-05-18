import type { Metadata } from 'next'

// Persoonlijke + event galleries zijn prive. Niet indexeren door Google,
// Bing, etc. URL kan klantnaam bevatten en gallery-content is gevoelig.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
}

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
