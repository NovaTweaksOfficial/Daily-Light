import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Settings } from '@/types'
import { dbGet, dbSet } from '@/lib/storage'
import { speechPlayer } from '@/lib/tts'
import { startScheduler, stopScheduler } from '@/lib/notify'
import { loadBook, loadIndex, setResolvedIndex, getResolvedIndex } from '@/lib/bible'
import { dailyVerseForDate, dailyRef } from '@/lib/daily'

const STORAGE_KEY = 'dl.settings'

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  accent: 'gold',
  fontScale: 1,
  lineHeight: 1.7,
  scriptureFont: 'serif',
  ttsRate: 1,
  ttsVoiceURI: null,
  autoAdvanceChapters: true,
  followText: true,
  notificationsEnabled: false,
  reminderTime: '08:00',
}

function loadSettingsSync(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_SETTINGS }
}

interface SettingsCtx {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  reset: () => void
}

const Ctx = createContext<SettingsCtx | null>(null)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettingsSync)

  // Restore from IDB if localStorage was cleared but IDB survived.
  useEffect(() => {
    dbGet<Settings>('kv', 'settings').then((saved) => {
      if (saved) {
        setSettings((cur) => {
          const curRaw = localStorage.getItem(STORAGE_KEY)
          if (!curRaw) return { ...DEFAULT_SETTINGS, ...saved }
          return cur
        })
      }
    })
  }, [])

  const update = (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      dbSet('kv', 'settings', next).catch(() => undefined)
      return next
    })
  }

  const reset = () => update({ ...DEFAULT_SETTINGS })

  /* Apply theme + accent to <html> ------------------------------------------ */
  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const resolved =
        settings.theme === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : settings.theme
      root.dataset.theme = resolved
      root.dataset.accent = settings.accent
    }
    apply()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings.theme, settings.accent])

  /* Sync TTS engine with settings ------------------------------------------ */
  useEffect(() => {
    speechPlayer.setRate(settings.ttsRate)
    speechPlayer.setVoice(settings.ttsVoiceURI)
    speechPlayer.setAutoChapter(settings.autoAdvanceChapters)
  }, [settings.ttsRate, settings.ttsVoiceURI, settings.autoAdvanceChapters])

  /* Bible index is needed by several views early on ------------------------- */
  useEffect(() => {
    loadIndex().then((idx) => setResolvedIndex(idx))
  }, [])

  /* Reminder scheduler ------------------------------------------------------- */
  useEffect(() => {
    const getVerse = async () => {
      const daily = dailyVerseForDate()
      const ref = dailyRef(daily, getResolvedIndex())
      try {
        const book = await loadBook(daily.book)
        const text = book.chapters[daily.chapter - 1]?.verses[daily.verse - 1] ?? ''
        return {
          title: 'Daily Light — your verse for today',
          body: text ? `${ref} — ${text}` : `${ref} · ${daily.devotion}`,
          route: '#/daily',
        }
      } catch {
        return {
          title: 'Daily Light — your verse for today',
          body: `${ref} · ${daily.devotion}`,
          route: '#/daily',
        }
      }
    }
    if (settings.notificationsEnabled) {
      startScheduler({ enabled: true, time: settings.reminderTime }, getVerse, () => undefined)
    } else {
      stopScheduler()
    }
    return () => stopScheduler()
  }, [settings.notificationsEnabled, settings.reminderTime])

  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSettings(): SettingsCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
