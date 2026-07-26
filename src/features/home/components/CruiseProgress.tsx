import type { CruiseProgress as CruiseProgressModel } from '../homeTypes'

interface CruiseProgressProps {
  progress: CruiseProgressModel
}

export function CruiseProgress({ progress }: CruiseProgressProps) {
  return (
    <div className="cruise-progress">
      <strong>
        Cruise Day {progress.day} of {progress.totalDays}
      </strong>
      <span>{progress.daysRemaining} days remaining</span>
    </div>
  )
}
