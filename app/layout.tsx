import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AEL-180 | Aircraft Engineering Lab',
  description: 'Interactive aircraft engineering digital twin learning laboratory.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
