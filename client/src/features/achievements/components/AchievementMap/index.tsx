import React, { useState } from 'react'
import { useUiStore } from '@/shared/store/uiStore'
import { TREE_NODES, TREE_CONNECTIONS } from '../../data'
import type { AchievementWithStatus } from '../../types'
import styles from './index.module.css'

// SVG arc progress ring dimensions
const RING_R   = 24   // radius of the progress arc
const RING_W   = 3    // stroke width
const CIRC     = 2 * Math.PI * RING_R

const RUNE_SRC: Record<string, string> = {
  memory:    '/achive/mimir-runes-transparent/rune-memory.png',
  spaces:    '/achive/mimir-runes-transparent/rune-spaces.png',
  finance:   '/achive/mimir-runes-transparent/rune-finance.png',
  sprint:    '/achive/mimir-runes-transparent/rune-sprint.png',
  watchlist: '/achive/mimir-runes-transparent/rune-watchlist.png',
}

interface AchievementNodeProps {
  achievement: AchievementWithStatus
  x: number   // % of container
  y: number   // % of container
  onClick: () => void
  selected: boolean
  isNear?: boolean  // adjacent to at least one unlocked node
}

const AchievementNode: React.FC<AchievementNodeProps> = ({ achievement, x, y, onClick, selected, isNear }) => {
  const { status, progress, target } = achievement
  const fraction = target > 0 ? progress / target : 0
  const arcFill  = fraction * CIRC

  const svgSize  = (RING_R + RING_W) * 2 + 4
  const cx       = svgSize / 2
  const cy       = svgSize / 2

  const blendNode  = status === 'locked' || status === 'hidden'
  const runeSrc    = RUNE_SRC[achievement.category]
  const isDarkNode = useUiStore(s => ['velvet','cyber','noir','arctic'].includes(s.theme))
  const blockSrc    = isDarkNode ? '/achive/achive-block-light.png'    : '/achive/achive-block-dark.png'
  const questionSrc = isDarkNode ? '/achive/achive-question-light.png' : '/achive/achive-question-dark.png'

  return (
    <button
      type="button"
      className={`${styles.node} ${selected ? styles.nodeSelected : ''} ${blendNode ? styles.nodeBlend : ''}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={e => { e.stopPropagation(); onClick() }}
      aria-label={achievement.title}
    >
      {status === 'locked' && (
        <img src={isNear ? questionSrc : blockSrc} alt="" className={styles.badgeImg} draggable={false} />
      )}

      {status === 'hidden' && (
        <img src={questionSrc} alt="" className={styles.badgeImg} draggable={false} />
      )}

      {status === 'unlocked' && (
        <div className={styles.runeWrap}>
          <img src={runeSrc} alt="" className={styles.runeImg} draggable={false} />
        </div>
      )}

      {status === 'in_progress' && (
        <div className={styles.runeWrap}>
          <img src={runeSrc} alt="" className={`${styles.runeImg} ${styles.runeImgDim}`} draggable={false} />
          <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} className={styles.arcOverlay} aria-hidden="true">
            <circle cx={cx} cy={cy} r={RING_R} fill="none" className={styles.ringTrack} strokeWidth={RING_W} />
            <circle cx={cx} cy={cy} r={RING_R} fill="none" className={styles.ringArc}
              strokeWidth={RING_W}
              strokeDasharray={`${arcFill} ${CIRC}`}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}

    </button>
  )
}

interface AchievementMapProps {
  achievements: AchievementWithStatus[]
  category: string
  onNodeClick: (id: string) => void
  onClose: () => void
  selectedId: string | null
}

/**
 * AchievementMap
 * --------------
 * Tree visualization — background PNG + absolutely positioned achievement nodes.
 * Shows key nodes per category tab; connections drawn as SVG lines.
 *
 * Props:
 * @prop {AchievementWithStatus[]} achievements — full list with computed status
 * @prop {string} category — active category tab key
 * @prop {(id: string) => void} onNodeClick — fires when node tapped
 * @prop {string | null} selectedId — currently selected node id
 */
const AchievementMap: React.FC<AchievementMapProps> = ({
  achievements,
  category,
  onNodeClick,
  onClose,
  selectedId,
}) => {
  const [showInfo, setShowInfo] = useState(false)

  const isDark  = ['noir', 'cyber', 'velvet', 'arctic'].includes(useUiStore(s => s.theme))
  const treeSrc = isDark ? '/achive/tree-dark1.png' : '/achive/tree-light1.png'

  const nodes       = TREE_NODES[category] ?? TREE_NODES.all
  const connections = TREE_CONNECTIONS[category] ?? TREE_CONNECTIONS.all

  const byId = Object.fromEntries(achievements.map(a => [a.id, a]))

  // IDs of locked nodes adjacent to at least one unlocked node
  const nearIds = new Set<string>()
  connections.forEach(([ai, bi]) => {
    const na = nodes[ai], nb = nodes[bi]
    if (!na || !nb) return
    const sa = byId[na.id]?.status, sb = byId[nb.id]?.status
    if (sa === 'unlocked' && sb === 'locked') nearIds.add(nb.id)
    if (sb === 'unlocked' && sa === 'locked') nearIds.add(na.id)
  })

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>КАРТА КРИНИЦІ</span>
        <button
          type="button"
          className={`${styles.infoBtn} ${showInfo ? styles.infoBtnActive : ''}`}
          aria-label="Про карту криниці"
          onClick={() => setShowInfo(v => !v)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5"/>
            <path d="M8 7v4"/>
            <circle cx="8" cy="5" r="0.5" fill="currentColor" stroke="none"/>
          </svg>
        </button>
      </div>

      <div className={styles.canvas} onClick={onClose}>
        <img src={treeSrc} alt="" className={`${styles.treeImg} ${isDark ? styles.treeImgDark : styles.treeImgLight}`} draggable={false} />

        {showInfo && (
          <div className={styles.infoTooltip}>
            <p className={styles.infoTooltipText}>
              Кожен вузол — досягнення. Відкривай руни, щоб прокладати шлях до глибини криниці. Золоті вузли пробуджені, кам'яні — в процесі, чорні — ще заблоковані.
            </p>
          </div>
        )}

        {/* Connection lines */}
        <svg className={styles.connectionsSvg} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {connections.map(([a, b], i) => {
            const na = nodes[a]
            const nb = nodes[b]
            if (!na || !nb) return null
            const aStatus = byId[na.id]?.status
            const bStatus = byId[nb.id]?.status
            const lit = aStatus === 'unlocked' && bStatus === 'unlocked'
            return (
              <line
                key={i}
                x1={na.x} y1={na.y}
                x2={nb.x} y2={nb.y}
                className={lit ? styles.connLit : styles.connDim}
              />
            )
          })}
        </svg>

        {/* Nodes */}
        {nodes.map(node => {
          const ach = byId[node.id]
          if (!ach) return null
          return (
            <AchievementNode
              key={node.id}
              achievement={ach}
              x={node.x}
              y={node.y}
              selected={selectedId === node.id}
              onClick={() => onNodeClick(node.id)}
              isNear={nearIds.has(node.id)}
            />
          )
        })}

        {/* Floating node detail popup */}
        {selectedId && (() => {
          const ach  = byId[selectedId]
          const node = nodes.find(n => n.id === selectedId)
          if (!ach || !node || ach.status === 'hidden') return null
          const showAbove = node.y > 55
          return (
            <div
              key={selectedId}
              className={styles.nodePopupAnchor}
              style={{
                left: '50%',
                top: showAbove
                  ? `calc(${node.y}% - 38px)`
                  : `calc(${node.y}% + 38px)`,
                transform: showAbove
                  ? 'translate(-50%, -100%)'
                  : 'translate(-50%, 0)',
              }}
            >
              <div className={styles.nodePopup}>
                <span className={styles.nodePopupTitle}>{ach.title}</span>
                <p className={styles.nodePopupDesc}>{ach.description}</p>
                {ach.status === 'in_progress' && (
                  <div className={styles.nodePopupProgress}>
                    <div className={styles.nodePopupTrack}>
                      <div
                        className={styles.nodePopupFill}
                        style={{ width: `${(ach.progress / ach.target) * 100}%` }}
                      />
                    </div>
                    <span className={styles.nodePopupLabel}>{ach.progress} / {ach.target}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* Hidden label */}
        {nodes.some(n => byId[n.id]?.status === 'hidden') && (
          <p className={styles.wellText}>Криниця мовчить</p>
        )}
      </div>
    </div>
  )
}

export default AchievementMap
