import { useState } from 'react'

import { SurfaceCard } from '../../components/SurfaceCard'
import { buildPocCalendar, type CalendarPocVersion } from './calendarPocEvents'
import { canShareIcsFile, downloadIcsFile, shareIcsFile } from './downloadIcs'

const FILENAMES: Record<CalendarPocVersion, string> = {
  v1: 'travel-companion-poc-v1.ics',
  v2: 'travel-companion-poc-v2.ics',
}

/**
 * Temporary development section for the calendar-reminder proof of
 * concept. Not part of the production reminder feature — it exists to
 * validate real-device `.ics` import/update behavior before that
 * feature is designed. Safe to remove once the manual test matrix in
 * the PR description has been completed.
 */
export function CalendarPocSection() {
  const [lastAction, setLastAction] = useState<string | null>(null)

  function handleDownload(version: CalendarPocVersion) {
    const content = buildPocCalendar(version, new Date())
    const filename = FILENAMES[version]
    downloadIcsFile(content, filename)
    setLastAction(
      `Generated ${filename}. Check your device's downloads or the ` +
        "share/open sheet, then open it to import into your calendar app.",
    )
  }

  async function handleShare(version: CalendarPocVersion) {
    const content = buildPocCalendar(version, new Date())
    const filename = FILENAMES[version]
    try {
      await shareIcsFile(content, filename)
      setLastAction(`Shared ${filename} via the device share sheet.`)
    } catch {
      setLastAction('Sharing was cancelled or is not available right now.')
    }
  }

  const sampleContent = buildPocCalendar('v1', new Date())
  const canShare = canShareIcsFile(sampleContent, FILENAMES.v1)

  return (
    <SurfaceCard className="calendar-poc-card">
      <p className="card-eyebrow">Development test — calendar import</p>
      <h2>Calendar reminder proof of concept</h2>
      <p>
        Generates a small, fixed two-event <code>.ics</code> file entirely
        on this device, with no network request. This validates whether
        agenda import and reminders are practical before the full
        reminder feature is built — it is not itself that feature.
      </p>
      <p>
        <strong>Downloading the file does not mean the import worked.</strong>{' '}
        You still need to open it and confirm the events, times, location,
        and alarms in your calendar app.
      </p>

      <div className="calendar-poc-actions">
        <button type="button" onClick={() => handleDownload('v1')}>
          Download test calendar v1
        </button>
        <button type="button" onClick={() => handleDownload('v2')}>
          Download test calendar v2 (updated)
        </button>
      </div>

      {canShare ? (
        <div className="calendar-poc-actions">
          <button type="button" onClick={() => void handleShare('v1')}>
            Share test calendar v1
          </button>
          <button type="button" onClick={() => void handleShare('v2')}>
            Share test calendar v2 (updated)
          </button>
        </div>
      ) : null}

      {lastAction ? (
        <p role="status" className="calendar-poc-status">
          {lastAction}
        </p>
      ) : null}

      <div className="calendar-poc-instructions">
        <h3>Test A — first import</h3>
        <ol>
          <li>Open the installed PWA.</li>
          <li>Tap “Download test calendar v1”.</li>
          <li>Open the downloaded calendar file.</li>
          <li>Import both events.</li>
          <li>
            Check: both events appear; the time and location are correct;
            the alarms are present; at least one test alarm actually fires.
          </li>
        </ol>
        <h3>Test B — second import</h3>
        <ol>
          <li>Tap “Download test calendar v2”.</li>
          <li>Import it again.</li>
          <li>
            Note per platform: existing event updated, duplicate created,
            import ignored, alarms changed or not, or another difference.
          </li>
        </ol>
      </div>
    </SurfaceCard>
  )
}
