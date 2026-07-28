import type { TodayReturnGuidanceViewModel } from '../todayTypes'

interface ReturnGuidanceCardProps {
  guidance: TodayReturnGuidanceViewModel
}

export function ReturnGuidanceCard({
  guidance,
}: ReturnGuidanceCardProps) {
  return (
    <section
      className={`today-card today-return-guidance today-return-${guidance.state.toLowerCase()}`}
      aria-labelledby="today-return-title"
    >
      <p className="today-card-label">{guidance.label}</p>
      <h2 id="today-return-title">{guidance.title}</h2>
      {guidance.bufferLabel ? (
        <p className="today-return-buffer">{guidance.bufferLabel}</p>
      ) : null}
      <p className="today-supporting-copy">{guidance.detail}</p>
    </section>
  )
}
