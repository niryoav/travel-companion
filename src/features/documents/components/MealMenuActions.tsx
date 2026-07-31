import { resolveMealMenuActions } from '../mealMenuResolver'
import { useRestaurantMenus } from '../restaurantMenuContext'

interface MealMenuActionsProps {
  isMeal: boolean
  mealType: string
  restaurantName: string
}

export function MealMenuActions({
  isMeal,
  mealType,
  restaurantName,
}: MealMenuActionsProps) {
  const groups = useRestaurantMenus()
  const actions = isMeal
    ? resolveMealMenuActions(groups, restaurantName, mealType)
    : null

  if (!actions) {
    return null
  }

  return (
    <div className="meal-menu-actions">
      <a
        className="meal-menu-action"
        href={actions.menu.href}
        rel="noreferrer"
        target="_blank"
      >
        View menu
      </a>
      {actions.dessert ? (
        <a
          className="meal-menu-action meal-menu-dessert-action"
          href={actions.dessert.href}
          rel="noreferrer"
          target="_blank"
        >
          Dessert
        </a>
      ) : null}
    </div>
  )
}
