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

  return {
    version: version?.trim() || 'Development',
    builtAt: validBuildDate,
    buildLabel: validBuildDate
      ? new Intl.DateTimeFormat('en-GB', {
          dateStyle: 'medium',
          timeZone: 'UTC',
        }).format(new Date(validBuildDate))
      : 'Development session',
    environmentLabel: development ? 'Development' : 'Production',
  }
}

export const appBuildInfo = createAppBuildInfo({
  version: __APP_VERSION__,
  builtAt: __APP_BUILD_DATE__,
  development: import.meta.env.DEV,
})

