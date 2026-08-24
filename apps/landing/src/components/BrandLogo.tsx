import { useDarkMode } from '../hooks/useDarkMode'

interface BrandLogoProps {
  /** 'auto' follows the system color scheme; 'dark'/'light' force the variant */
  scheme?: 'auto' | 'dark' | 'light'
  /** Wrapper sizing classes (controls overall height) */
  className?: string
  /** Wordmark text sizing classes */
  wordmarkClassName?: string
}

/**
 * Composite brand logo: clean GL monogram asset + HTML wordmark.
 * The old full-logo PNGs shipped with a broken wordmark glyph, so the
 * wordmark is rendered as theme-aware text (Poppins, wide tracking) to
 * stay crisp and correct in both light and dark mode.
 */
export default function BrandLogo({
  scheme = 'auto',
  className = '',
  wordmarkClassName = 'text-[9px]',
}: BrandLogoProps) {
  const systemDark = useDarkMode()
  const dark = scheme === 'dark' || (scheme === 'auto' && systemDark)

  return (
    <span className={`inline-flex flex-col items-center justify-center leading-none select-none ${className}`}>
      <img
        src={dark ? '/logo-white.png' : '/logo-black.png'}
        alt=""
        className="h-[62%] w-auto"
      />
      <span
        className={`font-display font-medium tracking-[0.32em] -mr-[0.32em] mt-[0.35em] ${
          dark ? 'text-white' : 'text-[#1A1A1A]'
        } ${wordmarkClassName}`}
      >
        GROOMLINK
      </span>
    </span>
  )
}
