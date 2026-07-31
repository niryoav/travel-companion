import { Link } from 'react-router'

import { PageHeader } from '../../components/PageHeader'
import { activitiesEntertainment } from './activitiesEntertainment'

export function ActivitiesEntertainmentScreen() {
  return (
    <main className="page-container documents-screen" id="main-content">
      <PageHeader
        eyebrow="Documents"
        title="Activities & entertainment"
        description="Onboard locations for activities and entertainment, with deck numbers."
      />

      <Link className="documents-back-link" to="/documents">
        Back to Documents
      </Link>

      <section
        aria-labelledby="activities-entertainment-group"
        className="document-group"
      >
        <h2 id="activities-entertainment-group">Onboard</h2>
        <ul>
          {activitiesEntertainment.map((entry) => (
            <li className="document-card" key={entry.location}>
              <div className="document-card-meta">
                <span>{entry.location}</span>
                <span className="document-offline-status">
                  Deck {entry.deck}
                </span>
              </div>
              <p>{entry.activity}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
