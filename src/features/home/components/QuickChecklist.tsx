import type { QuickChecklistItem } from '../homeTypes'

interface QuickChecklistProps {
  items: QuickChecklistItem[]
  title: string
}

export function QuickChecklist({
  items,
  title,
}: QuickChecklistProps) {
  return (
    <section className="home-card checklist-card" aria-labelledby="checklist-title">
      <p className="home-card-label">Quick checklist</p>
      <h2 id="checklist-title">{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item.label}>
            <span
              className={`checklist-status${
                item.complete ? ' checklist-status-complete' : ''
              }`}
              aria-hidden="true"
            >
              {item.complete ? '✓' : '○'}
            </span>
            <span>
              {item.label}
              <span className="sr-only">
                {item.complete ? ' — ready' : ' — check needed'}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
