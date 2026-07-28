import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'

import { PortAccessIndicator } from '../../../components/PortAccessIndicator'
import {
  validateOperationalEditTiming,
  type OperationalEditField,
  type OperationalEditIssue,
} from '../../../domain/trip/operationalEditValidation'
import type { TripOverrideBundle } from '../../../domain/trip/tripOverrides'
import type {
  ExcursionOperationalStatus,
  OperationalEntryStatus,
  PortAccessStatus,
  TripData,
} from '../../../domain/trip/tripTypes'
import type { TripOverrideRepository } from '../../../storage/TripOverrideRepository'
import {
  buildTripDayOverrides,
  createTripDayEditDraft,
  type ExcursionEditDraft,
  type TenderTimeDraft,
  type TripDayEditDraft,
} from '../editing/tripEditModel'

interface TripEditSheetProps {
  baselineTripData: TripData
  dayId: string
  effectiveTripData: TripData
  onClose: () => void
  onSaved: (message: string) => void
  repository: TripOverrideRepository
  overrides: TripOverrideBundle
}

interface FieldProps {
  children: ReactNode
  current: string
  label: string
  original: string
  onUseOriginal: () => void
  renderValue?: (value: string) => ReactNode
}

function Field({
  children,
  current,
  label,
  original,
  onUseOriginal,
  renderValue = (value) => value || 'Not set',
}: FieldProps) {
  const changed = current !== original
  return (
    <div className="trip-edit-field">
      {children}
      {changed ? (
        <div className="trip-edit-comparison">
          <span>Original: {renderValue(original)}</span>
          <span>Updated: {renderValue(current)}</span>
          <button type="button" onClick={onUseOriginal}>
            Use original
            <span className="sr-only"> for {label}</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}

function SelectField({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <label htmlFor={id}>
      <span>{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  )
}

function FieldMessages({
  id,
  issues = [],
}: {
  id: string
  issues?: OperationalEditIssue[]
}) {
  return issues.length > 0 ? (
    <div
      aria-live="polite"
      className="trip-edit-field-messages"
      id={`${id}-validation`}
    >
      {issues.map(({ message, severity }) => (
        <p
          className={
            severity === 'ERROR'
              ? 'trip-edit-field-error'
              : 'trip-edit-field-warning'
          }
          key={`${severity}-${message}`}
        >
          {message}
        </p>
      ))}
    </div>
  ) : null
}

function TextInput({
  id,
  label,
  value,
  onChange,
  type = 'text',
  inputMode,
  issues,
  maxLength,
  validationField,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'time' | 'number'
  inputMode?: 'numeric'
  issues?: OperationalEditIssue[]
  maxLength?: number
  validationField?: OperationalEditField
}) {
  const hasError = issues?.some(
    ({ severity }) => severity === 'ERROR',
  )
  return (
    <>
      <label htmlFor={id}>
        <span>{label}</span>
        <input
          aria-describedby={
            issues?.length ? `${id}-validation` : undefined
          }
          aria-invalid={hasError || undefined}
          data-validation-field={validationField}
          id={id}
          inputMode={inputMode}
          maxLength={maxLength}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <FieldMessages id={id} issues={issues} />
    </>
  )
}

function TextArea({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label htmlFor={id}>
      <span>{label}</span>
      <textarea
        id={id}
        maxLength={240}
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function TenderTimeField({
  id,
  label,
  value,
  original,
  issues,
  onChange,
  onUseOriginal,
}: {
  id: string
  label: string
  value: TenderTimeDraft
  original: TenderTimeDraft
  issues?: OperationalEditIssue[]
  onChange: (value: TenderTimeDraft) => void
  onUseOriginal: () => void
}) {
  const currentLabel = `${value.time || 'Not set'} · ${value.verification}`
  const originalLabel =
    `${original.time || 'Not set'} · ${original.verification}`
  return (
    <Field
      current={currentLabel}
      label={label}
      original={originalLabel}
      onUseOriginal={onUseOriginal}
    >
      <div className="trip-edit-time-with-status">
        <TextInput
          id={`${id}-time`}
          label={label}
          issues={issues}
          type="time"
          validationField={
            id === 'trip-edit-first-tender'
              ? 'firstTenderTime'
              : id === 'trip-edit-our-tender'
                ? 'ourTenderTime'
                : 'lastTenderTime'
          }
          value={value.time}
          onChange={(time) =>
            onChange({
              ...value,
              time,
              verification: time
                ? value.verification === 'TO_BE_CONFIRMED'
                  ? 'CONFIRMED'
                  : value.verification
                : 'TO_BE_CONFIRMED',
            })
          }
        />
        <SelectField
          id={`${id}-status`}
          label={`${label} status`}
          value={value.verification}
          onChange={(verification) =>
            onChange({
              ...value,
              verification: verification as OperationalEntryStatus,
            })
          }
        >
          <option value="CONFIRMED">Confirmed</option>
          <option value="ESTIMATED">Estimated</option>
          <option value="TO_BE_CONFIRMED">To be confirmed</option>
        </SelectField>
      </div>
    </Field>
  )
}

function excursionStatusLabel(status: ExcursionOperationalStatus) {
  switch (status) {
    case 'CONFIRMED':
      return 'Confirmed'
    case 'ESTIMATED':
      return 'Estimated'
    case 'TO_BE_CONFIRMED':
      return 'To be confirmed'
    case 'CHANGED':
      return 'Changed'
    case 'CANCELLED':
      return 'Cancelled'
  }
}

function ExcursionFields({
  excursion,
  original,
  onChange,
  onReset,
  hasPersistedOverride,
  issues,
}: {
  excursion: ExcursionEditDraft
  original: ExcursionEditDraft
  onChange: (value: ExcursionEditDraft) => void
  onReset: () => void
  hasPersistedOverride: boolean
  issues: OperationalEditIssue[]
}) {
  const update = (
    key: keyof ExcursionEditDraft,
    value: ExcursionEditDraft[keyof ExcursionEditDraft],
  ) => onChange({ ...excursion, [key]: value })
  const prefix = `trip-edit-${excursion.id}`
  const fieldIssues = (
    field:
      | 'meetingTime'
      | 'startTime'
      | 'endTime'
      | 'travelDurationMinutes',
  ) =>
    issues.filter(
      ({ field: issueField }) =>
        issueField === `excursion:${excursion.id}:${field}`,
    )

  return (
    <fieldset className="trip-edit-section trip-edit-excursion">
      <legend>{excursion.title}</legend>
      <p className="trip-edit-context">
        {excursion.bookingType === 'INDEPENDENT'
          ? 'Independent excursion'
          : 'Oceania-operated excursion'}
      </p>

      <Field
        current={excursionStatusLabel(excursion.status)}
        label={`${excursion.title} status`}
        original={excursionStatusLabel(original.status)}
        onUseOriginal={() => update('status', original.status)}
      >
        <SelectField
          id={`${prefix}-status`}
          label="Status"
          value={excursion.status}
          onChange={(value) =>
            update('status', value as ExcursionOperationalStatus)
          }
        >
          <option value="CONFIRMED">Confirmed</option>
          <option value="ESTIMATED">Estimated</option>
          <option value="TO_BE_CONFIRMED">To be confirmed</option>
          <option value="CHANGED">Changed</option>
          <option value="CANCELLED">Cancelled</option>
        </SelectField>
      </Field>

      {([
        ['meetingTime', 'Meeting / check-in time'],
        ['startTime', 'Start time'],
        ['endTime', 'End / return time'],
      ] as const).map(([key, label]) => (
        <Field
          current={excursion[key]}
          key={key}
          label={`${excursion.title} ${label}`}
          original={original[key]}
          onUseOriginal={() => update(key, original[key])}
        >
          <TextInput
            id={`${prefix}-${key}`}
            issues={fieldIssues(key)}
            label={label}
            type="time"
            validationField={`excursion:${excursion.id}:${key}`}
            value={excursion[key]}
            onChange={(value) => update(key, value)}
          />
        </Field>
      ))}

      <Field
        current={excursion.meetingPoint}
        label={`${excursion.title} meeting point`}
        original={original.meetingPoint}
        onUseOriginal={() =>
          update('meetingPoint', original.meetingPoint)
        }
      >
        <TextInput
          id={`${prefix}-meeting-point`}
          label="Meeting point"
          maxLength={160}
          value={excursion.meetingPoint}
          onChange={(value) => update('meetingPoint', value)}
        />
      </Field>

      {excursion.bookingType === 'INDEPENDENT' ? (
        <Field
          current={excursion.travelDurationMinutes}
          label={`${excursion.title} travel duration`}
          original={original.travelDurationMinutes}
          onUseOriginal={() =>
            update(
              'travelDurationMinutes',
              original.travelDurationMinutes,
            )
          }
        >
          <TextInput
            id={`${prefix}-travel-duration`}
            inputMode="numeric"
            issues={fieldIssues('travelDurationMinutes')}
            label="Estimated travel duration (minutes)"
            type="number"
            validationField={
              `excursion:${excursion.id}:travelDurationMinutes`
            }
            value={excursion.travelDurationMinutes}
            onChange={(value) =>
              update('travelDurationMinutes', value)
            }
          />
        </Field>
      ) : null}

      <Field
        current={excursion.note}
        label={`${excursion.title} note`}
        original={original.note}
        onUseOriginal={() => update('note', original.note)}
      >
        <TextArea
          id={`${prefix}-note`}
          label="Short operational note"
          value={excursion.note}
          onChange={(value) => update('note', value)}
        />
      </Field>

      {hasPersistedOverride ? (
        <button
          className="trip-edit-reset"
          type="button"
          onClick={onReset}
        >
          Reset this excursion
        </button>
      ) : null}
    </fieldset>
  )
}

export function TripEditSheet({
  baselineTripData,
  dayId,
  effectiveTripData,
  onClose,
  onSaved,
  repository,
  overrides,
}: TripEditSheetProps) {
  const dialogRef = useRef<HTMLElement>(null)
  const originalDraft = useMemo(
    () => createTripDayEditDraft(baselineTripData, dayId),
    [baselineTripData, dayId],
  )
  const initialDraft = useMemo(
    () => createTripDayEditDraft(effectiveTripData, dayId),
    [effectiveTripData, dayId],
  )
  const [draft, setDraft] = useState(initialDraft)
  const [saveErrors, setSaveErrors] = useState<string[]>([])
  const validation = useMemo(
    () =>
      draft
        ? validateOperationalEditTiming(draft)
        : { errors: [], issues: [], warnings: [] },
    [draft],
  )
  const dirty =
    Boolean(draft && initialDraft) &&
    JSON.stringify(draft) !== JSON.stringify(initialDraft)
  const dirtyRef = useRef(dirty)
  const onCloseRef = useRef(onClose)
  const eventIds = draft?.excursions.map(({ id }) => id) ?? []
  const hasPersistedChanges = Boolean(
    overrides.dayOverrides[dayId] ||
    eventIds.some((eventId) => overrides.eventOverrides[eventId]),
  )
  const latestUpdate = [
    overrides.dayOverrides[dayId]?.updatedAt,
    ...eventIds.map(
      (eventId) => overrides.eventOverrides[eventId]?.updatedAt,
    ),
  ]
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0]

  const requestClose = () => {
    if (
      dirty &&
      !window.confirm('Discard the changes you have not saved?')
    ) {
      return
    }
    onClose()
  }

  useEffect(() => {
    dirtyRef.current = dirty
    onCloseRef.current = onClose
  }, [dirty, onClose])

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    const focusableSelector =
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
    dialog?.querySelector<HTMLElement>(focusableSelector)?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (
          !dirtyRef.current ||
          window.confirm('Discard the changes you have not saved?')
        ) {
          onCloseRef.current()
        }
        return
      }
      if (event.key !== 'Tab' || !dialog) {
        return
      }
      const focusable = [
        ...dialog.querySelectorAll<HTMLElement>(focusableSelector),
      ]
      if (focusable.length === 0) {
        return
      }
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
      previousFocus?.focus()
    }
  }, [])

  if (!draft || !originalDraft) {
    return null
  }

  const updateDraft = <K extends keyof TripDayEditDraft>(
    key: K,
    value: TripDayEditDraft[K],
  ) => {
    setSaveErrors([])
    setDraft({ ...draft, [key]: value })
  }
  const updateExcursion = (value: ExcursionEditDraft) =>
    updateDraft(
      'excursions',
      draft.excursions.map((excursion) =>
        excursion.id === value.id ? value : excursion,
      ),
    )

  const issuesFor = (field: OperationalEditField) =>
    validation.issues.filter(
      ({ field: issueField }) => issueField === field,
    )
  const focusFirstBlockingError = () => {
    const firstField = validation.errors[0]?.field
    if (!firstField) {
      return
    }
    const field = [
      ...(dialogRef.current?.querySelectorAll<HTMLElement>(
        '[data-validation-field]',
      ) ?? []),
    ].find(
      ({ dataset }) => dataset.validationField === firstField,
    )
    field?.focus()
  }

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (validation.errors.length > 0) {
      setSaveErrors([])
      focusFirstBlockingError()
      return
    }
    const result = buildTripDayOverrides(baselineTripData, draft)
    if (result.errors.length > 0) {
      setSaveErrors(result.errors)
      return
    }
    repository.saveDayEdits(
      dayId,
      result.dayOverride,
      result.eventOverrides,
    )
    onSaved('Trip details saved on this device.')
    onClose()
  }

  const confirmReset = (message: string, action: () => void) => {
    if (!window.confirm(message)) {
      return
    }
    action()
    onSaved('Local change reset to the original itinerary.')
    onClose()
  }

  return (
    <div className="trip-edit-backdrop">
      <section
        aria-labelledby="trip-edit-title"
        aria-modal="true"
        className="trip-edit-sheet"
        ref={dialogRef}
        role="dialog"
      >
        <form onSubmit={save}>
          <header className="trip-edit-header">
            <div>
              <p className="trip-card-label">Edit trip detail</p>
              <h2 id="trip-edit-title">{draft.title}</h2>
              <p>Local time · {draft.timeZone}</p>
            </div>
            <button
              aria-label="Close trip editor"
              className="trip-edit-close"
              type="button"
              onClick={requestClose}
            >
              ×
            </button>
          </header>

          <div className="trip-edit-body">
            {hasPersistedChanges ? (
              <p className="trip-edit-updated">
                Changed locally
                {latestUpdate
                  ? ` on ${new Intl.DateTimeFormat('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(latestUpdate))}`
                  : null}
              </p>
            ) : null}
            {saveErrors.length > 0 ? (
              <div className="trip-edit-errors" role="alert">
                <strong>Check these details</strong>
                <ul>
                  {saveErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <fieldset className="trip-edit-section">
              <legend>Day and port operations</legend>
              <PortAccessIndicator
                className="trip-edit-port-access-current"
                status={draft.portAccessStatus}
              />
              <Field
                current={draft.portAccessStatus}
                label="Port access status"
                original={originalDraft.portAccessStatus}
                onUseOriginal={() =>
                  updateDraft(
                    'portAccessStatus',
                    originalDraft.portAccessStatus,
                  )
                }
                renderValue={(value) => (
                  <PortAccessIndicator
                    status={value as PortAccessStatus}
                  />
                )}
              >
                <SelectField
                  id="trip-edit-port-access"
                  label="Port access status"
                  value={draft.portAccessStatus}
                  onChange={(value) =>
                    updateDraft(
                      'portAccessStatus',
                      value as PortAccessStatus,
                    )
                  }
                >
                  <option value="DOCKED">Docked</option>
                  <option value="TENDER_REQUIRED">Tender required</option>
                  <option value="TO_BE_CONFIRMED">To be confirmed</option>
                </SelectField>
              </Field>

              {([
                ['arrivalTime', 'Ship arrival time'],
                ['departureTime', 'Ship departure time'],
                ['allAboardTime', 'All Aboard time'],
              ] as const).map(([key, label]) => (
                <Field
                  current={draft[key]}
                  key={key}
                  label={label}
                  original={originalDraft[key]}
                  onUseOriginal={() =>
                    updateDraft(key, originalDraft[key])
                  }
                >
                  <TextInput
                    id={`trip-edit-${key}`}
                    issues={issuesFor(key)}
                    label={label}
                    type="time"
                    validationField={key}
                    value={draft[key]}
                    onChange={(value) => updateDraft(key, value)}
                  />
                </Field>
              ))}

              <Field
                current={draft.dayNote}
                label="Day operational note"
                original={originalDraft.dayNote}
                onUseOriginal={() =>
                  updateDraft('dayNote', originalDraft.dayNote)
                }
              >
                <TextArea
                  id="trip-edit-day-note"
                  label="Short operational note"
                  value={draft.dayNote}
                  onChange={(value) => updateDraft('dayNote', value)}
                />
              </Field>
            </fieldset>

            {draft.portAccessStatus === 'TENDER_REQUIRED' ? (
              <fieldset className="trip-edit-section">
                <legend>Tender operations</legend>
                <p className="trip-edit-context">
                  Leave unknown values empty or mark them To be confirmed.
                </p>
                <TenderTimeField
                  id="trip-edit-first-tender"
                  issues={issuesFor('firstTenderTime')}
                  label="First tender time"
                  value={draft.firstTender}
                  original={originalDraft.firstTender}
                  onChange={(value) =>
                    updateDraft('firstTender', value)
                  }
                  onUseOriginal={() =>
                    updateDraft(
                      'firstTender',
                      originalDraft.firstTender,
                    )
                  }
                />
                <TenderTimeField
                  id="trip-edit-our-tender"
                  issues={issuesFor('ourTenderTime')}
                  label="Our tender / tender-ticket time"
                  value={draft.ourTender}
                  original={originalDraft.ourTender}
                  onChange={(value) =>
                    updateDraft('ourTender', value)
                  }
                  onUseOriginal={() =>
                    updateDraft('ourTender', originalDraft.ourTender)
                  }
                />
                <Field
                  current={draft.tenderMeetingPoint}
                  label="Tender meeting point"
                  original={originalDraft.tenderMeetingPoint}
                  onUseOriginal={() =>
                    updateDraft(
                      'tenderMeetingPoint',
                      originalDraft.tenderMeetingPoint,
                    )
                  }
                >
                  <TextInput
                    id="trip-edit-tender-meeting-point"
                    label="Tender meeting point"
                    maxLength={160}
                    value={draft.tenderMeetingPoint}
                    onChange={(value) =>
                      updateDraft('tenderMeetingPoint', value)
                    }
                  />
                </Field>
                <Field
                  current={draft.tenderCrossingMinutes}
                  label="Tender crossing duration"
                  original={originalDraft.tenderCrossingMinutes}
                  onUseOriginal={() =>
                    updateDraft(
                      'tenderCrossingMinutes',
                      originalDraft.tenderCrossingMinutes,
                    )
                  }
                >
                  <TextInput
                    id="trip-edit-tender-crossing"
                    inputMode="numeric"
                    issues={issuesFor('tenderCrossingMinutes')}
                    label="Estimated tender crossing duration (minutes)"
                    type="number"
                    validationField="tenderCrossingMinutes"
                    value={draft.tenderCrossingMinutes}
                    onChange={(value) =>
                      updateDraft('tenderCrossingMinutes', value)
                    }
                  />
                </Field>
                <TenderTimeField
                  id="trip-edit-last-tender"
                  issues={issuesFor('lastTenderTime')}
                  label="Last tender back to ship"
                  value={draft.lastTender}
                  original={originalDraft.lastTender}
                  onChange={(value) =>
                    updateDraft('lastTender', value)
                  }
                  onUseOriginal={() =>
                    updateDraft('lastTender', originalDraft.lastTender)
                  }
                />
                <Field
                  current={draft.tenderNote}
                  label="Tender note"
                  original={originalDraft.tenderNote}
                  onUseOriginal={() =>
                    updateDraft(
                      'tenderNote',
                      originalDraft.tenderNote,
                    )
                  }
                >
                  <TextArea
                    id="trip-edit-tender-note"
                    label="Tender note"
                    value={draft.tenderNote}
                    onChange={(value) =>
                      updateDraft('tenderNote', value)
                    }
                  />
                </Field>
              </fieldset>
            ) : null}

            {draft.excursions.map((excursion) => {
              const original = originalDraft.excursions.find(
                ({ id }) => id === excursion.id,
              )
              return original ? (
                <ExcursionFields
                  excursion={excursion}
                  hasPersistedOverride={Boolean(
                    overrides.eventOverrides[excursion.id],
                  )}
                  key={excursion.id}
                  issues={validation.issues}
                  original={original}
                  onChange={updateExcursion}
                  onReset={() =>
                    confirmReset(
                      `Reset local changes for ${excursion.title}?`,
                      () => repository.resetEvent(excursion.id),
                    )
                  }
                />
              ) : null
            })}

            {hasPersistedChanges ? (
              <button
                className="trip-edit-reset trip-edit-reset-day"
                type="button"
                onClick={() =>
                  confirmReset(
                    'Reset every local change for this day?',
                    () => repository.resetDay(dayId, eventIds),
                  )
                }
              >
                Reset this day
              </button>
            ) : null}
          </div>

          <footer className="trip-edit-footer">
            <button type="button" onClick={requestClose}>
              Cancel
            </button>
            <button
              className="trip-edit-save"
              disabled={validation.errors.length > 0}
              type="submit"
            >
              Save
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}
