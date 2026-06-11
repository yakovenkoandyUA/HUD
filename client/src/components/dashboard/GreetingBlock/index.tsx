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
    {/* Ground */}
    <rect x="0" y="97" width="280" height="3"/>
    {/* Far-left low wall */}
    <rect x="0" y="72" width="62" height="25" opacity="0.5"/>
    {/* Left small tower */}
    <rect x="12" y="50" width="34" height="47" opacity="0.65"/>
    <rect x="12" y="40" width="8" height="12" opacity="0.65"/>
    <rect x="25" y="40" width="8" height="12" opacity="0.65"/>
    <rect x="38" y="40" width="8" height="12" opacity="0.65"/>
    {/* Connector wall */}
    <rect x="46" y="64" width="60" height="33" opacity="0.60"/>
    {/* Central keep */}
    <rect x="106" y="26" width="84" height="71" opacity="0.82"/>
    <rect x="106" y="15" width="12" height="13" opacity="0.82"/>
    <rect x="124" y="15" width="12" height="13" opacity="0.82"/>
    <rect x="142" y="15" width="12" height="13" opacity="0.82"/>
    <rect x="160" y="15" width="12" height="13" opacity="0.82"/>
    <rect x="178" y="15" width="12" height="13" opacity="0.82"/>
    {/* Gate arch — cut through keep */}
    <path d="M133 97 L133 75 A15 15 0 0 0 163 75 L163 97 Z" fill="var(--surface)"/>
    {/* Main tower (right, tallest) */}
    <rect x="200" y="2" width="80" height="95" opacity="1"/>
    <rect x="200" y="-8" width="16" height="14" opacity="1"/>
    <rect x="221" y="-8" width="16" height="14" opacity="1"/>
    <rect x="242" y="-8" width="16" height="14" opacity="1"/>
    <rect x="264" y="-8" width="14" height="14" opacity="1"/>
    {/* Tower arrow-slit windows */}
    <rect x="214" y="20" width="11" height="18" fill="var(--surface)" opacity="0.7"/>
    <rect x="252" y="20" width="11" height="18" fill="var(--surface)" opacity="0.7"/>
    <rect x="214" y="52" width="11" height="15" fill="var(--surface)" opacity="0.5"/>
    <rect x="252" y="52" width="11" height="15" fill="var(--surface)" opacity="0.5"/>
  </svg>
)

const JapanIllustration: React.FC = () => (
  <svg viewBox="0 0 280 100" preserveAspectRatio="xMaxYMax meet" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    {/* Ground */}
    <rect x="0" y="97" width="280" height="3" opacity="0.4"/>
    {/* Mount Fuji silhouette */}
    <polygon points="140,8 15,97 265,97" opacity="0.22"/>
    {/* Snow cap cutout */}
    <polygon points="140,8 118,42 162,42" fill="var(--bg)" opacity="0.9"/>
    {/* Torii: left pillar */}
    <rect x="82" y="36" width="12" height="61" opacity="0.95"/>
    {/* Torii: right pillar */}
    <rect x="186" y="36" width="12" height="61" opacity="0.95"/>
    {/* Torii: kasagi (top curved beam) */}
    <path d="M68 40 Q140 25 212 40 L212 50 Q140 36 68 50 Z" opacity="0.95"/>
    {/* Torii: middle nuki beam */}
    <rect x="78" y="58" width="124" height="8" opacity="0.85"/>
    {/* Small shimagi (bottom small cross-beams) */}
    <rect x="80" y="54" width="7" height="43" opacity="0.7"/>
    <rect x="193" y="54" width="7" height="43" opacity="0.7"/>
  </svg>
)

const CyberIllustration: React.FC = () => (
  <svg viewBox="0 0 280 100" preserveAspectRatio="xMaxYMax meet" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    {/* Ground */}
    <rect x="0" y="97" width="280" height="3" opacity="0.5"/>
    {/* Building 1 — far right, tallest */}
    <rect x="228" y="5" width="52" height="92" opacity="1"/>
    {/* B1 antenna */}
    <rect x="252" y="-12" width="3" height="19" opacity="1"/>
    <rect x="248" y="-5" width="11" height="2" opacity="0.7"/>
    {/* B1 window strips */}
    <rect x="233" y="15" width="42" height="3" fill="var(--surface)" opacity="0.4"/>
    <rect x="233" y="25" width="42" height="3" fill="var(--surface)" opacity="0.3"/>
    <rect x="233" y="40" width="42" height="3" fill="var(--surface)" opacity="0.4"/>
    <rect x="233" y="55" width="42" height="3" fill="var(--surface)" opacity="0.3"/>
    <rect x="233" y="70" width="42" height="3" fill="var(--surface)" opacity="0.4"/>
    {/* Building 2 — medium right */}
    <rect x="170" y="28" width="46" height="69" opacity="0.85"/>
    <rect x="192" y="20" width="2" height="10" opacity="0.85"/>
    {/* B2 windows */}
    <rect x="175" y="35" width="36" height="2" fill="var(--surface)" opacity="0.35"/>
    <rect x="175" y="50" width="36" height="2" fill="var(--surface)" opacity="0.35"/>
    <rect x="175" y="65" width="36" height="2" fill="var(--surface)" opacity="0.35"/>
    {/* Building 3 — medium left */}
    <rect x="108" y="18" width="50" height="79" opacity="0.80"/>
    <rect x="132" y="8" width="2" height="12" opacity="0.80"/>
    {/* B3 windows */}
    <rect x="113" y="28" width="40" height="3" fill="var(--surface)" opacity="0.35"/>
    <rect x="113" y="42" width="40" height="3" fill="var(--surface)" opacity="0.35"/>
    <rect x="113" y="56" width="40" height="3" fill="var(--surface)" opacity="0.35"/>
    <rect x="113" y="70" width="40" height="3" fill="var(--surface)" opacity="0.35"/>
    {/* Building 4 — short left */}
    <rect x="50" y="50" width="44" height="47" opacity="0.65"/>
    {/* Building 5 — tiny far left */}
    <rect x="5" y="68" width="34" height="29" opacity="0.45"/>
  </svg>
)

const NoirIllustration: React.FC = () => (
  <svg viewBox="0 0 280 100" preserveAspectRatio="xMaxYMax meet" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    {/* Ground */}
    <rect x="0" y="97" width="280" height="3" opacity="0.5"/>
    {/* Art deco right tower (stepped top) */}
    <rect x="218" y="52" width="62" height="45" opacity="1"/>
    <rect x="224" y="38" width="50" height="16" opacity="1"/>
    <rect x="230" y="26" width="38" height="14" opacity="1"/>
    <rect x="236" y="14" width="26" height="14" opacity="1"/>
    <rect x="242" y="5" width="14" height="11" opacity="1"/>
    {/* Water tower on right building */}
    <rect x="244" y="-2" width="10" height="7" opacity="0.9"/>
    <rect x="242" y="-5" width="14" height="4" opacity="0.8"/>
    <rect x="246" y="5" width="2" height="10" opacity="0.7"/>
    <rect x="251" y="5" width="2" height="10" opacity="0.7"/>
    {/* Center building (classic skyscraper) */}
    <rect x="148" y="20" width="56" height="77" opacity="0.82"/>
    <rect x="158" y="10" width="36" height="12" opacity="0.82"/>
    <rect x="164" y="2" width="24" height="10" opacity="0.82"/>
    {/* Windows */}
    <rect x="155" y="28" width="8" height="10" fill="var(--surface)" opacity="0.45"/>
    <rect x="170" y="28" width="8" height="10" fill="var(--surface)" opacity="0.45"/>
    <rect x="186" y="28" width="8" height="10" fill="var(--surface)" opacity="0.45"/>
    <rect x="155" y="48" width="8" height="10" fill="var(--surface)" opacity="0.35"/>
    <rect x="170" y="48" width="8" height="10" fill="var(--surface)" opacity="0.35"/>
    <rect x="186" y="48" width="8" height="10" fill="var(--surface)" opacity="0.35"/>
    {/* Left building */}
    <rect x="80" y="35" width="52" height="62" opacity="0.70"/>
    <rect x="88" y="25" width="36" height="12" opacity="0.70"/>
    {/* Far-left building */}
    <rect x="15" y="55" width="50" height="42" opacity="0.50"/>
  </svg>
)

const PixelIllustration: React.FC = () => (
  <svg viewBox="0 0 280 100" preserveAspectRatio="xMaxYMax meet" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    {/* Ground */}
    <rect x="0" y="88" width="280" height="12" opacity="0.7"/>
    {/* Right mountain (stepped) */}
    <rect x="200" y="72" width="80" height="16" opacity="0.8"/>
    <rect x="208" y="56" width="64" height="16" opacity="0.8"/>
    <rect x="216" y="40" width="48" height="16" opacity="0.8"/>
    <rect x="224" y="24" width="32" height="16" opacity="0.8"/>
    <rect x="232" y="8"  width="16" height="16" opacity="0.8"/>
    {/* Center mountain (shorter) */}
    <rect x="104" y="72" width="64" height="16" opacity="0.65"/>
    <rect x="112" y="56" width="48" height="16" opacity="0.65"/>
    <rect x="120" y="40" width="32" height="16" opacity="0.65"/>
    <rect x="128" y="24" width="16" height="16" opacity="0.65"/>
    {/* Left hill */}
    <rect x="24"  y="72" width="48" height="16" opacity="0.50"/>
    <rect x="32"  y="56" width="32" height="16" opacity="0.50"/>
    <rect x="40"  y="40" width="16" height="16" opacity="0.50"/>
    {/* Cloud 1 (pixel) */}
    <rect x="40"  y="10" width="8"  height="8"  opacity="0.55"/>
    <rect x="48"  y="6"  width="16" height="8"  opacity="0.55"/>
    <rect x="64"  y="10" width="8"  height="8"  opacity="0.55"/>
    <rect x="48"  y="14" width="16" height="4"  opacity="0.55"/>
    {/* Cloud 2 */}
    <rect x="150" y="14" width="8"  height="8"  opacity="0.40"/>
    <rect x="158" y="10" width="16" height="8"  opacity="0.40"/>
    <rect x="174" y="14" width="8"  height="8"  opacity="0.40"/>
    {/* Pixel tree */}
    <rect x="60"  y="64" width="8"  height="24" opacity="0.6"/>
    <rect x="52"  y="56" width="24" height="8"  opacity="0.6"/>
    <rect x="56"  y="48" width="16" height="8"  opacity="0.6"/>
    <rect x="60"  y="40" width="8"  height="8"  opacity="0.6"/>
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
