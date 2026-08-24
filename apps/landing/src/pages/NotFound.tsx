import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-brand-primary mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-brand-text mb-2">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
          <Link
            to="/"
            className="btn-primary inline-flex items-center gap-2 px-6 py-3 w-full sm:w-auto justify-center"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Back to Home
          </Link>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 px-6 py-3 w-full sm:w-auto justify-center rounded-xl border-2 border-[#006B3F] text-[#006B3F] font-semibold hover:bg-[#006B3F]/5 transition-colors"
          >
            Explore Salons
          </Link>
        </div>
        <Link
          to="/support"
          className="text-gray-500 hover:text-gray-700 text-sm font-medium underline underline-offset-2"
        >
          Need help? Contact Support
        </Link>
      </div>
    </div>
  )
}
