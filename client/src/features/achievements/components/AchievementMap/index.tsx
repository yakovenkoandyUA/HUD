import React, { useState } from 'react'
import { useUiStore } from '@/shared/store/uiStore'
import { TREE_NODES, TREE_CONNECTIONS } from '../../data'
import type { AchievementWithStatus } from '../../types'
import styles from './index.module.css'

// SVG arc progress ring dimensions
const RING_R   = 24
const RING_W   = 3
const CIRC     = 2 * Math.PI * RING_R

const RUNE_SRC: Record<string, string> = {
  memory:    '/achive/rune-memory.png',
  spaces:    '/achive/rune-spaces.png',
  finance:   '/achive/rune-finance.png',
  sprint:    '/achive/rune-sprint.png',
  watchlist: '/achive/rune-watchlist.png',
}

interface AchievementNodeProps {
  achievement: AchievementWithStatus
  x: number
  y: number
  onClick: () => void
  selected: boolean
}

const AchievementNode: React.FC<AchievementNodeProps> = ({ achievement, x, y, onClick, selected }) => {
  const { status, progress, target } = achievement
  const fraction = target > 0 ? progress / target : 0
  const arcFill  = fraction * CIRC

  const svgSize  = (RING_R + RING_W) * 2 + 4
  const cx       = svgSize / 2
  const cy       = svgSize / 2

  const blendNode = status === 'locked' || status === 'hidden'
  const runeSrc   = RUNE_SRC[achievement.category]

  return (
    <button
      type="button"
      className={`${styles.node} ${selected ? styles.nodeSelected : ''} ${blendNode ? styles.nodeBlend : ''}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={onClick}
      aria-label={achievement.title}
    >
      {status === 'locked' && (
        <img src="/achive/achive-block.png" alt="" className={styles.badgeImg} draggable={false} />
      )}

      {status === 'hidden' && (
        <img src="/achive/achive-question.png" alt="" className={styles.badgeImg} draggable={false} />
      )}

      {status === 'unlocked' && (
        <div className={styles.runeWrap}>
          <img src={runeSrc} alt="" className={`${styles.runeImg} ${styles.runeImgUnlocked}`} draggable={false} />
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
  selectedId: string | null
}

/**
 * AchievementMap
 * --------------
 * Tree visualization — background PNG + absolutely positioned achievement nodes.
 * Selected node shows an inline info card directly below the node inside the canvas.
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
  selectedId,
}) => {
  const [showInfo, setShowInfo] = useState(false)

  const isDark  = ['noir', 'cyber', 'velvet', 'arctic'].includes(useUiStore(s => s.theme))
  const treeSrc = isDark ? '/achive/tree-dark1.png' : '/achive/tree-light.png'

  const nodes       = TREE_NODES[category] ?? TREE_NODES.all
  const connections = TREE_CONNECTIONS[category] ?? TREE_CONNECTIONS.all

  const byId = Object.fromEntries(achievements.map(a => [a.id, a]))

  const selectedNode = selectedId ? nodes.find(n => n.id === selectedId) : null
  const selectedAch  = selectedId ? byId[selectedId] : null

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

      {showInfo && (
        <div className={styles.infoTooltip}>
          <p className={styles.infoTooltipText}>
            Кожен вузол — досягнення. Відкривай руни, щоб прокладати шлях до глибини криниці. Золоті вузли пробуджені, кам'яні — в процесі, чорні — ще заблоковані.
          </p>
        </div>
      )}

      <div className={styles.canvas} onClick={e => { if (e.target === e.currentTarget) onNodeClick('') }}>
        <img src={treeSrc} alt="" className={`${styles.treeImg} ${isDark ? styles.treeImgDark : styles.treeImgLight}`} draggable={false} />

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
            />
          )
        })}

        {/* Inline node card */}
        {selectedNode && selectedAch && selectedAch.status !== 'hidden' && (
          <div
            className={styles.nodeCard}
            style={{ left: `clamp(22%, ${selectedNode.x}%, 78%)`, top: `calc(${selectedNode.y}% + 34px)` }}
          >
            <span className={styles.nodeCardTitle}>{selectedAch.title}</span>
            <p className={styles.nodeCardDesc}>{selectedAch.description}</p>
            {selectedAch.status === 'in_progress' && (
              <div className={styles.nodeCardBar}>
                <div className={styles.nodeCardFill} style={{ width: `${(selectedAch.progress / selectedAch.target) * 100}%` }} />
                <span className={styles.nodeCardProgress}>{selectedAch.progress} / {selectedAch.target}</span>
              </div>
            )}
          </div>
        )}

        {nodes.some(n => byId[n.id]?.status === 'hidden') && (
          <p className={styles.wellText}>Криниця мовчить</p>
        )}
      </div>
    </div>
  )
}

export default AchievementMap
