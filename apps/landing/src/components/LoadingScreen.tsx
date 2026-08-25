import { useState, useEffect } from 'react'
import { useDarkMode } from '../hooks/useDarkMode'

// Barber-shop doodle pattern (same artwork as the boot loader in index.html)
const PATTERN_LIGHT =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cg fill='none' stroke='%23000' stroke-width='1' opacity='0.1'%3E%3Cpath d='M20 30c5-5 10-5 15 0s5 10 0 15c-5 5-10 5-15 0s-5-10 0-15zM25 35v10M35 35v10'/%3E%3Cpath d='M120 20c0-3 2-5 5-5s5 2 5 5v15c0 3-2 5-5 5s-5-2-5-5V20zM125 40v8M125 52v8M125 64v6'/%3E%3Crect x='60' y='50' width='20' height='30' rx='2'/%3E%3Cpath d='M65 55h10M65 62h10M65 69h10M65 76h10'/%3E%3Cpath d='M160 80c-8 0-15 7-15 15s7 15 15 15 15-7 15-15-7-15-15-15zM160 90v20'/%3E%3Cpath d='M40 120l-5 20h10l-5-20zM40 125v10'/%3E%3Cpath d='M90 100h30M90 110h30M90 120h30M90 130h30'/%3E%3Cpath d='M170 140c0-5 4-10 10-10s10 10 10 10-4 10-10 10-10-5-10-10zM175 140h10'/%3E%3Cpath d='M10 160h25M10 165h25M10 170h25'/%3E%3Cpath d='M130 160l5-15 5 15M132 155h6'/%3E%3C/g%3E%3C/svg%3E"
const PATTERN_DARK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cg fill='none' stroke='%23fff' stroke-width='1' opacity='0.1'%3E%3Cpath d='M20 30c5-5 10-5 15 0s5 10 0 15c-5 5-10 5-15 0s-5-10 0-15zM25 35v10M35 35v10'/%3E%3Cpath d='M120 20c0-3 2-5 5-5s5 2 5 5v15c0 3-2 5-5 5s-5-2-5-5V20zM125 40v8M125 52v8M125 64v6'/%3E%3Crect x='60' y='50' width='20' height='30' rx='2'/%3E%3Cpath d='M65 55h10M65 62h10M65 69h10M65 76h10'/%3E%3Cpath d='M160 80c-8 0-15 7-15 15s7 15 15 15 15-7 15-15-7-15-15-15zM160 90v20'/%3E%3Cpath d='M40 120l-5 20h10l-5-20zM40 125v10'/%3E%3Cpath d='M90 100h30M90 110h30M90 120h30M90 130h30'/%3E%3Cpath d='M170 140c0-5 4-10 10-10s10 10 10 10-4 10-10 10-10-5-10-10zM175 140h10'/%3E%3Cpath d='M10 160h25M10 165h25M10 170h25'/%3E%3Cpath d='M130 160l5-15 5 15M132 155h6'/%3E%3C/g%3E%3C/svg%3E"

export default function LoadingScreen() {
  const isDark = useDarkMode()
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
    <div
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{ backgroundColor: isDark ? '#0F1419' : '#ffffff' }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("${isDark ? PATTERN_DARK : PATTERN_LIGHT}")`,
          backgroundRepeat: 'repeat',
          opacity: isDark ? 0.5 : 0.8,
        }}
      />
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4">
        <img
          src={isDark ? '/logo-white.png' : '/logo-black.png'}
          alt="Loading..."
          className="w-16 h-16 animate-pulse-logo"
        />
        <span
          className="text-sm tracking-[0.5px]"
          style={{ color: isDark ? '#6B7280' : '#9ca3af' }}
        >
          Loading...
        </span>
      </div>
    </div>
  )
}
