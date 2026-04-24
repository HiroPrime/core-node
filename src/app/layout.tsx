import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nexus | Core Node',
  description: 'Digital Foundry & Living Ecosystem',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased overflow-x-hidden bg-[#030303]">
        {children}
      </body>
    </html>
  )
}