import { describe, expect, it, vi } from 'vitest'

import { LocalPreferencesRepository } from './LocalPreferencesRepository'

describe('LocalPreferencesRepository', () => {
  it('stores and retrieves a supported theme', () => {
    const repository = new LocalPreferencesRepository(window.localStorage)

    repository.setTheme('dark')

    expect(repository.getTheme()).toBe('dark')
  })

  it('ignores unsupported stored values', () => {
    window.localStorage.setItem('travel-companion:theme', 'sepia')
    const repository = new LocalPreferencesRepository(window.localStorage)

    expect(repository.getTheme()).toBeNull()
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

    expect(repository.getTheme()).toBeNull()
    expect(repository.getTravelerProfile()).toBeNull()
    expect(() => repository.setTheme('light')).not.toThrow()
    expect(() => repository.setTravelerProfile('Yoav')).not.toThrow()
  })
})
