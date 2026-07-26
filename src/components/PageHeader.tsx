import type { ReactNode } from 'react'

interface PageHeaderProps {
  description: string
  eyebrow?: string
  title: string
  trailing?: ReactNode
}

export function PageHeader({
  description,
  eyebrow,
  title,
  trailing,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-copy">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="page-title">{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {trailing ? <div className="page-header-trailing">{trailing}</div> : null}
    </header>
  )
}
