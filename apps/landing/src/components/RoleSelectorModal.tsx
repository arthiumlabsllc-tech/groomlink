import { useEffect } from 'react'
import Icon from './Icon'

interface RoleSelectorModalProps {
  open: boolean
  onClose: () => void
  /**
   * Controls the copy used for the primary action.
   * - 'login': returning users ("Log in as...")
   * - 'signup': new users ("Sign up as...")
   * - 'both' (default): single headline that covers both cases
   */
  mode?: 'login' | 'signup' | 'both'
}

const CUSTOMER_URL = 'https://my.groomlinkgh.com/login'
const PARTNER_URL = 'https://partners.groomlinkgh.com/login'

export default function RoleSelectorModal({ open, onClose, mode = 'both' }: RoleSelectorModalProps) {
  // Close on ESC
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    // Lock body scroll while open
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = originalOverflow
    }
  }, [open, onClose])

  if (!open) return null

  const title =
    mode === 'login'
      ? 'Welcome back — who are you?'
      : mode === 'signup'
      ? 'Sign up — who are you?'
      : 'Log in or sign up'

  const subtitle =
    mode === 'signup'
      ? 'Pick the account that fits you. You can always create the other later.'
      : 'Pick the account you want to use.'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-modal-title"
    >
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
        >
          <Icon name="close" size={20} />
        </button>

        {/* Header */}
        <div className="px-6 pt-7 pb-4 text-center">
          <h2 id="role-modal-title" className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
            {title}
          </h2>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>

        {/* Two role cards */}
        <div className="px-5 sm:px-6 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Customer */}
          <a
            href={CUSTOMER_URL}
            className="group relative rounded-xl border-2 border-gray-200 hover:border-[#CE1126] hover:shadow-lg p-5 text-left transition-all duration-200 bg-white hover:-translate-y-0.5"
          >
            <div className="w-12 h-12 rounded-xl bg-[#CE1126]/10 flex items-center justify-center mb-3 group-hover:bg-[#CE1126]/15 transition-colors">
              <Icon name="person" size={26} className="text-[#CE1126]" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">I'm a Customer</h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              Book barbers, salons & beauty pros near you.
            </p>
            <span className="inline-flex items-center gap-1 text-[#CE1126] text-xs font-semibold">
              Continue
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:translate-x-0.5 transition-transform">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
          </a>

          {/* Salon Owner / Freelancer */}
          <a
            href={PARTNER_URL}
            className="group relative rounded-xl border-2 border-gray-200 hover:border-[#006B3F] hover:shadow-lg p-5 text-left transition-all duration-200 bg-white hover:-translate-y-0.5"
          >
            <div className="w-12 h-12 rounded-xl bg-[#006B3F]/10 flex items-center justify-center mb-3 group-hover:bg-[#006B3F]/15 transition-colors">
              <Icon name="storefront" size={26} className="text-[#006B3F]" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              I'm a Salon Owner<span className="text-gray-400 font-normal"> / Freelancer</span>
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              Manage bookings, staff, payouts & more.
            </p>
            <span className="inline-flex items-center gap-1 text-[#006B3F] text-xs font-semibold">
              Continue
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:translate-x-0.5 transition-transform">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
          </a>
        </div>

        {/* Footer: sign-up hint for new users */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">
            New here? Each option also lets you sign up. Need help?{' '}
            <a href="/support" className="text-[#006B3F] font-semibold hover:underline">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
