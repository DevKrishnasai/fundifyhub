import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'

export default function AgentLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
      <nav className="bg-blue-600 text-white shadow-sm px-4 py-3">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">AssetLend - Agent Portal</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm">Welcome, Agent</span>
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