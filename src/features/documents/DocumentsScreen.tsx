import { Link } from 'react-router'

import { PageHeader } from '../../components/PageHeader'
import type { TripData } from '../../domain/trip/tripTypes'
import { DocumentActionLink } from './components/DocumentActionLink'
import { selectDocumentsViewModel } from './selectors/selectDocumentsViewModel'

interface DocumentsScreenProps {
  tripData: TripData
}

export function DocumentsScreen({ tripData }: DocumentsScreenProps) {
  const viewModel = selectDocumentsViewModel(tripData)

  return (
    <main className="page-container documents-screen" id="main-content">
      <PageHeader
        eyebrow="Offline travel folder"
        title="Documents"
        description="The practical confirmations you may need during this trip."
      />

      <p className="documents-viewer-note">
        Documents open in your device&apos;s PDF viewer. Return to Travel
        Companion when finished.
      </p>

      <section
        aria-labelledby="document-group-restaurant-menus"
        className="document-group"
      >
        <h2 id="document-group-restaurant-menus">Onboard</h2>
        <ul>
          <li className="document-card">
            <div className="document-card-meta">
              <span>Dining</span>
              <span className="document-offline-status">
                Available offline
              </span>
            </div>
            <h3>Restaurant menus</h3>
            <p>Browse available menus by restaurant and meal type.</p>
            <Link
              className="document-action"
              to="/documents/restaurant-menus"
            >
              Restaurant menus
            </Link>
          </li>
          <li className="document-card">
            <div className="document-card-meta">
              <span>Activities</span>
              <span className="document-offline-status">
                Available offline
              </span>
            </div>
            <h3>Activities & entertainment</h3>
            <p>Browse onboard activity and entertainment locations by deck.</p>
            <Link className="document-action" to="/documents/activities">
              Activities & entertainment
            </Link>
          </li>
        </ul>
      </section>

      {viewModel.groups.length > 0 ? (
        viewModel.groups.map((group) => (
          <section
            className="document-group"
            aria-labelledby={`document-group-${group.id}`}
            key={group.id}
          >
            <h2 id={`document-group-${group.id}`}>{group.title}</h2>
            <ul>
              {group.documents.map((document) => (
                <li className="document-card" key={document.id}>
                  <div className="document-card-meta">
                    <span>{document.categoryLabel}</span>
                    <span className="document-offline-status">
                      {document.offlineLabel}
                    </span>
                  </div>
                  <h3>{document.title}</h3>
                  <p className="document-date-context">
                    <time dateTime={document.dateTime}>{document.date}</time>
                    {document.context ? ` · ${document.context}` : null}
                  </p>
                  <p>{document.description}</p>
                  {document.operationalNotice ? (
                    <p className="document-operational-notice">
                      {document.operationalNotice}
                    </p>
                  ) : null}
                  <p className="document-verification">
                    {document.verificationLabel}
                  </p>
                  <DocumentActionLink action={document} />
                </li>
              ))}
            </ul>
          </section>
        ))
      ) : (
        <section
          className="documents-empty-state"
          aria-labelledby="documents-empty-title"
        >
          <h2 id="documents-empty-title">No travel documents available</h2>
          <p>
            No additional approved offline travel documents are included in
            this trip.
          </p>
        </section>
      )}
    </main>
  )
}
