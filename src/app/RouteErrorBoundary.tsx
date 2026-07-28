import {
  Component,
  type ReactNode,
} from 'react'
import { Link } from 'react-router'

interface RouteErrorBoundaryProps {
  children: ReactNode
}

interface RouteErrorBoundaryState {
  failed: boolean
}

export class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) {
      return this.props.children
    }

    return (
      <main
        className="page-container route-error"
        id="main-content"
        aria-labelledby="route-error-title"
        role="alert"
      >
        <p className="card-eyebrow">Page unavailable</p>
        <h1 id="route-error-title">This screen could not be displayed</h1>
        <p>
          Other locally stored parts of Travel Companion are still available.
        </p>
        <Link to="/home">Return to Home</Link>
      </main>
    )
  }
}
