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

// After a new deploy, a browser tab that's been open across the release still
// references old content-hashed chunk filenames that no longer exist on the
// server — lazy route imports then throw instead of showing the app. That's
// a stale-cache problem, not a real crash, so it's worth one silent reload
// before falling back to the error screen (guarded to avoid a reload loop if
// the failure is persistent for some other reason).
const CHUNK_RELOAD_KEY = 'mimir-chunk-reload-attempted'

function isChunkLoadError(error: Error): boolean {
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(error.message)
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

  componentDidMount() {
    // Reached a successful mount — clear the guard so a future stale-chunk
    // error can still trigger one more auto-reload.
    sessionStorage.removeItem(CHUNK_RELOAD_KEY)
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[MIMIR] Uncaught error:', error, info)
    if (isChunkLoadError(error) && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
      window.location.reload()
    }
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

    // Auto-reload in flight — render nothing rather than flashing the error screen.
    if (this.state.error && isChunkLoadError(this.state.error) && sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
      return null
    }

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
