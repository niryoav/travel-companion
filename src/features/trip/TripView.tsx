import { TripDayList } from './components/TripDayList'
import { TripEmptyState } from './components/TripEmptyState'
import { TripHeader } from './components/TripHeader'
import { TripProgress } from './components/TripProgress'
import type { TripViewModel } from './tripTypes'

interface TripViewProps {
  canAddMoment?: (dayId: string) => boolean
  onAddMoment?: (dayId: string) => void
  onEditMoment?: (eventId: string) => void
  onEditDay?: (dayId: string) => void
  viewModel: TripViewModel
}

export function TripView({
  canAddMoment,
  onAddMoment,
  onEditMoment,
  onEditDay,
  viewModel,
}: TripViewProps) {
  return (
    <main className="trip-screen" id="main-content">
      <TripHeader header={viewModel.header} />
      <TripProgress progress={viewModel.progress} />
      {viewModel.days.length > 0 ? (
        <TripDayList
          canAddMoment={canAddMoment}
          days={viewModel.days}
          onAddMoment={onAddMoment}
          onEditMoment={onEditMoment}
          onEditDay={onEditDay}
        />
      ) : viewModel.emptyMessage ? (
        <TripEmptyState message={viewModel.emptyMessage} />
      ) : null}
    </main>
  )
}
