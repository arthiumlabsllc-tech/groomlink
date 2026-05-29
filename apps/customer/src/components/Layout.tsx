import { Outlet } from 'react-router-dom'
import Header from './Header'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'
import ChatWidget from './ChatWidget'
import Icon from './Icon'
import { useAuthStore } from '../store/auth'

export default function Layout() {
  const isImpersonating = !!localStorage.getItem('is_impersonating')
  const isAuthenticated = !!useAuthStore((state) => state.token)

  const handleEndImpersonation = () => {
    const logId = localStorage.getItem('impersonation_log_id')
    // Clean up impersonation state in this domain
    localStorage.removeItem('is_impersonating')
    localStorage.removeItem('impersonation_log_id')
    localStorage.removeItem('customer_token')
    // Redirect to support dashboard with end_impersonation param so it can
    // call the backend API to record endedAt and clean up its own state
    if (logId) {
      window.location.href = `https://support.groomlinkgh.com?end_impersonation=${encodeURIComponent(logId)}`
    } else {
      window.location.href = 'https://support.groomlinkgh.com'
    }
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isImpersonating ? 'pt-10' : ''}`}>
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-black px-4 py-2 flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-2">
            <Icon name="visibility" size={16} />
            <span>You are impersonating this account. All actions are logged.</span>
          </div>
          <button 
            onClick={handleEndImpersonation}
            className="bg-black text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-gray-800 transition-colors flex items-center gap-1.5"
          >
            <Icon name="logout" size={16} />
            Return to Support
          </button>
        </div>
      )}

      {/* Desktop Sidebar — visible only at lg:+ (replaces BottomNav on desktop) */}
      <Sidebar />

      {/* Top Header — offsets to sit right of sidebar on desktop */}
      <Header />

      {/* Main Content
          - lg:pl-64 reserves space for the fixed desktop sidebar (256px)
          - pt-14 reserves space for the fixed header
          - pb-24 reserves space for the mobile BottomNav; lg:pb-8 on desktop where BottomNav is hidden
          - max-w-7xl + mx-auto + responsive horizontal padding centers and constrains content on wide screens */}
      <main className="lg:pl-64 pt-14 pb-24 lg:pb-10 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 page-enter">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation — mobile/tablet only (hidden lg:+, sidebar takes over) */}
      <BottomNav />

      {/* Live Chat Widget - Only show for authenticated users */}
      {isAuthenticated && <ChatWidget />}
    </div>
  )
}