import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DocumentOfflineService } from '../documentOfflineService'
import { DocumentOfflineStatusIcon } from './DocumentOfflineStatusIcon'

function okResponse(): Response {
  return new Response('pdf-bytes', { status: 200 })
}

describe('DocumentOfflineStatusIcon', () => {
  it('shows a hollow cloud and label when not yet cached', () => {
    const service = new DocumentOfflineService({ fetchImpl: vi.fn() })
    render(
      <DocumentOfflineStatusIcon href="/documents/a.pdf" service={service} />,
    )

    expect(screen.getByTitle('Not yet available offline')).toBeInTheDocument()
    expect(
      screen.getByText('Not yet available offline'),
    ).toHaveClass('sr-only')
    expect(document.querySelector('.document-offline-icon-not-cached'))
      .not.toBeNull()
  })

  it('shows a filled cloud and label once cached', async () => {
    const service = new DocumentOfflineService({
      fetchImpl: vi.fn(async () => okResponse()),
    })
    await service.ensureCached('/documents/b.pdf')
    render(
      <DocumentOfflineStatusIcon href="/documents/b.pdf" service={service} />,
    )

    expect(screen.getByTitle('Available offline')).toBeInTheDocument()
    expect(document.querySelector('.document-offline-icon-cached'))
      .not.toBeNull()
  })

  it('shows a spinner while a download is in progress', async () => {
    let resolveFetch: (() => void) | undefined
    const service = new DocumentOfflineService({
      fetchImpl: vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = () => resolve(okResponse())
          }),
      ),
    })
    const downloadPromise = service.ensureCached('/documents/c.pdf')

    render(
      <DocumentOfflineStatusIcon href="/documents/c.pdf" service={service} />,
    )

    expect(
      await screen.findByTitle('Downloading for offline use'),
    ).toBeInTheDocument()
    expect(document.querySelector('.document-offline-spinner')).not.toBeNull()

    resolveFetch?.()
    await downloadPromise
  })

  it('offers a retry action once a download has failed', async () => {
    const fetchImpl = vi.fn(async (): Promise<Response> => {
      throw new Error('offline')
    })
    const service = new DocumentOfflineService({
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    await service.ensureCached('/documents/d.pdf')

    render(
      <DocumentOfflineStatusIcon href="/documents/d.pdf" service={service} />,
    )

    expect(screen.getByTitle('Not yet available offline')).toBeInTheDocument()
    const retryButton = screen.getByRole('button', { name: 'Retry' })

    fetchImpl.mockImplementationOnce(async () => okResponse())
    retryButton.click()
    await vi.waitFor(() =>
      expect(screen.getByTitle('Available offline')).toBeInTheDocument(),
    )
  })
})
