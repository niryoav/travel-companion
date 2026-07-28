import type { DailyLoveMessageViewModel } from '../../domain/content/dailyLoveMessage'
import { DailyLoveMessage } from '../../components/DailyLoveMessage'
import type { HomeViewModel } from './homeTypes'
import { HomeAlert } from './components/HomeAlert'
import { HomeHero } from './components/HomeHero'
import { NextMilestoneCard } from './components/NextMilestoneCard'
import { QuickChecklist } from './components/QuickChecklist'
import { QuickWeatherCard } from './components/QuickWeatherCard'

interface HomePhaseViewProps {
  greeting: string
  loveMessage?: DailyLoveMessageViewModel | null
  viewModel: HomeViewModel
}

export function HomePhaseView({
  greeting,
  loveMessage,
  viewModel,
}: HomePhaseViewProps) {
  return (
    <>
      <HomeHero
        context={viewModel.context}
        cruiseProgress={viewModel.cruiseProgress}
        greeting={greeting}
      />

      {loveMessage ? (
        <DailyLoveMessage message={loveMessage} variant="home" />
      ) : null}

      <div className="home-briefing-grid">
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
