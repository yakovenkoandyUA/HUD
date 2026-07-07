import React from 'react'
import styles from './PillSelector.module.css'

export interface PillOption<T extends string = string> {
  value: T
  label: string
  icon?: React.ReactNode
}

/**
 * PillSelector
 * ------------
 * Уніфікований компонент вибору між варіантами у вигляді пілюль.
 * Активний стан — outline (border + text accent + ледве тонований фон),
 * не заповнений. Відповідає дизайн-стандарту застосунку.
 *
 * Props:
 * @prop {PillOption[]} options  — варіанти вибору (value + label + опційна іконка)
 * @prop {string}       value    — поточно вибране значення
 * @prop {Function}     onChange — callback при виборі
 * @prop {number}       columns  — якщо вказано, використовує CSS grid замість flex-wrap
 * @prop {string}       className — додатковий клас для обгортки
 */
interface PillSelectorProps<T extends string = string> {
  options: PillOption<T>[]
  value: T
  onChange: (value: T) => void
  columns?: number
  className?: string
}

function PillSelector<T extends string = string>({
  options,
  value,
  onChange,
  columns,
  className,
}: PillSelectorProps<T>) {
  const wrapStyle = columns
    ? ({ gridTemplateColumns: `repeat(${columns}, 1fr)` } as React.CSSProperties)
    : undefined

  return (
    <div
      className={`${columns ? styles.grid : styles.wrap} ${className ?? ''}`}
      style={wrapStyle}
    >
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          className={`${styles.pill} ${value === opt.value ? styles.pillActive : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.icon && <span className={styles.icon}>{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default PillSelector
