import type { HomeAlert as HomeAlertModel } from '../homeTypes'

interface HomeAlertProps {
  alert: HomeAlertModel
}

export function HomeAlert({ alert }: HomeAlertProps) {
  return (
    <section className="home-alert" aria-labelledby="home-alert-title">
      <span className="home-alert-marker" aria-hidden="true">
        !
      </span>
      <div>
        <p className="home-card-label">Action needed</p>
        <h2 id="home-alert-title">{alert.title}</h2>
        <p>{alert.detail}</p>
      </div>
    </section>
  )
}
