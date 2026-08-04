import type { PreparationChecklistGroupViewModel } from '../preparationTypes'

interface PreparationChecklistProps {
  groups: PreparationChecklistGroupViewModel[]
}

export function PreparationChecklist({ groups }: PreparationChecklistProps) {
  if (groups.length === 0) {
    return null
  }

  return (
    <div className="preparation-checklist">
      {groups.map((group) => (
        <section
          key={group.category}
          aria-labelledby={`preparation-category-${group.category}`}
          className="preparation-checklist-group"
        >
          <h3 id={`preparation-category-${group.category}`}>{group.label}</h3>
          <ul>
            {group.items.map((item) => (
              <li
                key={item.id}
                className={`preparation-item preparation-item-${item.level.toLowerCase()}`}
              >
                <span className="preparation-item-level">
                  {item.levelLabel}
                </span>
                <span className="preparation-item-text">{item.text}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
