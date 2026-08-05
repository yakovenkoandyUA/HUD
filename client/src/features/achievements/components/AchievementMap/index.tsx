import React from 'react'
import InfoToggle from '@/shared/components/ui/InfoToggle'
import { TREE_NODES, TREE_CONNECTIONS, CATEGORY_WELL_BG, TREE_RETURN_POS, ACHIEVEMENT_BADGE } from '../../data'
import type { AchievementWithStatus, AchievementCategory } from '../../types'
import styles from './index.module.css'

interface AchievementNodeProps {
  achievement: AchievementWithStatus
  x: number   // % of container
  y: number   // % of container
  onClick: () => void
  selected: boolean
  isNear?: boolean  // adjacent to at least one unlocked node
}

const AchievementNode: React.FC<AchievementNodeProps> = ({ achievement, x, y, onClick, selected, isNear }) => {
  const { status } = achievement

  const blendNode   = status === 'locked' || status === 'hidden'
  const runeSrc     = ACHIEVEMENT_BADGE[achievement.id]
  const blockSrc    = '/achive/achive-block-dark.webp'
  const questionSrc = '/achive/achive-question-dark.webp'

  return (
    <button
      type="button"
      className={`${styles.node} ${selected ? styles.nodeSelected : ''} ${blendNode ? styles.nodeBlend : ''}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={e => { e.stopPropagation(); onClick() }}
      aria-label={achievement.title}
    >
      {(status === 'locked' || status === 'hidden') && (
        <img
          src={isNear ? questionSrc : blockSrc}
          alt=""
          className={`${styles.badgeImg} ${isNear ? styles.badgeImgNear : ''}`}
          draggable={false}
        />
      )}

      {status === 'unlocked' && (
        <div className={styles.runeWrap}>
          <div className={styles.runeImgClip}>
            <img src={runeSrc} alt="" className={styles.runeImg} draggable={false} />
          </div>
        </div>
      )}

      {status === 'in_progress' && (
        <div className={styles.runeWrap}>
          <div className={styles.runeImgClip}>
            <img src={runeSrc} alt="" className={`${styles.runeImg} ${styles.runeImgDim}`} draggable={false} />
          </div>
        </div>
      )}

    </button>
  )
}

interface AchievementMapProps {
  achievements: AchievementWithStatus[]
  category: AchievementCategory
  onNodeClick: (id: string) => void
  onClose: () => void
  selectedId: string | null
  onBack: () => void
  exiting: boolean
  origin?: { x: number; y: number }
}

/**
 * AchievementMap
 * --------------
 * Гілка дерева для однієї категорії — фон category-well/[cat].png
 * + вузли досягнень (руни/блоки/прогрес-кільце) + кнопка "Повернутись до дерева".
 *
 * Props:
 * @prop {AchievementWithStatus[]} achievements — full list with computed status
 * @prop {AchievementCategory} category — активна категорія
 * @prop {(id: string) => void} onNodeClick — fires when node tapped
 * @prop {string | null} selectedId — currently selected node id
 * @prop {() => void} onBack — "Повернутись до дерева" — повернутись до вибору категорій
 * @prop {boolean} exiting — програє анімацію винирання
 * @prop {{x:number,y:number}} [origin] — % координати точки занурення (transform-origin входу)
 */
const AchievementMap: React.FC<AchievementMapProps> = ({
  achievements,
  category,
  onNodeClick,
  onClose,
  selectedId,
  onBack,
  exiting,
  origin,
}) => {
  const nodes       = TREE_NODES[category] ?? TREE_NODES.all
  const connections = TREE_CONNECTIONS[category] ?? TREE_CONNECTIONS.all

  const byId = Object.fromEntries(achievements.map(a => [a.id, a]))

  // IDs of locked/hidden nodes adjacent to at least one unlocked node
  const nearIds = new Set<string>()
  connections.forEach(([ai, bi]) => {
    const na = nodes[ai], nb = nodes[bi]
    if (!na || !nb) return
    const sa = byId[na.id]?.status, sb = byId[nb.id]?.status
    const aUnlocked = sa === 'unlocked', bUnlocked = sb === 'unlocked'
    if (aUnlocked && (sb === 'locked' || sb === 'hidden')) nearIds.add(nb.id)
    if (bUnlocked && (sa === 'locked' || sa === 'hidden')) nearIds.add(na.id)
  })
  // If nothing is unlocked yet, mark the first (top) node as the starting hint
  if (nearIds.size === 0 && nodes[0]) nearIds.add(nodes[0].id)

  return (
    <div className={styles.cardOuter}>
      <div className={styles.infoBtn}>
        <InfoToggle
          ariaLabel="Про гілку дерева"
          text="Кожен вузол — досягнення. Відкривай руни, щоб прокладати шлях від коріння до крони. Золоті вузли пробуджені, кам'яні — в процесі, чорні — ще заблоковані."
          align="right"
        />
      </div>

      <div className={styles.card}>
      <div
        className={`${styles.canvas} ${exiting ? styles.exiting : ''}`}
        style={origin ? { '--dive-x': `${origin.x}%`, '--dive-y': `${origin.y}%` } as React.CSSProperties : undefined}
        onClick={onClose}
      >
        <img src={CATEGORY_WELL_BG[category]} alt="" className={styles.treeImg} draggable={false} />

        <button
          type="button"
          className={styles.diveOutBtn}
          style={{ left: `${TREE_RETURN_POS.x}%`, top: `${TREE_RETURN_POS.y}%` }}
          aria-label="Повернутись до дерева"
          onClick={e => { e.stopPropagation(); onBack() }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 19V5M5 12l7-7 7 7"/>
          </svg>
        </button>

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

        {/* Floating node detail popup — anchored beside the node, alternating sides */}
        {selectedId && (() => {
          const ach   = byId[selectedId]
          const index = nodes.findIndex(n => n.id === selectedId)
          const node  = nodes[index]
          if (!ach || !node || ach.status === 'hidden') return null
          const side = index % 2 === 0 ? 'right' : 'left'
          return (
            <div
              key={selectedId}
              className={`${styles.nodePopupAnchor} ${side === 'right' ? styles.nodePopupAnchorRight : styles.nodePopupAnchorLeft}`}
              style={{ top: `${node.y}%` }}
            >
              <div className={`${styles.nodePopup} ${side === 'right' ? styles.nodePopupTailLeft : styles.nodePopupTailRight}`}>
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
          <p className={styles.wellText}>Гілка мовчить</p>
        )}
      </div>
      </div>
    </div>
  )
}

export default AchievementMap
