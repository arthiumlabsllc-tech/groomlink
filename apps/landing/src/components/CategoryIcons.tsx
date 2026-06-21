// Professional salon category icons - clean line-art style like Booksy
// All icons use stroke only (no fill), monochrome with currentColor

interface IconProps {
  className?: string
}

// Hair / Haircut - Scissors cutting hair strand
export const HaircutIcon = ({ className = "w-8 h-8" }: IconProps) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Hair strand */}
    <path d="M12 8c0 0 2 12 2 20c0 4-2 8-2 12" />
    <path d="M18 8c0 0 1.5 10 1.5 18c0 3-1.5 7-1.5 10" />
    {/* Scissors */}
    <circle cx="32" cy="14" r="3" />
    <circle cx="32" cy="26" r="3" />
    <path d="M29.5 16L20 36" />
    <path d="M29.5 24L20 36" />
    <path d="M20 36L16 42" />
    <path d="M20 36L24 42" />
  </svg>
)

// Barber - Classic barber scissors with comb
export const BarberIcon = ({ className = "w-8 h-8" }: IconProps) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Comb */}
    <rect x="8" y="10" width="6" height="28" rx="1" />
    <line x1="10" y1="14" x2="10" y2="34" />
    <line x1="12" y1="14" x2="12" y2="34" />
    {/* Scissors */}
    <circle cx="32" cy="16" r="3" />
    <circle cx="32" cy="28" r="3" />
    <path d="M29 18L20 38" />
    <path d="M29 26L20 38" />
    <path d="M20 38L17 42" />
    <path d="M20 38L23 42" />
  </svg>
)

// Nails - Nail polish bottle with brush
export const NailsIcon = ({ className = "w-8 h-8" }: IconProps) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Bottle body */}
    <rect x="14" y="20" width="14" height="20" rx="2" />
    {/* Bottle cap/neck */}
    <rect x="17" y="14" width="8" height="6" />
    {/* Brush handle */}
    <line x1="34" y1="8" x2="34" y2="28" />
    {/* Brush bristles */}
    <path d="M30 28h8l-2 6h-4z" />
    {/* Polish drop */}
    <path d="M36 34c0 2 2 4 2 6c0 2-1.5 4-3 4s-3-2-3-4c0-2 2-4 2-6" />
  </svg>
)

// Braiding - Braided hair pattern
export const BraidingIcon = ({ className = "w-8 h-8" }: IconProps) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Three interwoven strands showing braid pattern */}
    <path d="M12 8c4 4 4 10 0 14s-4 10 0 14" />
    <path d="M24 8c-4 4-4 10 0 14s4 10 0 14" />
    <path d="M18 8c4 4 4 10 0 14s-4 10 0 14" />
    {/* Cross pattern showing interweave */}
    <path d="M12 15l6 3" />
    <path d="M24 15l-6 3" />
    <path d="M12 29l6 3" />
    <path d="M24 29l-6 3" />
    {/* Bottom tie */}
    <ellipse cx="18" cy="40" rx="4" ry="2" />
  </svg>
)

// Massage - Two hands in massage/spa position
export const MassageIcon = ({ className = "w-8 h-8" }: IconProps) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Left hand */}
    <ellipse cx="16" cy="28" rx="6" ry="8" transform="rotate(-20 16 28)" />
    <path d="M12 22c-2-2-2-5 0-7" />
    <path d="M16 20c-1-2-1-4 0-6" />
    <path d="M20 22c2-2 2-5 0-7" />
    {/* Right hand */}
    <ellipse cx="32" cy="28" rx="6" ry="8" transform="rotate(20 32 28)" />
    <path d="M28 22c-2-2-2-5 0-7" />
    <path d="M32 20c-1-2-1-4 0-6" />
    <path d="M36 22c2-2 2-5 0-7" />
    {/* Spa/relaxation waves */}
    <path d="M14 38c4 2 8 2 12 0s8-2 12 0" />
  </svg>
)

// Dreadlocks - Dreadlock hair strands
export const DreadlocksIcon = ({ className = "w-8 h-8" }: IconProps) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Multiple dreadlock strands */}
    <path d="M12 8c0 4 2 8 2 14c0 6-2 12-2 18" />
    <path d="M18 6c0 4 1.5 9 1.5 15c0 6-1.5 13-1.5 19" />
    <path d="M24 8c0 4 2 8 2 14c0 6-2 12-2 18" />
    <path d="M30 6c0 4 1.5 9 1.5 15c0 6-1.5 13-1.5 19" />
    <path d="M36 8c0 4 2 8 2 14c0 6-2 12-2 18" />
    {/* Texture lines on locks */}
    <line x1="13" y1="16" x2="15" y2="16" />
    <line x1="18.5" y1="14" x2="20.5" y2="14" />
    <line x1="25" y1="16" x2="27" y2="16" />
    <line x1="30.5" y1="14" x2="32.5" y2="14" />
    <line x1="37" y1="16" x2="39" y2="16" />
  </svg>
)

// Makeup - Lipstick with cap
export const MakeupIcon = ({ className = "w-8 h-8" }: IconProps) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Lipstick base/case */}
    <rect x="14" y="24" width="8" height="16" rx="1" />
    {/* Lipstick bullet */}
    <path d="M16 24v-6c0-2 2-4 4-4s4 2 4 4v6" />
    <path d="M16 18c0-2 2-4 4-4s4 2 4 4" />
    {/* Makeup brush */}
    <line x1="32" y1="8" x2="32" y2="28" />
    <path d="M28 28h8l-2 8h-4z" />
    {/* Powder puff/sponge hint */}
    <circle cx="34" cy="38" r="3" />
  </svg>
)

// Skin Care - Face with leaf/facial treatment
export const SkinCareIcon = ({ className = "w-8 h-8" }: IconProps) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Face outline */}
    <ellipse cx="24" cy="22" rx="12" ry="14" />
    {/* Eyes - closed/relaxed for spa */}
    <path d="M18 20c1-1 3-1 4 0" />
    <path d="M26 20c1-1 3-1 4 0" />
    {/* Serene smile */}
    <path d="M20 30c2 2 6 2 8 0" />
    {/* Leaf/plant for natural care */}
    <path d="M36 8c4 2 6 6 4 10c-2-2-6-2-8-4c2-2 4-6 4-6z" />
    <path d="M38 12c-2 4-4 6-6 8" />
    {/* Drop for serum/moisture */}
    <path d="M12 36c0 3 2.5 5 5 5s5-2 5-5c0-3-5-8-5-8s-5 5-5 8z" />
  </svg>
)

// Export all icons in a map for easy access
export const categoryIcons = {
  Hair: HaircutIcon,
  Haircut: HaircutIcon,
  Styling: HaircutIcon,
  Barber: BarberIcon,
  'Cuts & Fades': BarberIcon,
  Nails: NailsIcon,
  Braiding: BraidingIcon,
  Massage: MassageIcon,
  Dreadlocks: DreadlocksIcon,
  Makeup: MakeupIcon,
  'Skin Care': SkinCareIcon,
  Skincare: SkinCareIcon,
}

// Default icon size presets
export const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-7 h-7',
  xl: 'w-8 h-8',
}
