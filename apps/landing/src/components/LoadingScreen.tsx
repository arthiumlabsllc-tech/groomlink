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
    <div className="fixed inset-0 z-[9999] bg-white transition-opacity duration-500">
      <img
        src={illustration}
        alt="GroomLink"
        className="absolute inset-0 w-full h-full object-cover object-center animate-fade-in"
        loading="eager"
      />
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-3 px-5 pt-8 pb-16 bg-gradient-to-t from-white/95 via-white/80 to-transparent">
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
