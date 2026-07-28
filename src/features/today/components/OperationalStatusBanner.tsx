import type { TodayOperationalStatusViewModel } from '../todayTypes'

interface OperationalStatusBannerProps {
  status: TodayOperationalStatusViewModel
}

export function OperationalStatusBanner({
  status,
}: OperationalStatusBannerProps) {
  return (
    <section
      className={`today-operational-status today-operational-status-${status.urgency.toLowerCase()}`}
      aria-labelledby="today-operational-status-title"
    >
      <div>
        <p className="today-card-label">{status.label}</p>
        <h2 id="today-operational-status-title">{status.title}</h2>
        <p>{status.detail}</p>
      </div>
      {status.time ? (
        <div className="today-operational-deadline">
          <span>All Aboard</span>
          <time dateTime={status.dateTime}>{status.time}</time>
          {status.timeRemaining ? <strong>{status.timeRemaining}</strong> : null}
        </div>
      ) : null}
    </section>
  )
}
