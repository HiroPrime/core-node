import './globals.css'
import type { Metadata } from 'next'
import { Fraunces, Inter_Tight, Source_Serif_4 } from 'next/font/google'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  axes: ['opsz', 'SOFT', 'WONK'],
})

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '600'],
})

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-kicker',
  weight: ['500', '600'],
})

export const metadata: Metadata = {
  title: 'Core Node',
  description: 'Goddess in Disguise. BasicHiro & Mora Fae.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${sourceSerif.variable} ${interTight.variable}`}>
      <body>{children}</body>
    </html>
  )
}
