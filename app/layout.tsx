import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Solar Intelligence Platform — Telangana Rooftop Solar Planning',
  description: 'AI-powered rooftop solar planning grounded in official Telangana regulations, incentives, and deterministic calculations.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="font-sans antialiased min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
