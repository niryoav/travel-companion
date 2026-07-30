export type TripSyncDiagnosticStage =
  | 'REQUEST_BODY_PARSED'
  | 'BASE_REVISION_READ'
  | 'CURRENT_SNAPSHOT_LOADED'
  | 'CURRENT_REVISION_DETERMINED'
  | 'REVISION_COMPARED'
  | 'BLOB_WRITE_STARTED'
  | 'BLOB_WRITE_SUCCEEDED'
  | 'RESPONSE_SERIALIZED'

type SafeDiagnosticDetails = Record<
  string,
  boolean | number | string | null
>

export interface TripSyncDiagnostics {
  info(
    stage: TripSyncDiagnosticStage,
    details?: SafeDiagnosticDetails,
  ): void
  error(stage: TripSyncDiagnosticStage, error: unknown): void
}

function safeError(error: unknown): {
  errorMessage: string
  errorName: string
} {
  const errorName =
    error instanceof Error ? error.name : 'UnknownError'
  const rawMessage =
    error instanceof Error ? error.message : 'Unknown error'
  const errorMessage = rawMessage
    .replace(
      /BLOB_READ_WRITE_TOKEN\s*=\s*[^\s,;]+/gi,
      'BLOB_READ_WRITE_TOKEN=[REDACTED]',
    )
    .replace(/https?:\/\/[^\s]+/gi, '[REDACTED_URL]')
    .slice(0, 300)
  return { errorMessage, errorName }
}

export const tripSyncDiagnostics: TripSyncDiagnostics = {
  info(stage, details = {}) {
    if (process.env.NODE_ENV !== 'test') {
      console.info('[trip-sync]', { stage, ...details })
    }
  },
  error(stage, error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[trip-sync]', {
        stage,
        ...safeError(error),
      })
    }
  },
}
