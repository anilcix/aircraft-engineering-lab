import type { Metadata } from 'next'
import './globals.css'
import './ui-polish.css'

export const metadata: Metadata = {
  title: 'Aircraft Engineering Lab | AEL-300',
  description: 'Interactive aircraft engineering digital twin learning laboratory.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  )
}
