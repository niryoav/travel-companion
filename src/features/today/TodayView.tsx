import { Link } from 'react-router'

import type { TodayViewModel } from './todayTypes'
import { CriticalInfoBanner } from './components/CriticalInfoBanner'
import { DayTimeline } from './components/DayTimeline'
import { NextEventCard } from './components/NextEventCard'
import { PortDaySummary } from './components/PortDaySummary'
import { TodayEmptyState } from './components/TodayEmptyState'
import { TodayHeader } from './components/TodayHeader'

interface TodayViewProps {
  viewModel: TodayViewModel
}

export function TodayView({ viewModel }: TodayViewProps) {
  return (
    <main className="today-screen" id="main-content">
      <TodayHeader header={viewModel.header} />

      {viewModel.criticalInfo ? (
        <CriticalInfoBanner information={viewModel.criticalInfo} />
      ) : null}

      {viewModel.nextEvent ? (
        <NextEventCard event={viewModel.nextEvent} />
      ) : null}

      {viewModel.timeline.length > 0 ? (
        <DayTimeline events={viewModel.timeline} />
      ) : viewModel.emptyMessage ? (
        <TodayEmptyState message={viewModel.emptyMessage} />
      ) : null}

      {viewModel.port ? <PortDaySummary port={viewModel.port} /> : null}

      {viewModel.hasRelatedDocuments ? (
        <Link className="today-action-link" to="/documents">
          View related documents
        </Link>
      ) : null}

      {viewModel.tripDirection ? (
        <section className="today-card today-direction">
          <p>{viewModel.tripDirection}</p>
          <Link className="today-action-link" to="/trip">
            View Trip
          </Link>
        </section>
      ) : null}
    </main>
  )
}

