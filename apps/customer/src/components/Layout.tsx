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

      {/* Bottom Navigation - Fixed at bottom (mobile-web style) */}
      <BottomNav />
    </div>
  )
}