import { Outlet } from 'react-router-dom'
import Header from './Header'
import BottomNav from './BottomNav'

export default function Layout() {
  const isImpersonating = !!localStorage.getItem('is_impersonating')

  const handleEndImpersonation = () => {
    localStorage.removeItem('is_impersonating')
    localStorage.removeItem('impersonation_log_id')
    localStorage.removeItem('customer_token')
    window.location.href = 'https://support.groomlinkgh.com'
  }

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col ${isImpersonating ? 'pt-10' : ''}`}>
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-black px-4 py-2 flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-2">
            <span className="material-icons text-base">visibility</span>
            <span>You are impersonating this account. All actions are logged.</span>
          </div>
          <button 
            onClick={handleEndImpersonation}
            className="bg-black text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-gray-800 transition-colors"
          >
            End Impersonation
          </button>
        </div>
      )}

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