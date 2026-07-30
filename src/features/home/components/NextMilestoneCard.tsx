import { AppIcon } from '../../../components/AppIcon'
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
      <div className="milestone-layout">
        <span
          className="milestone-icon"
          data-icon={milestone.icon}
          aria-hidden="true"
        >
          <AppIcon name={milestone.icon} />
        </span>
        <div className="milestone-content">
          <p className="home-card-label">{milestone.label}</p>
          <h2 id="next-milestone-title">{milestone.title}</h2>

          {milestone.date ? (
            <p className="milestone-date">{milestone.date}</p>
          ) : null}

          <div className="milestone-details">
            {milestone.time ? (
              <time
                className="milestone-time"
                dateTime={milestone.dateTime}
              >
                {milestone.time}
              </time>
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
              <strong>
                {milestone.allAboardTime}
                {milestone.allAboardStatusLabel
                  ? ` · ${milestone.allAboardStatusLabel}`
                  : null}
              </strong>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
