import { useEffect } from 'react'
import { Link } from 'react-router'

import { PageHeader } from '../../components/PageHeader'
import { DocumentOfflineStatusIcon } from './components/DocumentOfflineStatusIcon'
import { deckPlans } from './deckPlans'
import { documentOfflineService } from './documentOfflineService'

export function DeckPlansScreen() {
  useEffect(() => {
    void documentOfflineService.syncMissing(
      deckPlans.map(({ href }) => href),
    )
  }, [])

  return (
    <main className="page-container documents-screen" id="main-content">
      <PageHeader
        eyebrow="Documents"
        title="Deck plans"
        description="Browse the Oceania Marina deck plans, from top deck to bottom."
      />

      <Link className="documents-back-link" to="/documents">
        Back to Documents
      </Link>

      <section aria-labelledby="deck-plans-group" className="document-group">
        <h2 id="deck-plans-group">Onboard</h2>
        <ul>
          {deckPlans.map((plan) => (
            <li className="document-card" key={plan.deck}>
              <div className="document-card-meta">
                <span>Deck plan</span>
                <DocumentOfflineStatusIcon href={plan.href} />
              </div>
              <h3>{plan.label}</h3>
              <a
                className="document-action"
                href={plan.href}
                rel="noreferrer"
                target="_blank"
                onClick={() =>
                  void documentOfflineService.ensureCached(plan.href)
                }
              >
                Open {plan.label} plan
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
