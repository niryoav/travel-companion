import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CalendarPocSection } from './CalendarPocSection'

describe('CalendarPocSection', () => {
  it('shows both version buttons, the download-is-not-import warning, and manual test instructions', () => {
    render(<CalendarPocSection />)

    expect(
      screen.getByRole('button', { name: 'Download test calendar v1' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Download test calendar v2 (updated)',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Downloading the file does not mean the import worked/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Test A — first import' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Test B — second import' }),
    ).toBeInTheDocument()
  })

  it('generates a downloadable object URL without any network request when v1 is requested', () => {
    // jsdom does not implement these by default.
    URL.createObjectURL ??= () => 'blob:unmocked'
    URL.revokeObjectURL ??= () => {}
    const createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock-url')
    const revokeObjectURLSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {})
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    // jsdom does not implement the `download` attribute and would
    // otherwise try (and fail) to navigate to the blob: URL.
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    render(<CalendarPocSection />)
    fireEvent.click(
      screen.getByRole('button', { name: 'Download test calendar v1' }),
    )

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
    const [blob] = createObjectURLSpy.mock.calls[0]!
    expect((blob as Blob).type).toBe('text/calendar;charset=utf-8')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(
      screen.getByText(/Generated travel-companion-poc-v1\.ics/),
    ).toBeInTheDocument()

    createObjectURLSpy.mockRestore()
    revokeObjectURLSpy.mockRestore()
    fetchSpy.mockRestore()
    clickSpy.mockRestore()
  })
})
