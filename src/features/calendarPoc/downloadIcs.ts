/**
 * Triggers a client-side download of ICS content with no network
 * dependency: a `Blob` + a temporary `object:` URL clicked via a
 * detached anchor. Works the same offline as online, and on both
 * desktop and mobile browsers/installed PWAs (the file either opens
 * directly in the platform calendar app or lands in Downloads,
 * depending on OS/browser — that variability is exactly what this PoC's
 * manual test matrix is measuring).
 */
export function downloadIcsFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  // Revoking immediately can cancel the download in some browsers, so
  // release the object URL shortly after instead of synchronously.
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000)
}

/**
 * Progressive enhancement only: some mobile browsers (notably iOS
 * Safari/PWA) hand a downloaded `.ics` to the Files app instead of
 * Calendar, whereas the share sheet's "Add to Calendar"-style targets
 * can open it directly. We only offer this path when the platform
 * proves it can share a `.calendar` file — never as the primary flow.
 */
export function canShareIcsFile(content: string, filename: string): boolean {
  if (typeof navigator === 'undefined' || !navigator.canShare) {
    return false
  }
  try {
    const file = new File([content], filename, {
      type: 'text/calendar;charset=utf-8',
    })
    return navigator.canShare({ files: [file] })
  } catch {
    return false
  }
}

export async function shareIcsFile(
  content: string,
  filename: string,
): Promise<void> {
  const file = new File([content], filename, {
    type: 'text/calendar;charset=utf-8',
  })
  await navigator.share({
    files: [file],
    title: 'Travel Companion calendar test',
  })
}
