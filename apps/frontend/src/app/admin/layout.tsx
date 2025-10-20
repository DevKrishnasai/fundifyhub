import type React from "react"
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-purple-600">AssetLend Admin</h1>
            <div className="hidden md:flex gap-4">
              <a href="/admin/loans" className="text-gray-600 hover:text-gray-900">
                Admin Dashboard
              </a>
              <a href="/admin/collection" className="text-gray-600 hover:text-gray-900">
                Collection Management
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Mumbai Central District</span>
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-purple-600">A</span>
            </div>
          </div>
        </div>
      </nav>
      {children}
    </div>
  )
}
