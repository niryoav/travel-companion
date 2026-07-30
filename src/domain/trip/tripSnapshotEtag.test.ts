import { describe, expect, it } from 'vitest'

import {
  formatStrongEtag,
  parseStrongEtag,
} from './tripSnapshotEtag'

describe('trip snapshot ETag formatting', () => {
  it('normalizes quoted and unquoted strong values', () => {
    expect(parseStrongEtag('"etag-7"')).toBe('etag-7')
    expect(parseStrongEtag('etag-7')).toBe('etag-7')
  })

  it('formats either representation as one quoted HTTP value', () => {
    expect(formatStrongEtag('etag-7')).toBe('"etag-7"')
    expect(formatStrongEtag('"etag-7"')).toBe('"etag-7"')
  })

  it('rejects weak or malformed values', () => {
    expect(parseStrongEtag('W/"etag-7"')).toBeNull()
    expect(parseStrongEtag('"unterminated')).toBeNull()
    expect(parseStrongEtag('*')).toBeNull()
  })
})
