import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from 'sonner'
import { Toaster as RadixToaster } from '@/components/ui/toaster'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'AssetLend - Quick Asset-Backed Loans',
    template: '%s | AssetLend',
  },
  description: 'Turn your phones, laptops, vehicles, and other valuable assets into immediate cash. Quick approval, fair valuations, and flexible repayment terms.',
  keywords: ['asset-backed loans', 'quick loans', 'phone loans', 'laptop loans', 'vehicle loans', 'instant cash'],
  authors: [{ name: 'AssetLend Team' }],
  creator: 'AssetLend',
  publisher: 'AssetLend',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://assetlend.com'),
  openGraph: {
    title: 'AssetLend - Quick Asset-Backed Loans',
    description: 'Turn your phones, laptops, vehicles, and other valuable assets into immediate cash.',
    url: 'https://assetlend.com',
    siteName: 'AssetLend',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AssetLend - Quick Asset-Backed Loans',
    description: 'Turn your phones, laptops, vehicles, and other valuable assets into immediate cash.',
    creator: '@assetlend',
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
            {children}
            <Toaster 
              position="top-right"
              expand={false}
              richColors
              closeButton
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'hsl(var(--background))',
                  color: 'hsl(var(--foreground))',
                  border: '1px solid hsl(var(--border))',
                },
              }}
            />
            <RadixToaster />
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
