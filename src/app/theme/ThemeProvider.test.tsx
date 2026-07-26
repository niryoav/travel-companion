import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  AppearancePreference,
  PreferencesRepository,
  TravelerProfile,
} from '../../storage/PreferencesRepository'
import { ThemeProvider } from './ThemeProvider'
import { useAppearance } from './useAppearance'

class MemoryPreferencesRepository implements PreferencesRepository {
  appearance: AppearancePreference | null = null
  traveler: TravelerProfile | null = null

  getAppearance() {
    return this.appearance
  }

  getTravelerProfile() {
    return this.traveler
  }

  setAppearance(appearance: AppearancePreference) {
    this.appearance = appearance
  }

  setTravelerProfile(traveler: TravelerProfile) {
    this.traveler = traveler
  }
}

function setSystemAppearance(dark: boolean) {
  vi.mocked(window.matchMedia).mockImplementation(
    (query: string) =>
      ({
        matches: dark,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as MediaQueryList,
  )
}

function AppearanceProbe() {
  const { appearance, resolvedAppearance } = useAppearance()

  return <p>{`${appearance}:${resolvedAppearance}`}</p>
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-appearance')
  })

  it('resolves Follow system to Day Ocean for a light system', async () => {
    setSystemAppearance(false)

    render(
      <ThemeProvider repository={new MemoryPreferencesRepository()}>
        <AppearanceProbe />
      </ThemeProvider>,
    )

    expect(screen.getByText('system:day-ocean')).toBeInTheDocument()
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute(
        'data-appearance',
        'day-ocean',
      )
    })
  })

  it('resolves Follow system to Night Ocean for a dark system', async () => {
    setSystemAppearance(true)

    render(
      <ThemeProvider repository={new MemoryPreferencesRepository()}>
        <AppearanceProbe />
      </ThemeProvider>,
    )

    expect(screen.getByText('system:night-ocean')).toBeInTheDocument()
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute(
        'data-appearance',
        'night-ocean',
      )
    })
  })

  it('keeps a manual Day Ocean choice when the system is dark', () => {
    setSystemAppearance(true)
    const repository = new MemoryPreferencesRepository()
    repository.appearance = 'day-ocean'

    render(
      <ThemeProvider repository={repository}>
        <AppearanceProbe />
      </ThemeProvider>,
    )

    expect(screen.getByText('day-ocean:day-ocean')).toBeInTheDocument()
  })

  it('keeps a manual Night Ocean choice when the system is light', () => {
    setSystemAppearance(false)
    const repository = new MemoryPreferencesRepository()
    repository.appearance = 'night-ocean'

    render(
      <ThemeProvider repository={repository}>
        <AppearanceProbe />
      </ThemeProvider>,
    )

    expect(screen.getByText('night-ocean:night-ocean')).toBeInTheDocument()
  })
})
