import React from 'react'

/**
 * MimirIcon
 * ---------
 * Символ криниці Мімора — ᛟ-подібна руна з крапкою глибини.
 * Використовується для всіх AI-функцій у проекті.
 * "DRINK DEEP" — пий глибше, дізнайся більше.
 *
 * Props:
 * @prop {number} size — розмір іконки в px (default: 14)
 */
interface MimirIconProps {
  size?: number
}

const MimirIcon: React.FC<MimirIconProps> = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 14 14"
    fill="none"
    aria-hidden
  >
    <path
      d="M7 1 L13 6 L7 11 L1 6 Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <line x1="3.5" y1="9.5" x2="3.5" y2="13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <line x1="10.5" y1="9.5" x2="10.5" y2="13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="7" cy="6.5" r="1.2" fill="currentColor"/>
  </svg>
)

export default MimirIcon
