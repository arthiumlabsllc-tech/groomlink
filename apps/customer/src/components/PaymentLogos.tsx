// Payment provider logo components with official brand colors and styling

export function MTNLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#FFCC00"/>
      <path d="M30 65V35L50 50L70 35V65" stroke="#000000" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M38 50V65" stroke="#000000" strokeWidth="4" strokeLinecap="round"/>
      <path d="M62 50V65" stroke="#000000" strokeWidth="4" strokeLinecap="round"/>
      <text x="50" y="82" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#000000" fontFamily="Arial">MoMo</text>
    </svg>
  );
}

export function VodafoneLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#E60000"/>
      <path d="M35 35C35 35 45 28 55 35C65 42 55 55 55 55C55 55 65 62 75 55" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round"/>
      <circle cx="35" cy="65" r="6" fill="#FFFFFF"/>
      <text x="50" y="82" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#FFFFFF" fontFamily="Arial">Cash</text>
    </svg>
  );
}

export function AirtelTigoLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="atGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E60000"/>
          <stop offset="100%" stopColor="#0066CC"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#atGrad)"/>
      <path d="M30 50C30 40 40 30 50 30C60 30 70 40 70 50C70 60 60 70 50 70" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round"/>
      <circle cx="50" cy="50" r="8" fill="#FFFFFF"/>
      <text x="50" y="82" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#FFFFFF" fontFamily="Arial">Money</text>
    </svg>
  );
}
