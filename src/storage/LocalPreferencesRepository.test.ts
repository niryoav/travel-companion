import { describe, expect, it, vi } from 'vitest'

import { LocalPreferencesRepository } from './LocalPreferencesRepository'

describe('LocalPreferencesRepository', () => {
  it.each(['system', 'day-ocean', 'night-ocean'] as const)(
    'stores and retrieves the %s appearance preference',
    (appearance) => {
      const repository = new LocalPreferencesRepository(window.localStorage)

      repository.setAppearance(appearance)

      expect(repository.getAppearance()).toBe(appearance)
    },
  )

  it('ignores unsupported stored appearance values', () => {
    window.localStorage.setItem('travel-companion:appearance', 'sepia')
    const repository = new LocalPreferencesRepository(window.localStorage)

    expect(repository.getAppearance()).toBeNull()
  })

  it('maps a legacy saved theme to the matching ocean appearance', () => {
    window.localStorage.setItem('travel-companion:theme', 'dark')
    const repository = new LocalPreferencesRepository(window.localStorage)

    expect(repository.getAppearance()).toBe('night-ocean')
  })

  it('stores and retrieves a supported traveler profile', () => {
    const repository = new LocalPreferencesRepository(window.localStorage)

    repository.setTravelerProfile('Isabel')

    expect(repository.getTravelerProfile()).toBe('Isabel')
  })

  it('ignores an unsupported stored traveler profile', () => {
    window.localStorage.setItem(
      'travel-companion:traveler-profile',
      'Someone else',
    )
    const repository = new LocalPreferencesRepository(window.localStorage)

    expect(repository.getTravelerProfile()).toBeNull()
  })

  it('degrades safely when browser storage is unavailable', () => {
    const unavailableStorage = {
      getItem: vi.fn(() => {
        throw new Error('Storage unavailable')
      }),
      setItem: vi.fn(() => {
        throw new Error('Storage unavailable')
      }),
    } as unknown as Storage
    const repository = new LocalPreferencesRepository(unavailableStorage)

    expect(repository.getAppearance()).toBeNull()
    expect(repository.getTravelerProfile()).toBeNull()
    expect(() => repository.setAppearance('system')).not.toThrow()
    expect(() => repository.setTravelerProfile('Yoav')).not.toThrow()
  })
})
