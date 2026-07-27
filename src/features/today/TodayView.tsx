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
  const primaryCriticalInfo =
    viewModel.criticalInfo?.prominence === 'PRIMARY'
      ? viewModel.criticalInfo
      : undefined
  const supportingCriticalInfo =
    viewModel.criticalInfo?.prominence === 'SUPPORTING'
      ? viewModel.criticalInfo
      : undefined

  return (
    <main className="today-screen" id="main-content">
      <TodayHeader header={viewModel.header} />

      {primaryCriticalInfo ? (
        <CriticalInfoBanner information={primaryCriticalInfo} />
      ) : null}

      {viewModel.nextEvent ? (
        <NextEventCard
          event={viewModel.nextEvent}
          showDocumentAction={viewModel.timeline.length === 0}
        />
      ) : null}

      {supportingCriticalInfo ? (
        <CriticalInfoBanner information={supportingCriticalInfo} />
      ) : null}

      {viewModel.timeline.length > 0 ? (
        <DayTimeline events={viewModel.timeline} />
      ) : viewModel.emptyMessage ? (
        <TodayEmptyState message={viewModel.emptyMessage} />
      ) : null}

      {viewModel.port ? <PortDaySummary port={viewModel.port} /> : null}

    </main>
  )
}
