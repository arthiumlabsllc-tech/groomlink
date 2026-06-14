import { useDarkMode } from '../hooks/useDarkMode';

export default function LoadingScreen() {
  const { isDark } = useDarkMode();
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <img
        src={isDark ? "/logo-white.png" : "/logo-black.png"}
        alt="Loading..."
        className="w-16 h-16 animate-pulse-logo"
      />
    </div>
  );
}
