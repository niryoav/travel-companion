import type { DailyLoveMessageViewModel } from '../domain/content/dailyLoveMessage'

interface DailyLoveMessageProps {
  message: DailyLoveMessageViewModel
  variant: 'home' | 'welcome'
}

export function DailyLoveMessage({
  message,
  variant,
}: DailyLoveMessageProps) {
  return (
    <section
      className={`daily-love-message daily-love-message-${variant}`}
      aria-labelledby="daily-love-message-title"
    >
      <p className="daily-love-message-label">A note for you</p>
      <h2 id="daily-love-message-title">{message.opening}</h2>
      <p className="daily-love-message-body">{message.body}</p>
      <footer className="daily-love-message-signature">
        <p>{message.closing}</p>
        <p>{message.signature}</p>
      </footer>
    </section>
  )
}
