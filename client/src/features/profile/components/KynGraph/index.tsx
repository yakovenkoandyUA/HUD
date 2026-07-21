import React, { useState, useCallback } from 'react'
import type { FamilyLink } from '@/shared/store/familyStore'
import styles from './KynGraph.module.css'

const REL_COLORS: Record<string, string> = {
  partner:   '#e8708a',
  friend:    '#6ca6e8',
  family:    '#c4a43a',
  colleague: '#5ec5b0',
}

export const REL_LABELS: Record<string, string> = {
  partner:   'Партнер',
  friend:    'Друг',
  family:    'Рідні',
  colleague: 'Колега',
}

const CENTER_R = 30
const NODE_R   = 22
const VERT_GAP = 110
const H_SPACING_BASE = 80

function relColor(type: string | null): string {
  if (!type || !REL_COLORS[type]) return 'var(--text3)'
  return REL_COLORS[type]
}

interface Props {
  me: { name: string; avatarUrl: string | null }
  members: FamilyLink[]
  onRemove: (linkId: string) => void
}

/**
 * KynGraph
 * --------
 * SVG top-down graph of connections (КИН).
 * "Я" node at top center, connected members below in a horizontal row.
 * Tap a node to open a popup with info + remove option.
 *
 * Props:
 * @prop me      — current user name and avatar
 * @prop members — accepted FamilyLink list
 * @prop onRemove — remove link callback
 */
const KynGraph: React.FC<Props> = ({ me, members, onRemove }) => {
  const [selected, setSelected] = useState<FamilyLink | null>(null)

  const handleNodeClick = useCallback((m: FamilyLink, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelected(prev => prev?.linkId === m.linkId ? null : m)
  }, [])

  if (members.length === 0) {
    return (
      <div className={styles.empty}>
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <circle cx="14" cy="16" r="6" stroke="var(--text3)" strokeWidth="1.4"/>
          <circle cx="30" cy="16" r="6" stroke="var(--border)" strokeWidth="1.4" strokeDasharray="3 2"/>
          <path d="M3 38c0-6 4.9-11 11-11M25 38c0-6 4.9-11 11-11" stroke="var(--border)" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <p className={styles.emptyText}>Ще немає зв'язків.<br/>Знайди людей нижче.</p>
      </div>
    )
  }

  const count = members.length
  const hSpacing = count > 5 ? 68 : H_SPACING_BASE
  const memberY = VERT_GAP

  const nodes = members.map((m, i) => {
    const x = (i - (count - 1) / 2) * hSpacing
    return { ...m, x, y: memberY }
  })

  const halfW = Math.max(60, ((count - 1) * hSpacing) / 2 + NODE_R + 40)
  const svgTop    = CENTER_R + 22
  const svgBottom = memberY + NODE_R + 36
  const vbWidth  = halfW * 2
  const vbHeight = svgTop + svgBottom

  return (
    <div className={styles.wrap} onClick={() => setSelected(null)}>
      <svg
        viewBox={`${-halfW} ${-svgTop} ${vbWidth} ${vbHeight}`}
        className={styles.svg}
      >
        <defs>
          <clipPath id="kyn-me-clip">
            <circle cx={0} cy={0} r={CENTER_R} />
          </clipPath>
          {nodes.map(n => (
            <clipPath key={`kyn-clip-${n.id}`} id={`kyn-clip-${n.id}`}>
              <circle cx={n.x} cy={n.y} r={NODE_R} />
            </clipPath>
          ))}
        </defs>

        {/* ── Edges — from bottom of center to top of each member ── */}
        {nodes.map(n => (
          <line
            key={`edge-${n.id}`}
            x1={0} y1={CENTER_R}
            x2={n.x} y2={n.y - NODE_R}
            stroke={relColor(n.relationshipType)}
            strokeWidth={1.5}
            strokeOpacity={0.45}
          />
        ))}

        {/* ── Center node (me) ── */}
        <circle
          cx={0} cy={0}
          r={CENTER_R}
          fill="var(--surface)"
          stroke="var(--accent)"
          strokeWidth={2}
        />
        {me.avatarUrl ? (
          <image
            href={me.avatarUrl}
            x={-CENTER_R} y={-CENTER_R}
            width={CENTER_R * 2} height={CENTER_R * 2}
            clipPath="url(#kyn-me-clip)"
            preserveAspectRatio="xMidYMid slice"
          />
        ) : (
          <text
            x={0} y={0}
            textAnchor="middle"
            dominantBaseline="central"
            className={styles.meInitial}
            fill="var(--accent)"
          >
            {me.name[0].toUpperCase()}
          </text>
        )}
        <text
          x={0} y={CENTER_R + 13}
          textAnchor="middle"
          className={styles.meLabel}
          fill="var(--text)"
        >
          Я
        </text>

        {/* ── Member nodes ── */}
        {nodes.map(n => {
          const c = relColor(n.relationshipType)
          const isSelected = selected?.linkId === n.linkId
          return (
            <g
              key={n.id}
              className={styles.node}
              onClick={e => handleNodeClick(n, e)}
              role="button"
              aria-label={n.name}
            >
              <circle cx={n.x} cy={n.y} r={NODE_R + 6} fill="transparent" />
              <circle
                cx={n.x} cy={n.y}
                r={NODE_R}
                fill="var(--surface)"
                stroke={c}
                strokeWidth={isSelected ? 2.5 : 1.8}
              />
              {n.avatarUrl ? (
                <image
                  href={n.avatarUrl}
                  x={n.x - NODE_R} y={n.y - NODE_R}
                  width={NODE_R * 2} height={NODE_R * 2}
                  clipPath={`url(#kyn-clip-${n.id})`}
                  preserveAspectRatio="xMidYMid slice"
                />
              ) : (
                <text
                  x={n.x} y={n.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={styles.nodeInitial}
                  fill={c}
                >
                  {n.name[0].toUpperCase()}
                </text>
              )}
              <text
                x={n.x} y={n.y + NODE_R + 12}
                textAnchor="middle"
                className={styles.nodeLabel}
                fill="var(--text2)"
              >
                {n.name.split(' ')[0]}
              </text>
              {n.relationshipType && (
                <text
                  x={n.x} y={n.y + NODE_R + 22}
                  textAnchor="middle"
                  className={styles.nodeRelLabel}
                  fill={c}
                >
                  {REL_LABELS[n.relationshipType] ?? n.relationshipType}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* ── Node popup ── */}
      {selected && (
        <div className={styles.popup} onClick={e => e.stopPropagation()}>
          <div className={styles.popupHeader}>
            <div className={styles.popupAvatar}>
              {selected.avatarUrl
                ? <img src={selected.avatarUrl} alt={selected.name} className={styles.popupAvatarImg} />
                : <span className={styles.popupAvatarInitial}>{selected.name[0]}</span>}
            </div>
            <div className={styles.popupInfo}>
              <span className={styles.popupName}>{selected.name}</span>
              <span className={styles.popupUsername}>@{selected.username}</span>
            </div>
            {selected.relationshipType && (
              <span
                className={styles.popupRelTag}
                style={{ color: relColor(selected.relationshipType), borderColor: relColor(selected.relationshipType) }}
              >
                {REL_LABELS[selected.relationshipType] ?? selected.relationshipType}
              </span>
            )}
          </div>
          <button
            type="button"
            className={styles.popupRemoveBtn}
            onClick={() => { onRemove(selected.linkId); setSelected(null) }}
          >
            <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Видалити зв'язок
          </button>
        </div>
      )}
    </div>
  )
}

export default KynGraph
