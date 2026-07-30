export interface AppBuildInfo {
  version: string
  builtAt: string
  buildLabel: string
  environmentLabel: 'Development' | 'Production'
}

interface BuildInfoInput {
  version?: string
  builtAt?: string
  development: boolean
}

export function createAppBuildInfo({
  version,
  builtAt,
  development,
}: BuildInfoInput): AppBuildInfo {
  const validBuildDate =
    builtAt && !Number.isNaN(Date.parse(builtAt)) ? builtAt : ''
  const normalizedVersion = version?.trim() || 'local'
  const shortVersion = /^[a-f0-9]{8,}$/i.test(normalizedVersion)
    ? normalizedVersion.slice(0, 7)
    : normalizedVersion

  return {
    version: shortVersion,
    builtAt: validBuildDate,
    buildLabel: validBuildDate
      ? new Intl.DateTimeFormat(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(validBuildDate))
      : 'Local build',
    environmentLabel: development ? 'Development' : 'Production',
  }
}

export const appBuildInfo = createAppBuildInfo({
  version: __APP_VERSION__,
  builtAt: __APP_BUILD_DATE__,
  development: import.meta.env.DEV,
})
