import { PortAccessIndicator } from '../../../components/PortAccessIndicator'
import type { TodayPortViewModel } from '../todayTypes'

interface PortDaySummaryProps {
  port: TodayPortViewModel
}

export function PortDaySummary({ port }: PortDaySummaryProps) {
  return (
    <section className="today-card today-port" aria-labelledby="port-summary-title">
      <p className="today-card-label">Port context</p>
      <h2 id="port-summary-title">{port.location}</h2>
      {port.accessLabel && port.accessStatus ? (
        <p className="today-port-access">
          <PortAccessIndicator
            label={port.accessLabel}
            status={port.accessStatus}
          />
        </p>
      ) : null}
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
      {port.tender ? (
        <dl className="today-tender-times">
          {port.tender.firstTender ? (
            <div>
              <dt>First tender</dt>
              <dd>
                {port.tender.firstTender.time ? (
                  <time dateTime={port.tender.firstTender.dateTime}>
                    {port.tender.firstTender.time}
                  </time>
                ) : port.tender.firstTender.statusLabel}
              </dd>
            </div>
          ) : null}
          {port.tender.lastTender ? (
            <div>
              <dt>Last tender back</dt>
              <dd>
                {port.tender.lastTender.time ? (
                  <time dateTime={port.tender.lastTender.dateTime}>
                    {port.tender.lastTender.time}
                  </time>
                ) : port.tender.lastTender.statusLabel}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {port.tender?.note ? <p>{port.tender.note}</p> : null}
      {port.operationalNote ? <p>{port.operationalNote}</p> : null}
    </section>
  )
}
