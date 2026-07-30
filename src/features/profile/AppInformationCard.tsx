import { SurfaceCard } from '../../components/SurfaceCard'
import type { AppBuildInfo } from '../../app/buildInfo'

interface AppInformationCardProps {
  buildInfo: AppBuildInfo
  tripDataVersion: string
}

export function AppInformationCard({
  buildInfo,
  tripDataVersion,
}: AppInformationCardProps) {
  return (
    <SurfaceCard className="app-information-card">
      <p className="card-eyebrow">Installed deployment</p>
      <h2>App version</h2>
      <p className="app-deployment-version">{buildInfo.version}</p>
      <p className="app-deployment-time">
        Deployed:{' '}
        {buildInfo.builtAt ? (
          <time dateTime={buildInfo.builtAt}>{buildInfo.buildLabel}</time>
        ) : (
          buildInfo.buildLabel
        )}
      </p>
      <dl>
        <div>
          <dt>Environment</dt>
          <dd>{buildInfo.environmentLabel}</dd>
        </div>
        <div>
          <dt>Trip data</dt>
          <dd>{tripDataVersion}</dd>
        </div>
      </dl>
      <p>
        Essential trip information and approved travel documents are bundled
        in this private app for offline use.
      </p>
    </SurfaceCard>
  )
}
