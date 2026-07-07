import React from 'react'
import styles from './Input.module.css'

/**
 * Input
 * -----
 * Текстовий або числовий інпут.
 *
 * Props:
 * @prop {string}           value
 * @prop {(v: string) => void} onChange
 * @prop {string}           [label]
 * @prop {string}           [placeholder]
 * @prop {'text'|'number'|'date'} [type]
 * @prop {boolean}          [disabled]
 */
interface InputProps {
  value: string
  onChange: (v: string) => void
  label?: string
  placeholder?: string
  type?: 'text' | 'number' | 'date'
  disabled?: boolean
}

const Input: React.FC<InputProps> = ({
  value,
  onChange,
  label,
  placeholder,
  type = 'text',
  disabled = false,
}) => (
  <div className={styles.wrapper}>
    {label && <label className={styles.label}>{label}</label>}
    <input
      type={type}
      className={styles.input}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
)

export default Input
