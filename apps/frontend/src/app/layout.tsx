import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/contexts/AuthContext'
import { SocketProvider } from '@/contexts/SocketContext'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'FundifyHub - Quick Asset-Backed Loans',
    template: '%s | FundifyHub',
  },
  description: 'Turn your phones, laptops, vehicles, and other valuable assets into immediate cash. Quick approval, fair valuations, and flexible repayment terms.',
  keywords: ['asset-backed loans', 'quick loans', 'phone loans', 'laptop loans', 'vehicle loans', 'instant cash'],
  authors: [{ name: 'FundifyHub Team' }],
  creator: 'FundifyHub',
  publisher: 'FundifyHub',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://fundifyhub.com'),
  openGraph: {
    title: 'FundifyHub - Quick Asset-Backed Loans',
    description: 'Turn your phones, laptops, vehicles, and other valuable assets into immediate cash.',
    url: 'https://fundifyhub.com',
    siteName: 'FundifyHub',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FundifyHub - Quick Asset-Backed Loans',
    description: 'Turn your phones, laptops, vehicles, and other valuable assets into immediate cash.',
    creator: '@fundifyhub',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <SocketProvider>
              <div className="min-h-screen flex flex-col">
                <main className="flex-1">{children}</main>
                <Toaster />
              </div>
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
