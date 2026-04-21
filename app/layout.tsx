import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Maintenance EIS System - Predictive Maintenance Platform',
  description: 'Professional predictive maintenance platform for scanners and printers. Prevent failures, streamline repairs, and manage inventory efficiently.',
  generator: 'v0.app',
  openGraph: {
    title: 'Maintenance EIS System - Predictive Maintenance Platform',
    description: 'Professional predictive maintenance platform for scanners and printers.',
    images: ['/brand/eis-logo.jpg'],
  },
  twitter: {
    card: 'summary',
    title: 'Maintenance EIS System - Predictive Maintenance Platform',
    description: 'Professional predictive maintenance platform for scanners and printers.',
    images: ['/brand/eis-logo.jpg'],
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
