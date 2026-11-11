/* Notifications & reminders — best-effort, honest about platform limits.
 *
 * How it works: there is no backend, so reminders are fired by the app while
 * it is open (or in a background tab) using the Notification API / Service
 * Worker registration. When the app is re-opened after a missed reminder, it
 * catches up. True "always-on" push would require a server, which is out of
 * scope for a static GitHub Pages app — the Settings screen explains this.
 */

import { dbGet, dbSet } from '@/lib/storage'

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function permissionState(): NotificationPermission | 'unsupported' {
  if (!notificationsSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

/** Shows a notification; returns how it was delivered (or why not). */
export async function showNotification(
  title: string,
  body: string,
): Promise<'sw' | 'page' | 'denied' | 'failed'> {
  if (!notificationsSupported()) return 'failed'
  if (Notification.permission !== 'granted') return 'denied'
  const icon = new URL(`${import.meta.env.BASE_URL}icons/icon-192.png`, location.href).href
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg?.showNotification) {
        await reg.showNotification(title, {
          body,
          icon,
          badge: icon,
          tag: 'daily-light-reminder',
        })
        return 'sw'
      }
    }
    new Notification(title, { body, icon })
    return 'page'
  } catch {
    return 'failed'
  }
}

/* Reminder scheduling ------------------------------------------------------- */

export interface ReminderSettings {
  enabled: boolean
  time: string // 'HH:MM' 24h local
}

export interface ReminderPayload {
  title: string
  body: string
  route: string
}

type PayloadFn = () => ReminderPayload | null | Promise<ReminderPayload | null>

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

let timer: ReturnType<typeof setInterval> | null = null
let lastSettings: ReminderSettings | null = null
let getVerseFn: PayloadFn | null = null
let onFiredFn: ((how: string) => void) | null = null
let visListener: (() => void) | null = null

async function fireIfDue() {
  const s = lastSettings
  if (!s || !s.enabled) return
  if (permissionState() !== 'granted') return

  const m = s.time.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(m[1]), Number(m[2]))
  if (now.getTime() < target.getTime()) return // not due yet

  const lastDay = await dbGet<string>('kv', 'lastReminderDay')
  if (lastDay === todayKey()) return // already shown today

  const payload = (await getVerseFn?.()) ?? null
  if (!payload) return
  const how = await showNotification(payload.title, payload.body)
  if (how === 'sw' || how === 'page') {
    await dbSet('kv', 'lastReminderDay', todayKey())
    onFiredFn?.(how)
  }
}

/**
 * Starts the reminder loop. `getVerse` supplies the notification content
 * (may be async — e.g. it loads the day's verse text) and `onFired` lets the
 * app react.
 */
export function startScheduler(settings: ReminderSettings, getVerse: PayloadFn, onFired: (how: string) => void) {
  lastSettings = settings
  getVerseFn = getVerse
  onFiredFn = onFired
  if (timer) clearInterval(timer)
  if (visListener) {
    document.removeEventListener('visibilitychange', visListener)
    visListener = null
  }
  if (!settings.enabled || !notificationsSupported()) return
  // Check every 30 s while the app is open (cheap and precise enough).
  timer = setInterval(() => void fireIfDue(), 30000)
  // Also check immediately (covers re-opening the app after the due time).
  void fireIfDue()
  visListener = () => {
    if (document.visibilityState === 'visible') void fireIfDue()
  }
  document.addEventListener('visibilitychange', visListener)
}

export function stopScheduler() {
  if (timer) clearInterval(timer)
  timer = null
  if (visListener) {
    document.removeEventListener('visibilitychange', visListener)
    visListener = null
  }
  lastSettings = null
  getVerseFn = null
  onFiredFn = null
}
