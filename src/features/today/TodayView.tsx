import type { ReactNode } from 'react'

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
import { TodayPreparationCard } from './components/TodayPreparationCard'
import { TodayWeatherCard } from './components/TodayWeatherCard'

interface TodayViewProps {
  viewModel: TodayViewModel
  previewControls?: ReactNode
}

export function TodayView({
  viewModel,
  previewControls,
}: TodayViewProps) {
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
      {previewControls}

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

      {viewModel.weather ? (
        <TodayWeatherCard weather={viewModel.weather} />
      ) : null}

      {viewModel.additionalWeather?.map((weather) => (
        <TodayWeatherCard
          key={weather.location}
          weather={weather}
        />
      ))}

      {viewModel.preparation ? (
        <TodayPreparationCard preparation={viewModel.preparation} />
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
