import React from 'react'
import type { SpaceType } from '@/features/memories/store/spacesStore'
import { SPACE_TYPE_CONFIG } from '@/features/spaces/data/spaceTypes'
import styles from './SpaceTypeBadge.module.css'

type BadgeType = SpaceType | 'blank'

interface Props {
  type:       BadgeType
  /** sm=28  md=36  lg=44 */
  size?:      'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_PX = { sm: 28, md: 36, lg: 44 } as const
const ICON_PX = { sm: 16, md: 20, lg: 24 } as const

/**
 * SpaceTypeBadge
 * --------------
 * Rounded-square badge with the space-type icon from /mimir_space_icons_svg/.
 * Border and background tint are derived from the type's accent color.
 *
 * @param type  - SpaceType key or 'blank' for the create option
 * @param size  - 'sm' | 'md' | 'lg'  (default 'md' = 36 × 36 px)
 */
const SpaceTypeBadge: React.FC<Props> = ({ type, size = 'md', className }) => {
  const config = SPACE_TYPE_CONFIG[type as SpaceType] ?? SPACE_TYPE_CONFIG.blank
  const { iconSrc, color } = config
  const px     = SIZE_PX[size]
  const iconPx = ICON_PX[size]

  return (
    <span
      className={`${styles.badge} ${className ?? ''}`}
      style={{
        width:      px,
        height:     px,
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
        border:     `1px solid color-mix(in srgb, ${color} 18%, transparent)`,
      }}
    >
      <img src={iconSrc} width={iconPx} height={iconPx} alt="" aria-hidden="true" />
    </span>
  )
}

export default SpaceTypeBadge
