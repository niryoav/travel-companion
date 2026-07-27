import type { TodayHeaderViewModel } from '../todayTypes'

interface TodayHeaderProps {
  header: TodayHeaderViewModel
}

export function TodayHeader({ header }: TodayHeaderProps) {
  return (
    <header className="today-header">
      <p className="today-eyebrow">{header.eyebrow}</p>
      <h1>{header.title}</h1>
      {header.summary ? (
        <p className="today-header-summary">{header.summary}</p>
      ) : null}
      {header.date || header.timeZoneLabel ? (
        <div className="today-date-context">
          {header.date ? (
            <time dateTime={header.dateTime}>{header.date}</time>
          ) : null}
          {header.timeZoneLabel ? (
            <span>Local time · {header.timeZoneLabel}</span>
          ) : null}
        </div>
      ) : null}
    </header>
  )
}

