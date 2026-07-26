import type { HomeViewModel } from './homeTypes'
import { HomeAlert } from './components/HomeAlert'
import { HomeHero } from './components/HomeHero'
import { NextMilestoneCard } from './components/NextMilestoneCard'
import { QuickChecklist } from './components/QuickChecklist'
import { QuickWeatherCard } from './components/QuickWeatherCard'

interface HomePhaseViewProps {
  greeting: string
  viewModel: HomeViewModel
}

export function HomePhaseView({
  greeting,
  viewModel,
}: HomePhaseViewProps) {
  return (
    <>
      <HomeHero
        context={viewModel.context}
        cruiseProgress={viewModel.cruiseProgress}
        greeting={greeting}
      />

      <div className="home-briefing-grid">
        <NextMilestoneCard milestone={viewModel.milestone} />
        <QuickWeatherCard weather={viewModel.weather} />
        <QuickChecklist
          items={viewModel.checklist}
          title={viewModel.checklistTitle}
        />
      </div>

      {viewModel.alert ? <HomeAlert alert={viewModel.alert} /> : null}
    </>
  )
}
