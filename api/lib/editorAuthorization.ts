import { timingSafeEqual } from 'node:crypto'

export type EditorAuthorizationResult =
  | 'AUTHORIZED'
  | 'UNAUTHORIZED'
  | 'MISCONFIGURED'

export function authorizeEditorRequest(
  request: Request,
  configuredToken = process.env.TRAVEL_COMPANION_EDITOR_TOKEN,
): EditorAuthorizationResult {
  if (!configuredToken) {
    return 'MISCONFIGURED'
  }

  const authorization = request.headers.get('authorization')
  const match = authorization?.match(/^Bearer ([^\s,]+)$/)
  if (!match) {
    return 'UNAUTHORIZED'
  }

  const supplied = Buffer.from(match[1], 'utf8')
  const expected = Buffer.from(configuredToken, 'utf8')
  if (supplied.length !== expected.length) {
    return 'UNAUTHORIZED'
  }
  return timingSafeEqual(supplied, expected)
    ? 'AUTHORIZED'
    : 'UNAUTHORIZED'
}
