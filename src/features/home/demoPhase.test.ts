import { describe, expect, it } from 'vitest'

import { demoHomeStateFromSearch } from './demoPhase'

describe('demoHomeStateFromSearch', () => {
  it('selects a supported phase from the query string', () => {
    expect(demoHomeStateFromSearch('?phase=port-day')).toBe('port-day')
  })

  it('does not override production data for missing or unsupported values', () => {
    expect(demoHomeStateFromSearch('')).toBeNull()
    expect(demoHomeStateFromSearch('?phase=unknown')).toBeNull()
  })
})
