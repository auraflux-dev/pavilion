import type { Metadata } from 'next'
import { Inter, Merriweather } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _inter = Inter({ subsets: ['latin'] })
const _merriweather = Merriweather({ subsets: ['latin'], weight: ['400', '700', '900'] })

export const metadata: Metadata = {
  title: 'Stone Hill Middle School PTO | Go Stingrays!',
  description:
    'The Stone Hill Middle School PTO is an active volunteer organization committed to enriching the academic and social experience for all SHMS students and families in Ashburn, Virginia.',
  keywords: ['Stone Hill Middle School', 'PTO', 'Ashburn', 'Virginia', 'Stingrays', 'SHMS'],
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased text-foreground">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
