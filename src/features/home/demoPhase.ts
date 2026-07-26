import {
  DEFAULT_DEMO_HOME_STATE,
  homeDemoData,
  type DemoHomeState,
} from './homeDemoData'

export function demoHomeStateFromSearch(search: string): DemoHomeState {
  const value = new URLSearchParams(search).get('phase')

  return value && Object.hasOwn(homeDemoData, value)
    ? (value as DemoHomeState)
    : DEFAULT_DEMO_HOME_STATE
}
