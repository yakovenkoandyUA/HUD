import React from 'react'
import styles from './ErrorBoundary.module.css'
import YggdrasilSvg from './YggdrasilSvg'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Top-level error boundary.
 * Catches runtime crashes and renders a Ragnarök screen
 * instead of a blank white page.
 */
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[MIMIR] Uncaught error:', error, info)
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleHome = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className={styles.root}>
        <div className={styles.scanlines} aria-hidden />
        <div className={styles.noise} aria-hidden />

        <div className={styles.content}>
          <div className={styles.topLabel} aria-hidden>
            ᚠ ᛟ ᚱ ᛞ ᛈ ᚱ ᛟ ᚷ
          </div>

          <div className={styles.heroWrap}>
            <span className={styles.glitchText} data-text="RAGNARÖK">RAGNARÖK</span>
          </div>

          <div className={styles.treeLine} aria-hidden>
            <YggdrasilSvg />
          </div>

          <p className={styles.message}>
            Їґґдрасіль тремтить.<br />Щось зламало тканину світів.
          </p>

          <p className={styles.sub}>
            Навіть боги не застраховані від помилок.
          </p>

          {this.state.error && (
            <details className={styles.details}>
              <summary>деталі помилки</summary>
              <pre className={styles.errorText}>
                {this.state.error.message}
              </pre>
            </details>
          )}

          <div className={styles.actions}>
            <button className={styles.btnPrimary} onClick={this.handleReload}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              ПЕРЕЗАВАНТАЖИТИ
            </button>

            <button className={styles.btnSecondary} onClick={this.handleHome}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 12h18M3 12l7-7M3 12l7 7" />
              </svg>
              НА ГОЛОВНУ
            </button>
          </div>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
