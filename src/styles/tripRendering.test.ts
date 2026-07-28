import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const styles = readFileSync(
  resolve(process.cwd(), 'src/styles/index.css'),
  'utf8',
)
const welcomeSource = readFileSync(
  resolve(
    process.cwd(),
    'src/features/welcome/WelcomeCoverScreen.tsx',
  ),
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

  it('keeps the operational Today foreground immediately visible', () => {
    const todayScreen = declarationsFor('.today-screen')
    const fragilePaintProperties =
      /\b(?:animation|opacity|visibility|transform|content-visibility|contain|will-change)\s*:/

    expect(todayScreen).not.toMatch(fragilePaintProperties)
  })

  it('keeps Welcome, Home, and standard pages immediately visible', () => {
    const fragilePaintProperties =
      /\b(?:animation|opacity|visibility|transform|content-visibility|contain|will-change)\s*:/

    expect(declarationsFor('.welcome-card')).not.toMatch(
      fragilePaintProperties,
    )
    expect(declarationsFor('.welcome-card-content')).not.toMatch(
      /\b(?:animation|opacity|visibility|transform|content-visibility|contain|will-change)\s*:/,
    )
    expect(declarationsFor('.welcome-card-content')).toContain(
      'display: block',
    )
    expect(styles).not.toContain('.welcome-card::before')
    expect(declarationsFor('.welcome-card')).not.toMatch(
      /backdrop-filter|z-index|isolation/,
    )
    expect(welcomeSource).not.toMatch(
      /setTimeout|useEffect|Suspense|lazy\(|opacity|visibility/,
    )
    expect(declarationsFor('.home-screen')).not.toMatch(
      fragilePaintProperties,
    )
    expect(declarationsFor('.page-container')).not.toMatch(
      fragilePaintProperties,
    )
  })

  it('defines horizontal-overflow and safe-area protection', () => {
    expect(declarationsFor('body')).toMatch(/\boverflow-x:\s*(?:hidden|clip)\b/)
    expect(declarationsFor('.app-shell')).toContain(
      'env(safe-area-inset-bottom)',
    )
    expect(declarationsFor('.bottom-navigation')).toContain(
      'env(safe-area-inset-bottom)',
    )
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
