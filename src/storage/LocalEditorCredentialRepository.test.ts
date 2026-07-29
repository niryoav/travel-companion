import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocalEditorCredentialRepository } from './LocalEditorCredentialRepository'

describe('LocalEditorCredentialRepository', () => {
  beforeEach(() => window.localStorage.clear())

  it('stores, reloads, and clears the editor token separately', () => {
    const repository = new LocalEditorCredentialRepository(
      window.localStorage,
    )
    repository.storeToken('editor-secret')

    expect(
      new LocalEditorCredentialRepository(
        window.localStorage,
      ).loadToken(),
    ).toBe('editor-secret')

    repository.clearToken()
    expect(repository.loadToken()).toBeNull()
    expect(window.localStorage.length).toBe(0)
  })

  it('ignores an empty token', () => {
    const repository = new LocalEditorCredentialRepository(
      window.localStorage,
    )
    repository.storeToken('  ')
    expect(repository.loadToken()).toBeNull()
  })

  it('keeps a session credential when persistent storage fails', () => {
    const unavailable = {
      getItem: vi.fn(() => {
        throw new Error('unavailable')
      }),
      setItem: vi.fn(() => {
        throw new Error('unavailable')
      }),
      removeItem: vi.fn(() => {
        throw new Error('unavailable')
      }),
    } as unknown as Storage
    const repository = new LocalEditorCredentialRepository(unavailable)

    repository.storeToken('session-secret')
    expect(repository.loadToken()).toBe('session-secret')
    repository.clearToken()
    expect(repository.loadToken()).toBeNull()
  })
})
