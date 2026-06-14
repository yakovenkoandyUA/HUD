import React, { useState } from 'react'
import { getIngredientIconUrl } from '../../../utils/ingredientIcons'
import styles from './IngredientIcon.module.css'

/**
 * IngredientIcon
 * --------------
 * Fluent Emoji 3D icon matched from ingredient text.
 * Silently hides if no match or image fails to load.
 *
 * Props:
 * @prop {string} ingredient — ingredient text to match
 * @prop {number} size       — width/height in px (default 36)
 */
interface IngredientIconProps {
  ingredient: string
  size?: number
}

const IngredientIcon: React.FC<IngredientIconProps> = ({ ingredient, size = 36 }) => {
  const [failed, setFailed] = useState(false)
  const url = getIngredientIconUrl(ingredient)

  if (!url || failed) {
    return (
      <span
        style={{ width: size, height: size, display: 'block', flexShrink: 0 }}
        aria-hidden="true"
      />
    )
  }

  return (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      className={styles.icon}
      onError={() => setFailed(true)}
      aria-hidden="true"
      loading="lazy"
      draggable={false}
    />
  )
}

export default IngredientIcon
