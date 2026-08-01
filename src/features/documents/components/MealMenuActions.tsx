import { resolveMealMenuActions } from '../mealMenuResolver'
import { useRestaurantMenus } from '../restaurantMenuContext'
import { DocumentOfflineStatusIcon } from './DocumentOfflineStatusIcon'
import { documentOfflineService } from '../documentOfflineService'

interface MealMenuActionsProps {
  localStartTime?: string
  mealType: string
  restaurantName: string
}

export function MealMenuActions({
  localStartTime,
  mealType,
  restaurantName,
}: MealMenuActionsProps) {
  const { groups, mealRestaurants } = useRestaurantMenus()
  const actions = resolveMealMenuActions(
    groups,
    restaurantName,
    mealType,
    localStartTime,
    mealRestaurants,
  )

  if (!actions) {
    return null
  }

  const dessertHref = actions.dessert?.href

  return (
    <div className="meal-menu-actions">
      <a
        className="meal-menu-action"
        href={actions.menu.href}
        rel="noreferrer"
        target="_blank"
        onClick={() =>
          void documentOfflineService.ensureCached(actions.menu.href)
        }
      >
        View menu
      </a>
      <DocumentOfflineStatusIcon href={actions.menu.href} />
      {dessertHref ? (
        <>
          <a
            className="meal-menu-action meal-menu-dessert-action"
            href={dessertHref}
            rel="noreferrer"
            target="_blank"
            onClick={() => void documentOfflineService.ensureCached(dessertHref)}
          >
            Dessert
          </a>
          <DocumentOfflineStatusIcon href={dessertHref} />
        </>
      ) : null}
    </div>
  )
}
