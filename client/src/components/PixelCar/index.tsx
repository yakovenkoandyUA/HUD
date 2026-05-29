import React from 'react'
import styles from './index.module.css'

/**
 * PixelCar
 * --------
 * Піксельний болид F1 для топ-3 таблиці команд.
 * SVG viewBox 0 0 48 16 — кожен піксель = <rect 1×1>.
 * Для невідомих команд — fallback кольорова крапка.
 *
 * Props:
 * @prop {string}  team — назва або slug команди (ferrari/mclaren/mercedes/…)
 * @prop {number}  size — висота в px (ширина = size×3), default 32
 */
export interface PixelCarProps {
  team: string
  size?: number
}

// ── Fallback dot colors for teams without a pixel car ──────────────────────

const DOT_COLOR: Record<string, string> = {
  'Red Bull':     '#3671C6',
  'Alpine':       '#FF87BC',
  'Aston Martin': '#229971',
  'Williams':     '#64C4FF',
  'Haas':         '#B6BABD',
  'Kick Sauber':  '#52E252',
  'RB':           '#6692FF',
}

// ── Per-team palette ────────────────────────────────────────────────────────

interface P {
  body:   string   // primary body / nose
  side:   string   // sidepod/floor accent (darker)
  wing:   string   // wing planes
  halo:   string   // halo arch + posts
  cpit:   string   // cockpit surround accent
}

const PALETTE: Record<string, P> = {
  ferrari: {
    body: '#DC0000',
    side: '#A50000',
    wing: '#FFD700',
    halo: '#1a1a1a',
    cpit: '#FFD700',
  },
  mclaren: {
    body: '#FF8000',
    side: '#C05500',
    wing: '#FF8000',
    halo: '#1a1a1a',
    cpit: '#FFFFFF',
  },
  mercedes: {
    body: '#C0C0C0',
    side: '#009E92',
    wing: '#C0C0C0',
    halo: '#FF2670',
    cpit: '#00D2BE',
  },
}

// ── Normalise team name → slug ──────────────────────────────────────────────

function getSlug(team: string): string {
  const t = team.toLowerCase()
  if (t.includes('ferrari'))                           return 'ferrari'
  if (t.includes('mclaren'))                           return 'mclaren'
  if (t.includes('mercedes'))                          return 'mercedes'
  if (t.includes('red bull') || t.includes('redbull')) return 'redbull'
  if (t.includes('williams'))                          return 'williams'
  if (t.includes('alpine'))                            return 'alpine'
  return ''
}

// ── SVG car geometry (48 × 16 grid, car faces RIGHT →) ─────────────────────
//
// Layer order (later = drawn on top in SVG):
//   tires → rear wing → halo → cockpit accent → main body →
//   sidepod accent → nose → cockpit opening → front wing

function CarPaths({ p }: { p: P }) {
  const K   = '#1a1a1a'   // black (tires, cockpit opening)
  const RIM = '#888888'   // tire rim highlight

  return (
    <>
      {/* ── Tires (drawn first so body overlaps tops) ── */}
      {/* front tire  (center ~x 9) */}
      <rect x={7}  y={9}  width={5} height={4} fill={K} />
      <rect x={6}  y={10} width={7} height={2} fill={K} />
      <rect x={8}  y={11} width={3} height={1} fill={RIM} />
      {/* rear tire (center ~x 34) */}
      <rect x={32} y={9}  width={5} height={4} fill={K} />
      <rect x={31} y={10} width={7} height={2} fill={K} />
      <rect x={33} y={11} width={3} height={1} fill={RIM} />

      {/* ── Rear wing ── */}
      <rect x={37} y={1}  width={9} height={2} fill={p.wing} />   {/* top plane */}
      <rect x={37} y={4}  width={9} height={1} fill={p.wing} />   {/* lower flap */}
      <rect x={40} y={1}  width={2} height={7} fill={p.body} />   {/* center strut */}

      {/* ── Halo ── */}
      <rect x={14} y={2}  width={12} height={1} fill={p.halo} />  {/* arch */}
      <rect x={14} y={2}  width={2}  height={4} fill={p.halo} />  {/* left post */}
      <rect x={24} y={2}  width={2}  height={4} fill={p.halo} />  {/* right post */}

      {/* ── Cockpit surround accent ── */}
      <rect x={14} y={3}  width={12} height={1} fill={p.cpit} />

      {/* ── Main body ── */}
      <rect x={3}  y={4}  width={35} height={5} fill={p.body} />  {/* main slab */}
      <rect x={38} y={4}  width={4}  height={5} fill={p.body} />  {/* tail fairing */}

      {/* ── Sidepod / floor accent ── */}
      <rect x={4}  y={7}  width={34} height={2} fill={p.side} />

      {/* ── Nose ── */}
      <rect x={0}  y={6}  width={7}  height={2} fill={p.body} />

      {/* ── Cockpit opening ── */}
      <rect x={16} y={4}  width={9}  height={3} fill={K} />

      {/* ── Front wing ── */}
      <rect x={0}  y={8}  width={8}  height={2} fill={p.wing} />  {/* wing plane */}
      <rect x={0}  y={7}  width={2}  height={3} fill={p.body} />  {/* endplate */}
    </>
  )
}

// ── Component ───────────────────────────────────────────────────────────────

const PixelCar: React.FC<PixelCarProps> = ({ team, size = 32 }) => {
  const slug    = getSlug(team)
  const palette = PALETTE[slug]

  if (!palette) {
    const color = DOT_COLOR[team] ?? 'var(--border2)'
    return (
      <span
        style={{
          display:      'inline-block',
          width:        8,
          height:       8,
          borderRadius: '50%',
          background:   color,
          flexShrink:   0,
        }}
      />
    )
  }

  return (
    <svg
      viewBox="0 0 48 16"
      width={size * 3}
      height={size}
      className={styles.car}
      aria-hidden="true"
    >
      <CarPaths p={palette} />
    </svg>
  )
}

export default PixelCar
