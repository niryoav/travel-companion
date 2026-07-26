import { useContext } from 'react'

import { ThemeContext } from './themeContext'

export function useAppearance() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useAppearance must be used within a ThemeProvider')
  }

  return context
}
