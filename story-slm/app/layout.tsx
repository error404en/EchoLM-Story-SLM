import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Story-SLM — A small story, made for you',
  description: 'An immersive local studio for turning a single prompt into a story worth keeping.',
  generator: 'Story-SLM',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#071318',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
