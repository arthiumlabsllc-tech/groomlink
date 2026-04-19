export default function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <img
        src="/logo-black.png"
        alt="Loading..."
        className="w-16 h-16 animate-pulse-logo"
      />
    </div>
  );
}
