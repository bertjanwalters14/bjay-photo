import type { Metadata } from 'next'

// Admin-sectie nooit indexeren — security via obscurity is geen security,
// maar er is geen enkele reden om deze URLs in Google te laten verschijnen.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
