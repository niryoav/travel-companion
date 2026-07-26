import { describe, expect, it } from 'vitest'

import { demoHomeStateFromSearch } from './demoPhase'

describe('demoHomeStateFromSearch', () => {
  it('selects a supported phase from the query string', () => {
    expect(demoHomeStateFromSearch('?phase=port-day')).toBe('port-day')
  })

  it('falls back to pre-trip for missing or unsupported values', () => {
    expect(demoHomeStateFromSearch('')).toBe('pre-trip')
    expect(demoHomeStateFromSearch('?phase=unknown')).toBe('pre-trip')
  })
})
