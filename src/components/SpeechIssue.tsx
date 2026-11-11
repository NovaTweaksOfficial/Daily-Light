import { AlertTriangle, X } from 'lucide-react'
import { usePlayer } from '@/state/player'

/**
 * Shows any narration problem. Mobile browsers can refuse to play speech
 * silently, so the app never swallows the reason — it says what went wrong
 * and what to try.
 */
export function SpeechIssueBanner() {
  const player = usePlayer()
  if (!player.issue) return null
  return (
    <div className="listen-issue" role="alert">
      <AlertTriangle size={16} aria-hidden />
      <div className="listen-issue-copy">
        <strong>Narration problem</strong>
        <span>{player.issue.message}</span>
      </div>
      <button
        className="listen-issue-close"
        onClick={() => player.clearIssue()}
        aria-label="Dismiss"
        title="Dismiss"
      >
        <X size={15} />
      </button>
    </div>
  )
}
