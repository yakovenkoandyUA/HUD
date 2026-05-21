import React, { useState } from 'react'
import styles from './StarRating.module.css'

/**
 * StarRating
 * ----------
 * 5-star personal rating selector.
 *
 * Props:
 * @prop {number | null}       value      — current rating (1–5) or null
 * @prop {(v: number) => void} [onChange] — called with new rating value
 * @prop {boolean}             [readOnly] — display only, no interaction
 * @prop {'sm' | 'md'}        [size]
 */
interface StarRatingProps {
  value: number | null
  onChange?: (v: number) => void
  readOnly?: boolean
  size?: 'sm' | 'md'
}

const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  readOnly = false,
  size = 'md',
}) => {
  const [hovered, setHovered] = useState<number | null>(null)
  const active = hovered ?? value ?? 0

  return (
    <div className={`${styles.stars} ${styles[size]}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`${styles.star} ${active >= star ? styles.filled : ''}`}
          onClick={() => !readOnly && onChange?.(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => !readOnly && setHovered(null)}
          disabled={readOnly}
          aria-label={`${star} зірок`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export default StarRating
