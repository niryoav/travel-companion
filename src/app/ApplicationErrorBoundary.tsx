import {
  Component,
  type ReactNode,
} from 'react'

interface ApplicationErrorBoundaryProps {
  children: ReactNode
  onRetry?: () => void
}

interface ApplicationErrorBoundaryState {
  failed: boolean
}

export class ApplicationErrorBoundary extends Component<
  ApplicationErrorBoundaryProps,
  ApplicationErrorBoundaryState
> {
  state: ApplicationErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ApplicationErrorBoundaryState {
    return { failed: true }
  }

  private retry = () => {
    if (this.props.onRetry) {
      this.props.onRetry()
      return
    }
    window.location.reload()
  }

  render() {
    if (!this.state.failed) {
      return this.props.children
    }

    return (
      <main
        className="application-error"
        id="main-content"
        aria-labelledby="application-error-title"
      >
        <section className="application-error-card" role="alert">
          <p className="card-eyebrow">Travel Companion</p>
          <h1 id="application-error-title">The app could not start</h1>
          <p>
            Your current page is unavailable. Try opening the locally stored
            app again.
          </p>
          <button type="button" onClick={this.retry}>
            Retry
          </button>
        </section>
      </main>
    )
  }
}
