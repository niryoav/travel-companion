import type { DailyLoveMessageViewModel } from '../../../domain/content/dailyLoveMessage'

interface DailyLoveMessageProps {
  message: DailyLoveMessageViewModel
}

export function DailyLoveMessage({ message }: DailyLoveMessageProps) {
  return (
    <section
      className="home-love-message"
      aria-labelledby="daily-love-message-title"
    >
      <p className="home-card-label">A note for you</p>
      <h2 id="daily-love-message-title">{message.opening}</h2>
      <p className="home-love-message-body">{message.body}</p>
      <footer className="home-love-message-signature">
        <p>{message.closing}</p>
        <p>{message.signature}</p>
      </footer>
    </section>
  )
}
