import { describe, expect, it, vi } from 'vitest'

import { LocalPreferencesRepository } from './LocalPreferencesRepository'

describe('LocalPreferencesRepository', () => {
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

    expect(repository.getTravelerProfile()).toBeNull()
    expect(() => repository.setTravelerProfile('Yoav')).not.toThrow()
  })
})
