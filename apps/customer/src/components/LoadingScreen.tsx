import { useEffect, useState } from 'react';
import { useDarkMode } from '../hooks/useDarkMode';

export default function LoadingScreen() {
  const isDark = useDarkMode();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Fade-in animation
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`auth-page-bg relative min-h-screen bg-gradient-to-br from-[#006B3F]/5 via-white to-[#FCD116]/10 flex items-center justify-center overflow-hidden transition-opacity duration-700 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Faded GL mark as foreground watermark */}
      <img
        src={isDark ? '/logo-white.png' : '/logo-black.png'}
        alt=""
        aria-hidden="true"
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 object-contain select-none pointer-events-none ${
          isDark ? 'opacity-[0.07]' : 'opacity-[0.06]'
        }`}
      />

      {/* Full logo + animated barber-pole loader */}
      <div className="relative flex flex-col items-center gap-8">
        <img
          src={isDark ? '/logo-full-white.png' : '/logo-full-black.png'}
          alt="GroomLink"
          className="h-14 w-auto"
        />
        <img src="/loading-barber-pole.svg" alt="Loading" className="h-3.5 w-auto" />
      </div>
    </div>
  );
}
