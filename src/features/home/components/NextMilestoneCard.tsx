import type { Milestone } from '../homeTypes'

interface NextMilestoneCardProps {
  milestone: Milestone
}

export function NextMilestoneCard({
  milestone,
}: NextMilestoneCardProps) {
  const urgentClass =
    milestone.tone === 'urgent' ? ' milestone-card-urgent' : ''

  return (
    <section
      className={`home-card milestone-card${urgentClass}`}
      aria-labelledby="next-milestone-title"
    >
      <div className="milestone-heading">
        <div>
          <p className="home-card-label">{milestone.label}</p>
          <h2 id="next-milestone-title">{milestone.title}</h2>
        </div>
        <span className="timeline-symbol" aria-hidden="true" />
      </div>

      <div className="milestone-details">
        {milestone.time ? (
          <p className="milestone-time">{milestone.time}</p>
        ) : null}
        <div>
          {milestone.location ? (
            <p className="milestone-location">{milestone.location}</p>
          ) : null}
          {milestone.detail ? (
            <p className="milestone-detail">{milestone.detail}</p>
          ) : null}
        </div>
      </div>

      {milestone.countdown ? (
        <p className="milestone-countdown">{milestone.countdown}</p>
      ) : null}

      {milestone.allAboardTime ? (
        <div className="all-aboard">
          <span>All aboard</span>
          <strong>{milestone.allAboardTime}</strong>
        </div>
      ) : null}
    </section>
  )
}
