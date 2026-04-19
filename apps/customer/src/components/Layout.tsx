import { Outlet } from 'react-router-dom'
import Header from './Header'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Header - Minimal */}
      <Header />

      {/* Main Content - padding-bottom accounts for fixed bottom nav + safe area */}
      <main className="flex-1 pt-14 pb-24">
        <div className="page-enter">
          <Outlet />
        </div>
      </main>

      {/* Footer - Desktop Only */}
      <footer className="py-3 text-center hidden md:block pb-24">
        <a
          href="#"
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          An Arthium Labs Product
        </a>
      </footer>

      {/* Bottom Navigation - Fixed at bottom (mobile-web style) */}
      <BottomNav />
    </div>
  )
}