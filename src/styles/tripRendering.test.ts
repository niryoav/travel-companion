import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const styles = readFileSync(
  resolve(process.cwd(), 'src/styles/index.css'),
  'utf8',
)

function declarationsFor(selector: string) {
  const selectorStart = styles.indexOf(selector)
  const blockStart = styles.indexOf('{', selectorStart)
  const blockEnd = styles.indexOf('}', blockStart)

  return styles.slice(blockStart + 1, blockEnd)
}

describe('Trip foreground rendering styles', () => {
  it('keeps the Trip screen and cards in an immediately visible paint state', () => {
    const tripScreen = declarationsFor('.trip-screen')
    const tripCard = declarationsFor('.trip-day-card')
    const fragilePaintProperties =
      /\b(?:animation|opacity|visibility|transform|content-visibility|contain|will-change)\s*:/

    expect(tripScreen).not.toMatch(fragilePaintProperties)
    expect(tripCard).not.toMatch(fragilePaintProperties)
    expect(tripScreen).not.toMatch(/\bheight\s*:\s*0\b/)
    expect(tripCard).not.toMatch(/\bheight\s*:\s*0\b/)
  })

  it('keeps fixed background layers behind the isolated app foreground', () => {
    expect(declarationsFor('.app-shell')).toMatch(/\bisolation:\s*isolate\b/)
    expect(declarationsFor('.app-shell::before')).toMatch(
      /\bz-index:\s*-2\b/,
    )
    expect(declarationsFor('.app-shell::after')).toMatch(
      /\bz-index:\s*-1\b/,
    )
  })
})
