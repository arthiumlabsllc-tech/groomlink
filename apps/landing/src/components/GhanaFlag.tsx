interface GhanaFlagProps {
  className?: string
}

/**
 * Inline Ghana flag (red / gold / green with black star).
 * Replaces the 🇬 emoji, which renders as the letters "GH" on
 * platforms without flag-emoji support (e.g. Windows/Chrome).
 */
export default function GhanaFlag({ className = 'w-5 h-3.5' }: GhanaFlagProps) {
  return (
    <svg viewBox="0 0 60 40" className={`${className} rounded-[2px] flex-shrink-0`} role="img" aria-label="Ghana">
      <rect width="60" height="13.4" fill="#CE1126" />
      <rect y="13.4" width="60" height="13.3" fill="#FCD116" />
      <rect y="26.7" width="60" height="13.3" fill="#006B3F" />
      <path
        transform="translate(24, 14.2) scale(0.5)"
        d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01z"
        fill="#000000"
      />
    </svg>
  )
}
