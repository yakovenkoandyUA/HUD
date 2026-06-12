import React, { useEffect, useState } from 'react'
import { useProfileStore } from '../../../store/profileStore'
import { useUiStore } from '../../../store/uiStore'
import styles from './GreetingBlock.module.css'

/**
 * GreetingBlock
 * -------------
 * Персоналізований вітальний блок з іменем, часовим привітанням, датою
 * та тематичною SVG-ілюстрацією на фоні.
 */

const DAYS = ['Неділя','Понеділок','Вівторок','Середа','Четвер','Пятниця','Субота']
const MONTHS = ['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня']

function greeting(h: number): string {
  if (h < 6)  return 'Добраніч'
  if (h < 12) return 'Доброго ранку'
  if (h < 18) return 'Добрий день'
  return 'Добрий вечір'
}

function formatDate(d: Date): string {
  return `${DAYS[d.getDay()]} · ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/* ── SVG illustrations per theme ─────────────────────────────────── */

const CastleIllustration: React.FC = () => (
  <svg viewBox="0 0 280 100" preserveAspectRatio="xMaxYMax meet" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <polygon points="96,100 96,72 118,72 118,58 138,58 138,68 158,68 158,48 184,48 184,62 204,62 204,38 232,38 232,100" opacity="0.35"/>
    <rect x="210" y="28" width="48" height="72" opacity="0.95"/>
    <rect x="204" y="28" width="10" height="10"/>
    <rect x="222" y="20" width="10" height="18"/>
    <rect x="240" y="20" width="10" height="18"/>
    <rect x="254" y="28" width="10" height="10"/>
    <rect x="154" y="44" width="38" height="56" opacity="0.75"/>
    <rect x="150" y="36" width="10" height="12"/>
    <rect x="168" y="32" width="10" height="16"/>
    <rect x="186" y="36" width="10" height="12"/>
    <rect x="112" y="64" width="54" height="36" opacity="0.55"/>
    <polygon points="104,64 139,42 174,64" opacity="0.45"/>
    <path d="M226 100V78a10 10 0 0 1 20 0v22Z" fill="var(--bg)"/>
    <path d="M166 100V82a7 7 0 0 1 14 0v18Z" fill="var(--bg)" opacity="0.9"/>
    <path d="M122 100V86a6 6 0 0 1 12 0v14Z" fill="var(--bg)" opacity="0.8"/>
    <path d="M226 55V45a5 5 0 0 1 10 0v10Z" fill="var(--bg)" opacity="0.75"/>
    <path d="M244 55V45a5 5 0 0 1 10 0v10Z" fill="var(--bg)" opacity="0.75"/>
    <circle cx="198" cy="70" r="4" fill="var(--bg)" opacity="0.65"/>
    <polygon points="88,100 280,100 280,88 96,92" opacity="0.25"/>
  </svg>
)

const JapanIllustration: React.FC = () => (
  <svg viewBox="0 0 280 100" preserveAspectRatio="xMaxYMax meet" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <polygon points="124,100 200,20 276,100" opacity="0.25"/>
    <polygon points="184,38 200,20 218,40 207,36 198,44" fill="var(--bg)" opacity="0.85"/>
    <ellipse cx="205" cy="102" rx="86" ry="16" opacity="0.18"/>
    <rect x="158" y="54" width="92" height="8" opacity="0.95"/>
    <rect x="148" y="46" width="112" height="10"/>
    <polygon points="144,46 264,46 252,38 156,38"/>
    <rect x="166" y="58" width="10" height="42" opacity="0.9"/>
    <rect x="232" y="58" width="10" height="42" opacity="0.9"/>
    <rect x="174" y="72" width="60" height="7" opacity="0.85"/>
    <rect x="178" y="80" width="52" height="20" fill="var(--bg)" opacity="0.95"/>
    <path d="M106 45 C130 32 154 32 181 42 L178 47 C151 38 128 38 109 51Z" opacity="0.45"/>
    <circle cx="126" cy="37" r="5" opacity="0.35"/>
    <circle cx="144" cy="34" r="4" opacity="0.3"/>
    <circle cx="160" cy="40" r="5" opacity="0.32"/>
    <circle cx="118" cy="49" r="3" opacity="0.28"/>
    <polygon points="96,100 280,100 280,90 160,88" opacity="0.22"/>
  </svg>
)

const CyberIllustration: React.FC = () => (
  <svg viewBox="0 0 280 100" preserveAspectRatio="xMaxYMax meet" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="104" y="66" width="22" height="34" opacity="0.35"/>
    <rect x="130" y="54" width="28" height="46" opacity="0.5"/>
    <rect x="164" y="44" width="24" height="56" opacity="0.65"/>
    <rect x="192" y="34" width="34" height="66" opacity="0.75"/>
    <rect x="234" y="22" width="34" height="78" opacity="0.95"/>
    <polygon points="238,22 251,8 264,22"/>
    <rect x="250" y="0" width="4" height="14"/>
    <rect x="108" y="74" width="14" height="4" fill="var(--bg)" opacity="0.8"/>
    <rect x="134" y="62" width="20" height="4" fill="var(--bg)" opacity="0.75"/>
    <rect x="134" y="76" width="20" height="4" fill="var(--bg)" opacity="0.75"/>
    <rect x="168" y="54" width="16" height="4" fill="var(--bg)" opacity="0.8"/>
    <rect x="168" y="68" width="16" height="4" fill="var(--bg)" opacity="0.8"/>
    <rect x="196" y="46" width="26" height="5" fill="var(--bg)" opacity="0.85"/>
    <rect x="196" y="62" width="26" height="5" fill="var(--bg)" opacity="0.85"/>
    <rect x="240" y="36" width="22" height="5" fill="var(--bg)" opacity="0.9"/>
    <rect x="240" y="52" width="22" height="5" fill="var(--bg)" opacity="0.9"/>
    <rect x="240" y="68" width="22" height="5" fill="var(--bg)" opacity="0.9"/>
    <rect x="176" y="32" width="44" height="8" opacity="0.28"/>
    <rect x="112" y="88" width="160" height="12" opacity="0.28"/>
    <circle cx="252" cy="16" r="7" opacity="0.25"/>
  </svg>
)

const NoirIllustration: React.FC = () => (
  <svg viewBox="0 0 280 100" preserveAspectRatio="xMaxYMax meet" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="230" y="38" width="38" height="62" opacity="0.95"/>
    <rect x="236" y="28" width="26" height="10"/>
    <rect x="242" y="18" width="14" height="10"/>
    <polygon points="249,6 258,18 240,18"/>
    <rect x="186" y="52" width="34" height="48" opacity="0.65"/>
    <rect x="150" y="64" width="28" height="36" opacity="0.45"/>
    <rect x="236" y="48" width="24" height="4" fill="var(--bg)" opacity="0.7"/>
    <rect x="236" y="62" width="24" height="4" fill="var(--bg)" opacity="0.7"/>
    <rect x="236" y="76" width="24" height="4" fill="var(--bg)" opacity="0.7"/>
    <rect x="192" y="64" width="20" height="4" fill="var(--bg)" opacity="0.65"/>
    <rect x="192" y="78" width="20" height="4" fill="var(--bg)" opacity="0.65"/>
    <rect x="196" y="40" width="16" height="10" opacity="0.8"/>
    <rect x="199" y="30" width="10" height="10" opacity="0.8"/>
    <rect x="198" y="50" width="3" height="12"/>
    <rect x="207" y="50" width="3" height="12"/>
    <rect x="112" y="58" width="5" height="42" opacity="0.75"/>
    <path d="M106 58a9 9 0 0 1 18 0v5h-18Z" opacity="0.75"/>
    <ellipse cx="115" cy="62" rx="11" ry="5" opacity="0.22"/>
    <rect x="136" y="20" width="2" height="28" opacity="0.18"/>
    <rect x="162" y="12" width="2" height="30" opacity="0.16"/>
    <rect x="224" y="10" width="2" height="34" opacity="0.18"/>
    <rect x="268" y="28" width="2" height="30" opacity="0.16"/>
    <polygon points="96,100 280,100 280,88 124,91" opacity="0.25"/>
  </svg>
)

const PixelIllustration: React.FC = () => (
  <svg viewBox="0 0 280 100" preserveAspectRatio="xMaxYMax meet" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="104" y="88" width="176" height="8" opacity="0.25"/>
    <rect x="112" y="80" width="160" height="8" opacity="0.18"/>
    <polygon points="104,88 136,56 168,88" opacity="0.35"/>
    <polygon points="144,88 192,40 240,88" opacity="0.45"/>
    <polygon points="192,88 232,48 272,88" opacity="0.3"/>
    <rect x="184" y="48" width="16" height="8" fill="var(--bg)" opacity="0.8"/>
    <rect x="200" y="56" width="8" height="8" fill="var(--bg)" opacity="0.8"/>
    <rect x="232" y="72" width="40" height="24" opacity="0.9"/>
    <rect x="224" y="64" width="16" height="32" opacity="0.9"/>
    <rect x="256" y="56" width="16" height="40"/>
    <rect x="224" y="56" width="8" height="8"/>
    <rect x="240" y="64" width="8" height="8"/>
    <rect x="256" y="48" width="8" height="8"/>
    <rect x="272" y="56" width="8" height="8"/>
    <rect x="240" y="80" width="8" height="16" fill="var(--bg)" opacity="0.9"/>
    <rect x="264" y="72" width="8" height="8" fill="var(--bg)" opacity="0.8"/>
    <rect x="128" y="64" width="8" height="32" opacity="0.75"/>
    <rect x="120" y="48" width="24" height="16" opacity="0.75"/>
    <rect x="112" y="56" width="40" height="8" opacity="0.75"/>
    <rect x="136" y="40" width="16" height="16" opacity="0.65"/>
    <rect x="120" y="24" width="24" height="8" opacity="0.22"/>
    <rect x="144" y="32" width="24" height="8" opacity="0.22"/>
    <rect x="216" y="16" width="32" height="8" opacity="0.18"/>
    <rect x="248" y="24" width="16" height="8" opacity="0.18"/>
  </svg>
)

/* ── Component ───────────────────────────────────────────────────── */

const GreetingBlock: React.FC = () => {
  const name  = useProfileStore(s => s.activeProfile?.name ?? '')
  const theme = useUiStore(s => s.theme)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const greet   = greeting(now.getHours())
  const dateStr = formatDate(now)

  return (
    <div className={styles.card}>
      <div className={styles.illustration} aria-hidden>
        {theme === 'castle' && <CastleIllustration />}
        {theme === 'japan'  && <JapanIllustration />}
        {theme === 'cyber'  && <CyberIllustration />}
        {theme === 'noir'   && <NoirIllustration />}
        {theme === 'pixel'  && <PixelIllustration />}
      </div>

      <div className={styles.content}>
        <span className={styles.greetText}>{greet}</span>
        <span className={styles.name}>{name}</span>
        <span className={styles.date}>{dateStr}</span>
      </div>
    </div>
  )
}

export default GreetingBlock
