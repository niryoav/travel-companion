import { describe, expect, it } from 'vitest'

import { authorizeEditorRequest } from './editorAuthorization'

function request(authorization?: string): Request {
  return new Request('https://example.test/api/trips/example', {
    headers: authorization ? { Authorization: authorization } : {},
  })
}

describe('authorizeEditorRequest', () => {
  it('reports a missing server credential as misconfiguration', () => {
    expect(authorizeEditorRequest(request(), undefined)).toBe(
      'MISCONFIGURED',
    )
  })

  it.each([
    undefined,
    'Basic secret',
    'Bearer',
    'Bearer wrong',
    'Bearer secret extra',
  ])('rejects a missing or invalid bearer credential', (value) => {
    expect(authorizeEditorRequest(request(value), 'secret')).toBe(
      'UNAUTHORIZED',
    )
  })

  it('accepts the exact configured bearer credential', () => {
    expect(
      authorizeEditorRequest(request('Bearer secret'), 'secret'),
    ).toBe('AUTHORIZED')
  })
})
