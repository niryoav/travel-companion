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
          <h2 id="documents-empty-title">No documents available</h2>
          <p>
            No approved offline travel documents are included in this trip.
          </p>
        </section>
      )}
    </main>
  )
}
