import { useNavigate } from 'react-router-dom'
import { Pause, Play, SkipBack, SkipForward, X } from 'lucide-react'
import { usePlayer } from '@/state/player'
import { refString, loadIndex } from '@/lib/bible'
import { useEffect, useState } from 'react'
import type { BibleIndex } from '@/types'

/** Floating "now playing" bar shown whenever narration is active. */
export function MiniPlayer() {
  const player = usePlayer()
  const navigate = useNavigate()
  const [index, setIndex] = useState<BibleIndex | null>(null)

  useEffect(() => {
    loadIndex().then(setIndex)
  }, [])

  /* Reserve space at the bottom of the page while the bar is visible so it
   * never covers content. */
  useEffect(() => {
    const active = player.status !== 'idle' && !!player.position
    document.documentElement.classList.toggle('has-player', active)
    return () => document.documentElement.classList.remove('has-player')
  }, [player.status, player.position])

  if (!player.supported) return null
  if (player.status === 'idle' || !player.position) return null

  const pos = player.position
  const label = refString(pos.book, pos.chapter, pos.verse, index ?? undefined)

  return (
    <div className="miniplayer" role="region" aria-label="Bible narration">
      <div className="mp-pill" onClick={() => navigate('/listen')} role="button" tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && navigate('/listen')}>
        <span className="mp-eq" aria-hidden>
          <i /><i /><i />
        </span>
        <span className="mp-label">
          <strong>{label}</strong>
          <span>{player.status === 'paused' ? 'Paused' : player.status === 'ended' ? 'Finished' : 'Now reading'}</span>
        </span>
      </div>
      <div className="mp-controls">
        <button className="mp-btn" aria-label="Previous verse" onClick={() => player.prev()}>
          <SkipBack size={17} />
        </button>
        {player.status === 'playing' ? (
          <button className="mp-btn mp-main" aria-label="Pause" onClick={() => player.pause()}>
            <Pause size={19} />
          </button>
        ) : (
          <button className="mp-btn mp-main" aria-label="Play" onClick={() => (player.status === 'paused' ? player.resume() : player.start(pos))}>
            <Play size={19} />
          </button>
        )}
        <button className="mp-btn" aria-label="Next verse" onClick={() => player.next()}>
          <SkipForward size={17} />
        </button>
        <button className="mp-btn mp-close" aria-label="Stop narration" onClick={() => player.stop()}>
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
