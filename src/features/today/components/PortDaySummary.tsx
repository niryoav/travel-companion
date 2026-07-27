import type { TodayPortViewModel } from '../todayTypes'

interface PortDaySummaryProps {
  port: TodayPortViewModel
}

export function PortDaySummary({ port }: PortDaySummaryProps) {
  return (
    <section className="today-card today-port" aria-labelledby="port-summary-title">
      <p className="today-card-label">Port context</p>
      <h2 id="port-summary-title">{port.location}</h2>
      {port.arrivalTime || port.departureTime ? (
        <dl>
          {port.arrivalTime ? (
            <div>
              <dt>Arrival</dt>
              <dd>
                <time dateTime={port.arrivalAt}>{port.arrivalTime}</time>
              </dd>
            </div>
          ) : null}
          {port.departureTime ? (
            <div>
              <dt>Departure</dt>
              <dd>
                <time dateTime={port.departureAt}>{port.departureTime}</time>
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="today-supporting-copy">
          No verified arrival or departure time is configured.
        </p>
      )}
    </section>
  )
}

