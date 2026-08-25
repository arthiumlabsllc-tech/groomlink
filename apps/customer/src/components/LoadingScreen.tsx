import { useEffect, useState } from 'react';

const ILLUSTRATIONS = [
  '/loading-barber-01.webp',
  '/loading-barber-02.webp',
  '/loading-salon-01.webp',
  '/loading-salon-02.webp',
  '/loading-salon-03.webp',
];

export default function LoadingScreen() {
  const [illustration] = useState(
    () => ILLUSTRATIONS[Math.floor(Math.random() * ILLUSTRATIONS.length)]
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Fade-in animation
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`relative min-h-screen transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <img
        src={illustration}
        alt="GroomLink"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
      <div className="fade-sheet absolute bottom-0 left-0 right-0 flex flex-col items-center gap-3 px-5 pt-8 pb-16 bg-gradient-to-t from-white/95 via-white/80 to-transparent">
        <p className="text-[#006B3F] text-lg font-bold tracking-wider">
          Book Your Next Grooming
        </p>
        <div className="flex gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#CE1126] animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2.5 h-2.5 rounded-full bg-[#CE1126] animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2.5 h-2.5 rounded-full bg-[#CE1126] animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
