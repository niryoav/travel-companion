import type { BeforeYouLeaveViewModel } from '../todayTypes'

interface BeforeYouLeaveCardProps {
  beforeYouLeave: BeforeYouLeaveViewModel
}

export function BeforeYouLeaveCard({
  beforeYouLeave,
}: BeforeYouLeaveCardProps) {
  return (
    <section className="today-card before-you-leave-card" aria-labelledby="before-you-leave-title">
      <p className="today-card-label" id="before-you-leave-title">
        {beforeYouLeave.title}
      </p>
      <ul>
        {beforeYouLeave.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}
