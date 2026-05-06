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
    <div className={`flex flex-col items-center justify-center min-h-[80vh] transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <img
        src={illustration}
        alt="GroomLink"
        className="w-[85%] max-w-md h-auto object-contain"
      />
      <p className="text-gray-600 text-base font-semibold tracking-wider mt-6 mb-4">
        Book Your Next Grooming
      </p>
      <div className="flex gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-[#CE1126] animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2.5 h-2.5 rounded-full bg-[#CE1126] animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2.5 h-2.5 rounded-full bg-[#CE1126] animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
