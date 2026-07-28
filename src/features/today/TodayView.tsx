import type { TodayViewModel } from './todayTypes'
import { CriticalInfoBanner } from './components/CriticalInfoBanner'
import { DayTimeline } from './components/DayTimeline'
import { NextEventCard } from './components/NextEventCard'
import { OperationalPriorities } from './components/OperationalPriorities'
import { OperationalStatusBanner } from './components/OperationalStatusBanner'
import { PortDaySummary } from './components/PortDaySummary'
import { PrepareForTomorrow } from './components/PrepareForTomorrow'
import { ReturnGuidanceCard } from './components/ReturnGuidanceCard'
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

      {viewModel.operationalStatus ? (
        <OperationalStatusBanner status={viewModel.operationalStatus} />
      ) : null}

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

      {viewModel.priorities ? (
        <OperationalPriorities priorities={viewModel.priorities} />
      ) : null}

      {viewModel.returnGuidance ? (
        <ReturnGuidanceCard guidance={viewModel.returnGuidance} />
      ) : null}

      {viewModel.port ? <PortDaySummary port={viewModel.port} /> : null}

      {viewModel.tomorrow ? (
        <PrepareForTomorrow tomorrow={viewModel.tomorrow} />
      ) : null}
    </main>
  )
}
