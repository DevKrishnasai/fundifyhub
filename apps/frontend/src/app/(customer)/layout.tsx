import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'

export default function CustomerLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
      <nav className="bg-white shadow-sm border-b px-4 py-3">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-900">AssetLend - Customer Portal</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Welcome, Customer</span>
            <button className="bg-red-600 text-white px-3 py-1 rounded text-sm">
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="min-h-screen bg-gray-50">{children}</main>
    </div>
  )
}