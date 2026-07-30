import type { TodayPreparationViewModel } from '../todayTypes'

const preparationGroups = [
  ['breakfastActions', 'During breakfast'],
  ['take', 'What to take'],
  ['dress', 'How to dress'],
  ['provided', 'Provided'],
] as const

export function TodayPreparationCard({
  preparation,
}: {
  preparation: TodayPreparationViewModel
}) {
  return (
    <section
      className="today-card today-preparation"
      aria-labelledby="today-preparation-title"
    >
      <p className="today-card-label">Preparation</p>
      <h2 id="today-preparation-title">Ready for today</h2>
      <div className="today-preparation-grid">
        {preparationGroups.map(([key, title]) => {
          const items = preparation[key]
          return items?.length ? (
            <section key={key}>
              <h3>{title}</h3>
              <ul>
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null
        })}
      </div>
    </section>
  )
}
