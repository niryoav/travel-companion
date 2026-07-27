import type { TodayEventViewModel } from '../todayTypes'
import { TimelineEvent } from './TimelineEvent'

interface DayTimelineProps {
  events: TodayEventViewModel[]
}

export function DayTimeline({ events }: DayTimelineProps) {
  return (
    <section className="today-card today-timeline" aria-labelledby="timeline-title">
      <p className="today-card-label">Today’s plan</p>
      <h2 id="timeline-title">Timeline</h2>
      <ol>
        {events.map((event) => (
          <TimelineEvent key={event.id} event={event} />
        ))}
      </ol>
    </section>
  )
}

