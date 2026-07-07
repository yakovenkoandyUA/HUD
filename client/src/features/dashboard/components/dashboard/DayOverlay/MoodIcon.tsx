import React from 'react'

/**
 * MoodIcon
 * --------
 * 5 абстрактних SVG-ікон настрою (1–5).
 * Без emoji — кожна ікона геометрична, мінімалістична.
 *
 * Props:
 * @prop {number}  score   — 1..5
 * @prop {boolean} active  — підсвітка акцентом
 * @prop {number}  size    — розмір SVG (default 36)
 */
interface MoodIconProps {
  score: 1 | 2 | 3 | 4 | 5
  active?: boolean
  size?: number
  color?: string
}

const MoodIcon: React.FC<MoodIconProps> = ({ score, active = false, size = 36, color: colorProp }) => {
  const color = colorProp ?? (active ? 'var(--accent)' : 'var(--text3)')

  const icons: Record<number, React.ReactNode> = {
    // 1 — broken circle (важко)
    1: (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="13" stroke={color} strokeWidth="2" strokeDasharray="4 3" />
        <line x1="14" y1="24" x2="22" y2="24" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx="13" cy="15" r="2" fill={color} />
        <circle cx="23" cy="15" r="2" fill={color} />
        <line x1="13" y1="13" x2="11" y2="11" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="23" y1="13" x2="25" y2="11" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    // 2 — flat face (так собі)
    2: (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="13" stroke={color} strokeWidth="2" />
        <line x1="13" y1="23" x2="23" y2="23" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx="13" cy="15" r="1.5" fill={color} />
        <circle cx="23" cy="15" r="1.5" fill={color} />
      </svg>
    ),
    // 3 — slight curve (нормально)
    3: (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="13" stroke={color} strokeWidth="2" />
        <path d="M13 22 Q18 25 23 22" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
        <circle cx="13" cy="15" r="1.5" fill={color} />
        <circle cx="23" cy="15" r="1.5" fill={color} />
      </svg>
    ),
    // 4 — wide smile (добре)
    4: (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="13" stroke={color} strokeWidth="2" />
        <path d="M12 21 Q18 27 24 21" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
        <circle cx="13" cy="14" r="2" fill={color} />
        <circle cx="23" cy="14" r="2" fill={color} />
      </svg>
    ),
    // 5 — radiant burst (чудово)
    5: (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="11" stroke={color} strokeWidth="2" />
        <path d="M11 22 Q18 29 25 22" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <circle cx="13" cy="14" r="2.5" fill={color} />
        <circle cx="23" cy="14" r="2.5" fill={color} />
        <line x1="18" y1="4"  x2="18" y2="7"  stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="18" y1="29" x2="18" y2="32" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="4"  y1="18" x2="7"  y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="29" y1="18" x2="32" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="8"  y1="8"  x2="10" y2="10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="28" y1="8"  x2="26" y2="10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="8"  y1="28" x2="10" y2="26" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="28" y1="28" x2="26" y2="26" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  }

  return <>{icons[score]}</>
}

export default MoodIcon
