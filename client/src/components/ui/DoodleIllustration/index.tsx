import React from 'react'
import styles from './DoodleIllustration.module.css'

export type DoodleVariant = 'recipes' | 'memories' | 'watchlist' | 'sprint' | 'shopping' | 'finance'

/**
 * DoodleIllustration
 * ------------------
 * Hand-drawn style SVG illustration for empty states.
 *
 * Props:
 * @prop {DoodleVariant} variant  — which illustration to show
 * @prop {number}        size     — width/height in px (default 96)
 * @prop {string}        className — extra class
 */
interface DoodleIllustrationProps {
  variant: DoodleVariant
  size?: number
  className?: string
}

const Recipes = () => (
  <>
    {/* Steam */}
    <path d="M35 34 C33 28 37 22 35 16" strokeWidth="2.4" strokeLinecap="round"/>
    <path d="M50 32 C48 25 52 18 50 12" strokeWidth="2.4" strokeLinecap="round"/>
    <path d="M65 34 C63 28 67 22 65 16" strokeWidth="2.4" strokeLinecap="round"/>
    {/* Lid knob */}
    <path d="M46 40 Q50 36 54 40" strokeWidth="2.2" strokeLinecap="round"/>
    {/* Lid */}
    <path d="M20 44 C32 40 68 40 80 44" strokeWidth="2.8" strokeLinecap="round"/>
    {/* Pot body */}
    <path d="M22 44 C20 58 20 70 22 78 C24 83 32 86 50 86 C68 86 76 83 78 78 C80 70 80 58 78 44" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Left handle */}
    <path d="M22 50 C11 50 9 58 22 62" strokeWidth="2.4" strokeLinecap="round"/>
    {/* Right handle */}
    <path d="M78 50 C89 50 91 58 78 62" strokeWidth="2.4" strokeLinecap="round"/>
  </>
)

const Memories = () => (
  <>
    {/* Polaroid body */}
    <rect x="18" y="22" width="64" height="64" rx="4" strokeWidth="2.5"/>
    {/* Polaroid bottom bar */}
    <path d="M18 68 C30 67 70 67 82 68" strokeWidth="2.5" strokeLinecap="round"/>
    {/* Photo placeholder */}
    <path d="M26 30 C38 29 62 29 74 30 L74 62 C62 63 38 63 26 62 Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Heart inside */}
    <path d="M50 55 C50 55 38 47 38 41 C38 37 42 35 46 38 C48 39 50 42 50 42 C50 42 52 39 54 38 C58 35 62 37 62 41 C62 47 50 55 50 55 Z" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Stars */}
    <path d="M15 18 L16 14 L17 18 L21 19 L17 20 L16 24 L15 20 L11 19 Z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M78 16 L79 13 L80 16 L83 17 L80 18 L79 21 L78 18 L75 17 Z" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M84 72 L85 70 L86 72 L88 73 L86 74 L85 76 L84 74 L82 73 Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </>
)

const Watchlist = () => (
  <>
    {/* Clapperboard body */}
    <rect x="15" y="38" width="70" height="50" rx="3" strokeWidth="2.5"/>
    {/* Clapperboard top part */}
    <path d="M15 38 C30 36 70 36 85 38 L85 52 C70 54 30 54 15 52 Z" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Clapperboard diagonal stripes */}
    <path d="M24 38 L30 52" strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M38 36 L44 52" strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M52 36 L58 52" strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M66 36 L72 52" strokeWidth="2.2" strokeLinecap="round"/>
    {/* Hinge */}
    <path d="M15 45 C30 44 70 44 85 45" strokeWidth="1.8" strokeLinecap="round"/>
    {/* Play triangle */}
    <path d="M42 66 L42 82 L62 74 Z" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </>
)

const Sprint = () => (
  <>
    {/* Pencil body */}
    <path d="M28 76 L66 18" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" opacity="0.08"/>
    <path d="M30 74 L68 16" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M22 80 L30 74" strokeWidth="2.5" strokeLinecap="round"/>
    {/* Pencil tip */}
    <path d="M22 80 L18 84 L24 82 Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Eraser */}
    <path d="M64 18 L70 14 L74 20 L68 24 Z" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Pencil line divider */}
    <path d="M56 30 L62 26" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="0"/>
    {/* Checkmark */}
    <path d="M58 62 L65 72 L80 52" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Stars */}
    <path d="M14 32 L15.5 28 L17 32 L21 33 L17 34 L15.5 38 L14 34 L10 33 Z" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M72 78 L73 75 L74 78 L77 79 L74 80 L73 83 L72 80 L69 79 Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </>
)

const Shopping = () => (
  <>
    {/* Bag body */}
    <path d="M20 42 C19 58 18 72 20 82 C21 86 26 88 50 88 C74 88 79 86 80 82 C82 72 81 58 80 42 Z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Bag top */}
    <path d="M18 42 C30 40 70 40 82 42" strokeWidth="2.8" strokeLinecap="round"/>
    {/* Left handle */}
    <path d="M32 42 C30 30 36 22 42 24 C48 26 48 38 46 42" strokeWidth="2.4" strokeLinecap="round"/>
    {/* Right handle */}
    <path d="M54 42 C52 38 52 26 58 24 C64 22 70 30 68 42" strokeWidth="2.4" strokeLinecap="round"/>
    {/* Items inside */}
    <path d="M34 62 Q50 58 66 62" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3"/>
    <path d="M36 72 Q50 68 64 72" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3"/>
    {/* Star */}
    <path d="M82 24 L83.5 20 L85 24 L89 25 L85 26 L83.5 30 L82 26 L78 25 Z" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </>
)

const Finance = () => (
  <>
    {/* Coin stack bottom */}
    <ellipse cx="50" cy="80" rx="28" ry="8" strokeWidth="2.4"/>
    <path d="M22 80 C22 72 78 72 78 80" strokeWidth="2.4" strokeLinecap="round"/>
    {/* Coin stack middle */}
    <ellipse cx="50" cy="68" rx="28" ry="8" strokeWidth="2.4"/>
    <path d="M22 68 C22 60 78 60 78 68" strokeWidth="2.4" strokeLinecap="round"/>
    {/* Coin stack top */}
    <ellipse cx="50" cy="56" rx="28" ry="8" strokeWidth="2.4"/>
    {/* ₴ symbol on top coin */}
    <path d="M44 52 L44 60 M56 52 L56 60" strokeWidth="2" strokeLinecap="round"/>
    <path d="M41 54 L59 54 M41 58 L59 58" strokeWidth="2" strokeLinecap="round"/>
    {/* Sparkles */}
    <path d="M18 30 L19 26 L20 30 L24 31 L20 32 L19 36 L18 32 L14 31 Z" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M76 22 L77 19 L78 22 L81 23 L78 24 L77 27 L76 24 L73 23 Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M84 44 L85 42 L86 44 L88 45 L86 46 L85 48 L84 46 L82 45 Z" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </>
)

const ILLUSTRATIONS: Record<DoodleVariant, React.ReactNode> = {
  recipes:  <Recipes />,
  memories: <Memories />,
  watchlist: <Watchlist />,
  sprint:   <Sprint />,
  shopping: <Shopping />,
  finance:  <Finance />,
}

const DoodleIllustration: React.FC<DoodleIllustrationProps> = ({ variant, size = 96, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    stroke="currentColor"
    className={`${styles.illustration} ${className ?? ''}`}
    aria-hidden="true"
  >
    {ILLUSTRATIONS[variant]}
  </svg>
)

export default DoodleIllustration
