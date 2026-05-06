import { useState, useEffect } from 'react'

const ILLUSTRATIONS = [
  '/loading-barber-01.webp',
  '/loading-barber-02.webp',
  '/loading-salon-01.webp',
  '/loading-salon-02.webp',
  '/loading-salon-03.webp',
]

export default function LoadingScreen() {
  const [illustration] = useState(
    () => ILLUSTRATIONS[Math.floor(Math.random() * ILLUSTRATIONS.length)]
  )
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // Auto-dismiss after content loads (max 4s safety net)
    const timer = setTimeout(() => setVisible(false), 4000)
    return () => clearTimeout(timer)
  }, [])

  // Listen for app readiness
  useEffect(() => {
    const checkReady = () => {
      if (document.readyState === 'complete') {
        setTimeout(() => setVisible(false), 300)
      }
    }
    window.addEventListener('load', checkReady)
    if (document.readyState === 'complete') checkReady()
    return () => window.removeEventListener('load', checkReady)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-500">
      <div className="flex flex-col items-center gap-5">
        <img
          src={illustration}
          alt="GroomLink"
          className="w-56 h-56 md:w-72 md:h-72 object-contain animate-fade-in"
          loading="eager"
        />
        <div className="flex gap-2">
          <span className="w-2 h-2 rounded-full bg-[#CE1126] animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-[#CE1126] animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-[#CE1126] animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="font-display font-bold text-lg text-[#006B3F] tracking-wide">
          GroomLink
        </span>
      </div>
    </div>
  )
}
