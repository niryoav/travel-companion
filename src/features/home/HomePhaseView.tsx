import type { DailyLoveMessageViewModel } from '../../domain/content/dailyLoveMessage'
import type { ReactNode } from 'react'
import { DailyLoveMessage } from '../../components/DailyLoveMessage'
import type { HomeViewModel } from './homeTypes'
import { HomeAlert } from './components/HomeAlert'
import { HomeHero } from './components/HomeHero'
import { NextMilestoneCard } from './components/NextMilestoneCard'
import { PrepareForTomorrowCard } from './components/PrepareForTomorrowCard'
import { QuickChecklist } from './components/QuickChecklist'
import { QuickWeatherCard } from './components/QuickWeatherCard'
import { VoyageProgressCard } from './components/VoyageProgressCard'

interface HomePhaseViewProps {
  greeting: string
  importantMoment?: ReactNode
  loveMessage?: DailyLoveMessageViewModel | null
  reviewControl?: ReactNode
  search?: string
  viewModel: HomeViewModel
}

export function HomePhaseView({
  greeting,
  importantMoment,
  loveMessage,
  reviewControl,
  search,
  viewModel,
}: HomePhaseViewProps) {
  return (
    <>
      <HomeHero
        context={viewModel.context}
        greeting={greeting}
        intro={viewModel.intro}
        portAccessStatus={viewModel.portAccessStatus}
      />

      {reviewControl}

      {loveMessage ? (
        <DailyLoveMessage message={loveMessage} variant="home" />
      ) : null}

      {viewModel.voyageProgress ? (
        <VoyageProgressCard voyageProgress={viewModel.voyageProgress} />
      ) : null}

      {viewModel.tomorrowPreparation ? (
        <PrepareForTomorrowCard
          card={viewModel.tomorrowPreparation}
          search={search}
        />
      ) : null}

      <div className="home-briefing-grid">
        {importantMoment}
        {viewModel.milestone ? (
          <NextMilestoneCard milestone={viewModel.milestone} />
        ) : null}
        {viewModel.weather ? (
          <QuickWeatherCard weather={viewModel.weather} />
        ) : null}
        {viewModel.checklist && viewModel.checklistTitle ? (
          <QuickChecklist
            items={viewModel.checklist}
            title={viewModel.checklistTitle}
          />
        ) : null}
      </div>

      {viewModel.alert ? <HomeAlert alert={viewModel.alert} /> : null}
    </>
  )
}
