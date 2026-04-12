import { useEffect } from 'react'

// Simple redirect component - all registration now happens on respective subdomains
export default function Register() {
  // Redirect to customer login (which includes registration) on mount
  useEffect(() => {
    window.location.href = 'https://my.groomlinkgh.com/login'
  }, [])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-ghana-green/5 via-white to-ghana-gold/10 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-ghana-green border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-600 mt-4">Redirecting to customer registration...</p>
      </div>
    </div>
  )
}
