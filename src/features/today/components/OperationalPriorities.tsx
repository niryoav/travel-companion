import { DocumentActionLink } from '../../documents/components/DocumentActionLink'
import type { TodayPriorityViewModel } from '../todayTypes'

interface OperationalPrioritiesProps {
  priorities: TodayPriorityViewModel[]
}

export function OperationalPriorities({
  priorities,
}: OperationalPrioritiesProps) {
  return (
    <section
      className="today-card today-priorities"
      aria-labelledby="today-priorities-title"
    >
      <p className="today-card-label">Daily priorities</p>
      <h2 id="today-priorities-title">What needs attention</h2>
      {priorities.length > 0 ? (
        <ul>
          {priorities.map((priority) => (
            <li
              className={`today-priority today-priority-${priority.level.toLowerCase()}`}
              key={priority.id}
            >
              <div>
                <strong>{priority.title}</strong>
                <p>{priority.detail}</p>
              </div>
              {priority.documentAction ? (
                <DocumentActionLink
                  action={priority.documentAction}
                  className="today-event-document-link"
                />
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="today-supporting-copy">
          No urgent actions are configured right now.
        </p>
      )}
    </section>
  )
}
