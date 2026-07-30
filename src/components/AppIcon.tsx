export type IconName =
  | 'airplane'
  | 'calendar'
  | 'cloud'
  | 'compass'
  | 'dining'
  | 'dock'
  | 'document'
  | 'home'
  | 'hotel'
  | 'information'
  | 'map'
  | 'more'
  | 'moon'
  | 'rain'
  | 'ship'
  | 'sun'
  | 'taxi'
  | 'tender'
  | 'walking'
  | 'warning'
  | 'wind'

interface AppIconProps {
  name: IconName
}

const paths: Record<IconName, React.ReactNode> = {
  airplane: (
    <>
      <path d="m3 14 7.5-2.5L16 4l2 1-3 7 5 2v2l-6-.5-3 4.5-1.5-.5 1-4.5L3 16Z" />
    </>
  ),
  calendar: (
    <>
      <path d="M7 3v3M17 3v3M4 9h16" />
      <rect x="4" y="5" width="16" height="16" rx="3" />
      <path d="m8 14 2 2 5-5" />
    </>
  ),
  map: (
    <>
      <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" />
      <path d="M9 3v15M15 6v15" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9Z" />
    </>
  ),
  cloud: (
    <>
      <path d="M6 18h11a4 4 0 0 0 .7-7.94A6 6 0 0 0 6.3 9.2 4.4 4.4 0 0 0 6 18Z" />
    </>
  ),
  dining: (
    <>
      <path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10" />
      <path d="M16 3v18M16 3c3 1.4 4 4.6 4 8h-4" />
    </>
  ),
  dock: (
    <>
      <path d="M4 16h16M7 12h10l2 4H5Z" />
      <path d="M9 12V7h6v5M3 20h18" />
    </>
  ),
  document: (
    <>
      <path d="M6 3h8l4 4v14H6Z" />
      <path d="M14 3v5h4M9 13h6M9 17h6" />
    </>
  ),
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v11h14V10M9 21v-7h6v7" />
    </>
  ),
  hotel: (
    <>
      <path d="M4 21V5h16v16M8 9h2M14 9h2M8 13h2M14 13h2M10 21v-4h4v4" />
    </>
  ),
  information: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7h.01" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  moon: <path d="M20 15.5A9 9 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />,
  rain: (
    <>
      <path d="M6 14h11a4 4 0 0 0 .7-7.94A6 6 0 0 0 6.3 5.2 4.4 4.4 0 0 0 6 14Z" />
      <path d="m8 17-1 3M13 17l-1 3M18 17l-1 3" />
    </>
  ),
  ship: (
    <>
      <path d="M4 13h16l-3 5H7Z" />
      <path d="M8 13V7h8v6M10 7V4h4v3" />
      <path d="M3 21c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
    </>
  ),
  taxi: (
    <>
      <path d="m5 11 2-5h10l2 5M4 11h16v7H4Z" />
      <path d="M8 6V4h8v2M7 18v2M17 18v2M7 14h.01M17 14h.01" />
    </>
  ),
  tender: (
    <>
      <path d="M4 13h16l-3 5H7Z" />
      <path d="M8 13V9h7l2 4M3 21c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0" />
    </>
  ),
  walking: (
    <>
      <circle cx="13" cy="4" r="2" />
      <path d="m10 21 2-7-3-3 3-4 4 3 3 1M12 14l4 3 1 4M9 11l-4 4" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3 2.5 20h19Z" />
      <path d="M12 9v5M12 17h.01" />
    </>
  ),
  wind: (
    <>
      <path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7" />
    </>
  ),
}

export function AppIcon({ name }: AppIconProps) {
  return (
    <svg
      className="app-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}
