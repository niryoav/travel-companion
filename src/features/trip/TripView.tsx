import { TripDayList } from './components/TripDayList'
import { TripEmptyState } from './components/TripEmptyState'
import { TripHeader } from './components/TripHeader'
import { TripProgress } from './components/TripProgress'
import type { TripViewModel } from './tripTypes'

interface TripViewProps {
  onEditDay?: (dayId: string) => void
  viewModel: TripViewModel
}

export function TripView({ onEditDay, viewModel }: TripViewProps) {
  return (
    <main className="trip-screen" id="main-content">
      <TripHeader header={viewModel.header} />
      <TripProgress progress={viewModel.progress} />
      {viewModel.days.length > 0 ? (
        <TripDayList days={viewModel.days} onEditDay={onEditDay} />
      ) : viewModel.emptyMessage ? (
        <TripEmptyState message={viewModel.emptyMessage} />
      ) : null}
    </main>
  )
}
