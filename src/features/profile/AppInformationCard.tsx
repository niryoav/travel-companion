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
      <p className="card-eyebrow">App information</p>
      <h2>Travel Companion</h2>
      <dl>
        <div>
          <dt>Version</dt>
          <dd>{buildInfo.version}</dd>
        </div>
        <div>
          <dt>Build</dt>
          <dd>
            {buildInfo.builtAt ? (
              <time dateTime={buildInfo.builtAt}>{buildInfo.buildLabel}</time>
            ) : (
              buildInfo.buildLabel
            )}
          </dd>
        </div>
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
