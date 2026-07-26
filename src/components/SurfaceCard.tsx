import type { ReactNode } from 'react'

interface SurfaceCardProps {
  children: ReactNode
  className?: string
}

export function SurfaceCard({ children, className }: SurfaceCardProps) {
  return (
    <section className={`surface-card${className ? ` ${className}` : ''}`}>
      {children}
    </section>
  )
}
