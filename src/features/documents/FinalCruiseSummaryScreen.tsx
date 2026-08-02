import { useEffect } from 'react'
import { Link } from 'react-router'

import { PageHeader } from '../../components/PageHeader'
import { DocumentOfflineStatusIcon } from './components/DocumentOfflineStatusIcon'
import { documentOfflineService } from './documentOfflineService'
import { finalCruiseSummaryDocuments } from './finalCruiseSummary'

export function FinalCruiseSummaryScreen() {
  useEffect(() => {
    void documentOfflineService.syncMissing(
      finalCruiseSummaryDocuments.map(({ href }) => href),
    )
  }, [])

  return (
    <main className="page-container documents-screen" id="main-content">
      <PageHeader
        eyebrow="Documents"
        title="Final Cruise Documents — Oceania"
        description="Boarding, registration, and reference documents issued by Oceania Cruises for this voyage."
      />

      <Link className="documents-back-link" to="/documents">
        Back to Documents
      </Link>

      <section
        aria-labelledby="final-cruise-summary-group"
        className="document-group"
      >
        <h2 id="final-cruise-summary-group">Boarding & reference</h2>
        <ul>
          {finalCruiseSummaryDocuments.map((document) => (
            <li className="document-card" key={document.id}>
              <div className="document-card-meta">
                <span>Cruise summary</span>
                <DocumentOfflineStatusIcon href={document.href} />
              </div>
              <h3>{document.title}</h3>
              <p>{document.description}</p>
              <a
                className="document-action"
                href={document.href}
                rel="noreferrer"
                target="_blank"
                onClick={() =>
                  void documentOfflineService.ensureCached(document.href)
                }
              >
                Open {document.title}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
