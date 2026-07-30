export interface DeploymentBuildEnvironment {
  SOURCE_DATE_EPOCH?: string
  VERCEL_GIT_COMMIT_SHA?: string
  VITE_APP_VERSION?: string
  VITE_BUILD_TIME?: string
}

interface DeploymentBuildValues {
  version: string
  builtAt: string
}

function validDate(value: string | undefined): string | null {
  if (!value || Number.isNaN(Date.parse(value))) {
    return null
  }

  return new Date(value).toISOString()
}

export function resolveDeploymentBuildValues(
  environment: DeploymentBuildEnvironment,
  now = new Date(),
): DeploymentBuildValues {
  const configuredBuildTime = validDate(environment.VITE_BUILD_TIME?.trim())
  const sourceDateEpoch = environment.SOURCE_DATE_EPOCH?.trim()
  const sourceBuildTime =
    sourceDateEpoch && Number.isFinite(Number(sourceDateEpoch))
      ? new Date(Number(sourceDateEpoch) * 1000).toISOString()
      : null

  return {
    version:
      environment.VERCEL_GIT_COMMIT_SHA?.trim() ||
      environment.VITE_APP_VERSION?.trim() ||
      'local',
    builtAt: configuredBuildTime || sourceBuildTime || now.toISOString(),
  }
}
