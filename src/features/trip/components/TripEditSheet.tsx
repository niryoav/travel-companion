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
  type ScheduledEventEditDraft,
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
  pickerDefault,
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
  pickerDefault?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const seededPicker = useRef(false)
  const hasError = issues?.some(
    ({ severity }) => severity === 'ERROR',
  )
  const clearPickerSeed = () => {
    seededPicker.current = false
    if (inputRef.current) {
      delete inputRef.current.dataset.pickerPreview
      if (!value) {
        inputRef.current.value = ''
      }
    }
  }
  const seedPicker = () => {
    if (
      type === 'time' &&
      !value &&
      pickerDefault &&
      inputRef.current
    ) {
      inputRef.current.value = pickerDefault
      inputRef.current.dataset.pickerPreview = 'true'
      seededPicker.current = true
    }
  }
  return (
    <>
      <label htmlFor={id}>
        <span>{label}</span>
        <input
          aria-describedby={
            issues?.length ? `${id}-validation` : undefined
          }
          aria-invalid={hasError || undefined}
          data-picker-default={pickerDefault}
          data-validation-field={validationField}
          id={id}
          inputMode={inputMode}
          maxLength={maxLength}
          ref={inputRef}
          type={type}
          value={value}
          onBlur={clearPickerSeed}
          onChange={(event) => {
            seededPicker.current = false
            delete event.currentTarget.dataset.pickerPreview
            onChange(event.target.value)
          }}
          onFocus={seedPicker}
          onPointerDown={seedPicker}
        />
      </label>
      {type === 'time' ? (
        <div className="trip-edit-time-actions">
          {!value ? (
            <span aria-live="polite">Not set</span>
          ) : null}
          {value ? (
            <button
              type="button"
              onClick={() => {
                clearPickerSeed()
                onChange('')
              }}
            >
              Clear time
              <span className="sr-only"> for {label}</span>
            </button>
          ) : null}
        </div>
      ) : null}
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

function OperationalTimeField({
  id,
  label,
  validationField,
  value,
  original,
  issues,
  onChange,
  onUseOriginal,
  pickerDefault,
  estimatedStatusLabel = 'Estimated',
}: {
  id: string
  label: string
  validationField: OperationalEditField
  value: TenderTimeDraft
  original: TenderTimeDraft
  issues?: OperationalEditIssue[]
  onChange: (value: TenderTimeDraft) => void
  onUseOriginal: () => void
  pickerDefault?: string
  estimatedStatusLabel?: string
}) {
  const currentLabel = `${value.time || 'Not set'} · ${value.verification}`
  const originalLabel =
    `${original.time || 'Not set'} · ${original.verification}`
  const renderOperationalValue = (fieldValue: string) => {
    const [time, verification] = fieldValue.split(' · ')
    const status =
      verification === 'TO_BE_CONFIRMED'
        ? 'To be confirmed'
        : verification === 'ESTIMATED'
          ? estimatedStatusLabel
          : verification.charAt(0) +
            verification.slice(1).toLowerCase()
    return `${time} · ${status}`
  }
  return (
    <Field
      current={currentLabel}
      label={label}
      original={originalLabel}
      onUseOriginal={onUseOriginal}
      renderValue={renderOperationalValue}
    >
      <div className="trip-edit-time-with-status">
        <TextInput
          id={`${id}-time`}
          label={label}
          issues={issues}
          type="time"
          pickerDefault={pickerDefault}
          validationField={validationField}
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
          <option value="ESTIMATED">{estimatedStatusLabel}</option>
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

function clockMinutes(value: string): number | undefined {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) {
    return undefined
  }
  return Number(match[1]) * 60 + Number(match[2])
}

function timeBefore(value: string, minutes = 30): string | undefined {
  const total = clockMinutes(value)
  if (total === undefined) {
    return undefined
  }
  const adjusted = (total - minutes + 24 * 60) % (24 * 60)
  return `${Math.floor(adjusted / 60).toString().padStart(2, '0')}:${(
    adjusted % 60
  ).toString().padStart(2, '0')}`
}

function earliestTime(...values: string[]): string | undefined {
  return values
    .filter((value) => clockMinutes(value) !== undefined)
    .sort(
      (left, right) =>
        (clockMinutes(left) ?? 0) - (clockMinutes(right) ?? 0),
    )[0]
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
            pickerDefault={
              key === 'meetingTime'
                ? excursion.startTime
                : key === 'startTime'
                  ? excursion.meetingTime
                  : undefined
            }
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

function ScheduledEventFields({
  event,
  original,
  onChange,
  onReset,
  hasPersistedOverride,
}: {
  event: ScheduledEventEditDraft
  original: ScheduledEventEditDraft
  onChange: (value: ScheduledEventEditDraft) => void
  onReset: () => void
  hasPersistedOverride: boolean
}) {
  const update = (
    key: keyof ScheduledEventEditDraft,
    value: ScheduledEventEditDraft[keyof ScheduledEventEditDraft],
  ) => onChange({ ...event, [key]: value })
  const prefix = `trip-edit-${event.id}`

  return (
    <fieldset className="trip-edit-section">
      <legend>{event.title}</legend>
      <p className="trip-edit-context">
        {event.status === 'ESTIMATED'
          ? 'Estimated timing'
          : 'Timing to be confirmed'}
      </p>

      {([
        ['startTime', 'Start / pickup time'],
        ['endTime', 'End / arrival time'],
      ] as const).map(([key, label]) => (
        <Field
          current={event[key]}
          key={key}
          label={`${event.title} ${label}`}
          original={original[key]}
          onUseOriginal={() => update(key, original[key])}
        >
          <TextInput
            id={`${prefix}-${key}`}
            label={label}
            type="time"
            value={event[key]}
            onChange={(value) => update(key, value)}
          />
        </Field>
      ))}

      <Field
        current={event.meetingPoint}
        label={`${event.title} meeting point`}
        original={original.meetingPoint}
        onUseOriginal={() =>
          update('meetingPoint', original.meetingPoint)
        }
      >
        <TextInput
          id={`${prefix}-meeting-point`}
          label="Pickup / meeting point"
          maxLength={160}
          value={event.meetingPoint}
          onChange={(value) => update('meetingPoint', value)}
        />
      </Field>

      <Field
        current={event.note}
        label={`${event.title} note`}
        original={original.note}
        onUseOriginal={() => update('note', original.note)}
      >
        <TextArea
          id={`${prefix}-note`}
          label="Short operational note"
          value={event.note}
          onChange={(value) => update('note', value)}
        />
      </Field>

      {hasPersistedOverride ? (
        <button
          className="trip-edit-reset"
          type="button"
          onClick={onReset}
        >
          Reset this timing
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
  const eventIds = draft
    ? [
        ...draft.excursions.map(({ id }) => id),
        ...draft.scheduledEvents.map(({ id }) => id),
      ]
    : []
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
  const updateScheduledEvent = (value: ScheduledEventEditDraft) =>
    updateDraft(
      'scheduledEvents',
      draft.scheduledEvents.map((event) =>
        event.id === value.id ? value : event,
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

  const save = async (event: FormEvent<HTMLFormElement>) => {
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
    onSaved('Saved')
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
                Changed
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

              <Field
                current={draft.arrivalTime}
                label="Ship arrival"
                original={originalDraft.arrivalTime}
                onUseOriginal={() =>
                  updateDraft('arrivalTime', originalDraft.arrivalTime)
                }
              >
                <TextInput
                  id="trip-edit-arrivalTime"
                  issues={issuesFor('arrivalTime')}
                  label="Ship arrival"
                  type="time"
                  validationField="arrivalTime"
                  value={draft.arrivalTime}
                  onChange={(value) =>
                    updateDraft('arrivalTime', value)
                  }
                />
              </Field>

              {draft.portAccessStatus !== 'TENDER_REQUIRED' ? (
                <>
                  <Field
                    current={draft.departureTime}
                    label="Ship departure"
                    original={originalDraft.departureTime}
                    onUseOriginal={() =>
                      updateDraft(
                        'departureTime',
                        originalDraft.departureTime,
                      )
                    }
                  >
                    <TextInput
                      id="trip-edit-departureTime"
                      issues={issuesFor('departureTime')}
                      label="Ship departure"
                      type="time"
                      validationField="departureTime"
                      value={draft.departureTime}
                      onChange={(value) =>
                        updateDraft('departureTime', value)
                      }
                    />
                  </Field>
                  <OperationalTimeField
                    estimatedStatusLabel="Planning estimate · TBC"
                    id="trip-edit-all-aboard"
                    issues={issuesFor('allAboardTime')}
                    label="All Aboard"
                    pickerDefault={timeBefore(draft.departureTime)}
                    validationField="allAboardTime"
                    value={{
                      time: draft.allAboardTime,
                      verification: draft.allAboardVerification,
                    }}
                    original={{
                      time: originalDraft.allAboardTime,
                      verification:
                        originalDraft.allAboardVerification,
                    }}
                    onChange={({ time, verification }) => {
                      setSaveErrors([])
                      setDraft({
                        ...draft,
                        allAboardTime: time,
                        allAboardVerification: verification,
                      })
                    }}
                    onUseOriginal={() => {
                      setSaveErrors([])
                      setDraft({
                        ...draft,
                        allAboardTime: originalDraft.allAboardTime,
                        allAboardVerification:
                          originalDraft.allAboardVerification,
                      })
                    }}
                  />
                </>
              ) : null}

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
                <OperationalTimeField
                  id="trip-edit-first-tender"
                  issues={issuesFor('firstTenderTime')}
                  label="First tender"
                  pickerDefault={draft.arrivalTime || undefined}
                  validationField="firstTenderTime"
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
                <OperationalTimeField
                  id="trip-edit-tender-report"
                  issues={issuesFor('tenderReportTime')}
                  label="Tender report"
                  pickerDefault={
                    draft.firstTender.time ||
                    draft.arrivalTime ||
                    undefined
                  }
                  validationField="tenderReportTime"
                  value={draft.tenderReport}
                  original={originalDraft.tenderReport}
                  onChange={(value) =>
                    updateDraft('tenderReport', value)
                  }
                  onUseOriginal={() =>
                    updateDraft(
                      'tenderReport',
                      originalDraft.tenderReport,
                    )
                  }
                />
                <OperationalTimeField
                  id="trip-edit-our-tender-ashore"
                  issues={issuesFor('ourTenderAshoreTime')}
                  label="Our tender ashore"
                  pickerDefault={
                    draft.firstTender.time ||
                    draft.arrivalTime ||
                    undefined
                  }
                  validationField="ourTenderAshoreTime"
                  value={draft.ourTenderAshore}
                  original={originalDraft.ourTenderAshore}
                  onChange={(value) =>
                    updateDraft('ourTenderAshore', value)
                  }
                  onUseOriginal={() =>
                    updateDraft(
                      'ourTenderAshore',
                      originalDraft.ourTenderAshore,
                    )
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
                <OperationalTimeField
                  id="trip-edit-our-tender-back"
                  issues={issuesFor('ourTenderBackTime')}
                  label="Our tender back"
                  pickerDefault={timeBefore(
                    earliestTime(
                      draft.allAboardTime,
                      draft.lastTender.time,
                      draft.departureTime,
                    ) ?? '',
                  )}
                  validationField="ourTenderBackTime"
                  value={draft.ourTenderBack}
                  original={originalDraft.ourTenderBack}
                  onChange={(value) =>
                    updateDraft('ourTenderBack', value)
                  }
                  onUseOriginal={() =>
                    updateDraft(
                      'ourTenderBack',
                      originalDraft.ourTenderBack,
                    )
                  }
                />
                <OperationalTimeField
                  id="trip-edit-last-tender"
                  issues={issuesFor('lastTenderTime')}
                  label="Last tender"
                  pickerDefault={timeBefore(draft.departureTime)}
                  validationField="lastTenderTime"
                  value={draft.lastTender}
                  original={originalDraft.lastTender}
                  onChange={(value) =>
                    updateDraft('lastTender', value)
                  }
                  onUseOriginal={() =>
                    updateDraft('lastTender', originalDraft.lastTender)
                  }
                />
                <OperationalTimeField
                  estimatedStatusLabel="Planning estimate · TBC"
                  id="trip-edit-all-aboard"
                  issues={issuesFor('allAboardTime')}
                  label="All Aboard"
                  pickerDefault={timeBefore(draft.departureTime)}
                  validationField="allAboardTime"
                  value={{
                    time: draft.allAboardTime,
                    verification: draft.allAboardVerification,
                  }}
                  original={{
                    time: originalDraft.allAboardTime,
                    verification:
                      originalDraft.allAboardVerification,
                  }}
                  onChange={({ time, verification }) => {
                    setSaveErrors([])
                    setDraft({
                      ...draft,
                      allAboardTime: time,
                      allAboardVerification: verification,
                    })
                  }}
                  onUseOriginal={() => {
                    setSaveErrors([])
                    setDraft({
                      ...draft,
                      allAboardTime: originalDraft.allAboardTime,
                      allAboardVerification:
                        originalDraft.allAboardVerification,
                    })
                  }}
                />
                <Field
                  current={draft.departureTime}
                  label="Ship departure"
                  original={originalDraft.departureTime}
                  onUseOriginal={() =>
                    updateDraft(
                      'departureTime',
                      originalDraft.departureTime,
                    )
                  }
                >
                  <TextInput
                    id="trip-edit-departureTime"
                    issues={issuesFor('departureTime')}
                    label="Ship departure"
                    type="time"
                    validationField="departureTime"
                    value={draft.departureTime}
                    onChange={(value) =>
                      updateDraft('departureTime', value)
                    }
                  />
                </Field>
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

            {draft.scheduledEvents.map((event) => {
              const original = originalDraft.scheduledEvents.find(
                ({ id }) => id === event.id,
              )
              return original ? (
                <ScheduledEventFields
                  event={event}
                  hasPersistedOverride={Boolean(
                    overrides.eventOverrides[event.id],
                  )}
                  key={event.id}
                  original={original}
                  onChange={updateScheduledEvent}
                  onReset={() =>
                    confirmReset(
                      `Reset local changes for ${event.title}?`,
                      () => repository.resetEvent(event.id),
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
