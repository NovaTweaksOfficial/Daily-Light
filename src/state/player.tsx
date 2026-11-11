import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { speechPlayer } from '@/lib/tts'
import type { PlayerPosition, PlayerStatus, VoiceInfo } from '@/lib/tts'

interface PlayerCtx {
  supported: boolean
  status: PlayerStatus
  position: PlayerPosition | null
  voices: VoiceInfo[]
  start: (pos: PlayerPosition, opts?: { single?: boolean }) => void
  pause: () => void
  resume: () => void
  stop: () => void
  next: () => void
  prev: () => void
  jumpTo: (verse: number) => void
}

const Ctx = createContext<PlayerCtx | null>(null)

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const status = useSyncExternalStore(speechPlayer.subscribe, () => speechPlayer.status)
  const position = useSyncExternalStore(speechPlayer.subscribe, () => speechPlayer.position)
  const [voices, setVoices] = useState(speechPlayer.voices())

  useEffect(() => {
    let tries = 0
    const load = () => {
      const v = speechPlayer.voices()
      if (v.length) setVoices(v)
    }
    load()
    speechPlayer.refreshVoices(load)
    // Chrome populates voices asynchronously; poll a few times as backup.
    const t = setInterval(() => {
      tries++
      load()
      if (tries > 10) clearInterval(t)
    }, 400)
    return () => clearInterval(t)
  }, [])

  // Re-acquire wake lock when returning to the page while listening.
  useEffect(() => {
    const onVis = () => speechPlayer.onVisible()
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const value = useMemo<PlayerCtx>(
    () => ({
      supported: speechPlayer.supported,
      status,
      position,
      voices,
      start: (pos, opts) => void speechPlayer.start(pos, opts),
      pause: () => speechPlayer.pause(),
      resume: () => speechPlayer.resume(),
      stop: () => speechPlayer.stop(),
      next: () => speechPlayer.next(),
      prev: () => speechPlayer.prev(),
      jumpTo: (verse) => speechPlayer.jumpTo(verse),
    }),
    [status, position, voices],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePlayer(): PlayerCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider')
  return ctx
}
