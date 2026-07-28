import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { tripFixture } from '../test/fixtures/tripFixture'
import { LocalTripStateRepository } from '../storage/LocalTripStateRepository'
import { StartupRouteGate } from './StartupRouteGate'

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>(
    'react-router',
  )

  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => (
      <span data-testid="startup-navigation" data-to={to} />
    ),
  }
})

describe('startup shell', () => {
  it('paints a nonblank fallback instead of the restored route while redirecting', () => {
    const tripStateRepository = new LocalTripStateRepository(
      window.localStorage,
      tripFixture.trip.id,
      new Set(tripFixture.travelers.map(({ id }) => id)),
    )
    const { container } = render(
      <MemoryRouter initialEntries={['/trip']}>
        <StartupRouteGate
          tripData={tripFixture}
          tripStateRepository={tripStateRepository}
          now={new Date('2030-05-01T12:00:00Z')}
        >
          <p>Restored route content</p>
        </StartupRouteGate>
      </MemoryRouter>,
    )

    expect(container.querySelector('.startup-route-fallback')).not.toBeNull()
    expect(screen.queryByText('Restored route content')).not.toBeInTheDocument()
    expect(screen.getByTestId('startup-navigation')).toHaveAttribute(
      'data-to',
      '/welcome',
    )
  })

  it('defines the ocean background before external CSS or React loads', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
    const styles = readFileSync(
      resolve(process.cwd(), 'src/styles/index.css'),
      'utf8',
    )
    const pwaConfig = readFileSync(
      resolve(process.cwd(), 'vite.config.ts'),
      'utf8',
    )
    const criticalStyles =
      html.match(/<style data-startup-shell>([\s\S]*?)<\/style>/)?.[1] ?? ''

    expect(criticalStyles).toContain('html,')
    expect(criticalStyles).toContain('body,')
    expect(criticalStyles).toContain('#root')
    expect(criticalStyles).toContain('background-color: #063b61')
    expect(criticalStyles).not.toMatch(/(?:white|#fff(?:fff)?)/i)
    expect(styles).toMatch(
      /\.startup-route-fallback\s*\{[\s\S]*?background-color:\s*var\(--surface\)/,
    )
    expect(html).toContain(
      '<meta name="theme-color" content="#063b61" />',
    )
    expect(pwaConfig).toContain("theme_color: '#063b61'")
    expect(pwaConfig).toContain("background_color: '#063b61'")
    expect(pwaConfig).toContain("registerType: 'prompt'")
    expect(pwaConfig).toContain('cleanupOutdatedCaches: true')
    expect(html).toContain(
      '<meta name="robots" content="noindex, nofollow, noarchive" />',
    )
  })
})
