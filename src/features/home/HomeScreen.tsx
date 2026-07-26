import { PageHeader } from '../../components/PageHeader'
import { StatusBadge } from '../../components/StatusBadge'
import { SurfaceCard } from '../../components/SurfaceCard'

export function HomeScreen() {
  return (
    <main className="page-container home-screen" id="main-content">
      <PageHeader
        eyebrow="Home · UI preview"
        title="A calm start"
        description="Your one-screen travel briefing will bring the essentials together here."
        trailing={<StatusBadge label="Placeholder" tone="neutral" />}
      />

      <SurfaceCard className="briefing-card">
        <div className="briefing-heading">
          <div>
            <p className="card-eyebrow">Briefing preview</p>
            <h2>Everything important, at a glance</h2>
          </div>
          <StatusBadge label="Offline shell" tone="positive" />
        </div>

        <div className="briefing-list">
          <div className="briefing-row">
            <span className="briefing-label">Today</span>
            <span className="briefing-value">Current-day details will appear here</span>
          </div>
          <div className="briefing-row">
            <span className="briefing-label">Trip</span>
            <span className="briefing-value">Shared journey context will appear here</span>
          </div>
        </div>
      </SurfaceCard>
    </main>
  )
}
