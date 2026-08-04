import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

function workflowSource(): string {
  return readFileSync(`${process.cwd()}/.github/workflows/send-travel-reminders.yml`, 'utf8')
}

describe('send-travel-reminders workflow', () => {
  it('runs every 15 minutes, offset from the hour, and can be triggered manually', () => {
    const source = workflowSource()
    expect(source).toContain('cron: "7,22,37,52 * * * *"')
    expect(source).toContain('workflow_dispatch:')
  })

  it('calls the Vercel endpoint using repository secrets, never a hardcoded value', () => {
    const source = workflowSource()
    expect(source).toContain('secrets.REMINDER_CRON_URL')
    expect(source).toContain('secrets.REMINDER_CRON_SECRET')
    expect(source).toContain('Authorization: Bearer')
    expect(source).not.toMatch(/REMINDER_CRON_SECRET\s*:\s*['"]/)
    expect(source).not.toMatch(/https:\/\/[^$][^\s"']*\.vercel\.app/)
  })

  it('fails loudly on a non-2xx response instead of swallowing errors', () => {
    const source = workflowSource()
    expect(source).toContain('--fail')
  })

  it('never echoes the secret to the workflow log', () => {
    const source = workflowSource()
    expect(source).not.toContain('echo')
    expect(source).not.toContain('::debug')
  })

  it('runs as a short, single-purpose job', () => {
    const source = workflowSource()
    expect(source).toContain('timeout-minutes:')
  })
})

describe('vercel.json', () => {
  it('no longer configures a Vercel Cron trigger', () => {
    const source = readFileSync(`${process.cwd()}/vercel.json`, 'utf8')
    expect(source).not.toContain('"crons"')
  })
})
