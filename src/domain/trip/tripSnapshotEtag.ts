const STRONG_ETAG_VALUE = /^[\x21\x23-\x7e]+$/

export function parseStrongEtag(value: string | null): string | null {
  if (!value) {
    return null
  }
  const trimmed = value.trim()
  if (trimmed.startsWith('W/')) {
    return null
  }
  const unquoted =
    trimmed.startsWith('"') && trimmed.endsWith('"')
      ? trimmed.slice(1, -1)
      : trimmed
  return unquoted !== '*' && STRONG_ETAG_VALUE.test(unquoted)
    ? unquoted
    : null
}

export function formatStrongEtag(value: string): string | null {
  const parsed = parseStrongEtag(value)
  return parsed ? `"${parsed}"` : null
}
