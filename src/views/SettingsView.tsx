import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Palette,
  BookOpen,
  Headphones,
  Bell,
  BellOff,
  Database,
  Info,
  Trash2,
  Download,
  Volume2,
  Flame,
} from 'lucide-react'
import { useSettings } from '@/state/settings'
import { useLibrary } from '@/state/library'
import { usePlayer } from '@/state/player'
import { useToast } from '@/state/toast'
import { permissionState, requestPermission, showNotification, notificationsSupported } from '@/lib/notify'
import { dbGetAll, dbWipeAll, idbAvailable } from '@/lib/storage'
import { loadIndex, totalChapterCount } from '@/lib/bible'
import type { AccentColor, BibleIndex, ThemeMode } from '@/types'
import { PageHeader, Toggle, Segmented, Button, Sheet } from '@/components/ui'

const ACCENTS: { id: AccentColor; label: string; swatch: string }[] = [
  { id: 'gold', label: 'Gold', swatch: '#c99a2e' },
  { id: 'indigo', label: 'Indigo', swatch: '#5b5bd6' },
  { id: 'rose', label: 'Rose', swatch: '#c2507b' },
  { id: 'forest', label: 'Forest', swatch: '#3d7a4f' },
]

export default function SettingsView() {
  const { settings, update, reset } = useSettings()
  const { bookmarks, highlights, notes, chaptersRead, streak, history } = useLibrary()
  const player = usePlayer()
  const { toast } = useToast()
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>('default')
  const [idb, setIdb] = useState<boolean | null>(null)
  const [wipeOpen, setWipeOpen] = useState(false)
  const [index, setIndex] = useState<BibleIndex | null>(null)

  useEffect(() => {
    setPerm(permissionState())
    idbAvailable().then(setIdb)
    loadIndex().then(setIndex)
  }, [])

  const percentBible = useMemo(() => {
    const total = index ? totalChapterCount(index) : 1189
    return Math.round((chaptersRead.size / total) * 100)
  }, [chaptersRead, index])

  const onToggleNotifications = async (v: boolean) => {
    if (!v) {
      update({ notificationsEnabled: false })
      return
    }
    if (!notificationsSupported()) {
      toast('This browser does not support notifications')
      return
    }
    const result = await requestPermission()
    setPerm(result)
    if (result === 'granted') {
      update({ notificationsEnabled: true })
      toast('Daily reminders on')
    } else if (result === 'denied') {
      toast('Notifications are blocked in your browser settings')
    } else {
      toast('Permission needed — try again and choose Allow')
    }
  }

  const exportData = async () => {
    const [bm, hl, nt, plans, hist] = await Promise.all([
      dbGetAll('bookmarks'),
      dbGetAll('highlights'),
      dbGetAll('notes'),
      dbGetAll('plans'),
      dbGetAll('history'),
    ])
    const payload = {
      app: 'Daily Light',
      exportedAt: new Date().toISOString(),
      bookmarks: bm,
      highlights: hl,
      notes: nt,
      plans,
      history: hist,
      chaptersRead: [...chaptersRead],
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `daily-light-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('Backup downloaded')
  }

  return (
    <div className="view settings-view">
      <PageHeader title="Settings" subtitle="Make Daily Light yours" />

      {/* Appearance ----------------------------------------------------------- */}
      <section className="settings-card card">
        <h3 className="settings-title">
          <Palette size={15} /> Appearance
        </h3>
        <div className="settings-row col">
          <div className="settings-copy">
            <strong>Theme</strong>
            <span>Follows your device by default.</span>
          </div>
          <Segmented<ThemeMode>
            options={[
              { value: 'system', label: 'Auto' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            value={settings.theme}
            onChange={(theme) => update({ theme })}
          />
        </div>
        <div className="settings-row col">
          <div className="settings-copy">
            <strong>Accent color</strong>
            <span>Used for buttons, highlights, and links.</span>
          </div>
          <div className="accent-row">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                className={`accent-dot ${settings.accent === a.id ? 'on' : ''}`}
                style={{ background: a.swatch }}
                onClick={() => update({ accent: a.id })}
                aria-label={`${a.label} accent`}
                title={a.label}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Reading -------------------------------------------------------------- */}
      <section className="settings-card card">
        <h3 className="settings-title">
          <BookOpen size={15} /> Reading
        </h3>
        <div className="settings-row col">
          <div className="settings-copy">
            <strong>Scripture text size</strong>
            <span>Scales verse text in the reader.</span>
          </div>
          <div className="font-scale-row">
            <span className="fs-demo" style={{ fontSize: '0.75rem' }}>A</span>
            <input
              type="range"
              min={0.8}
              max={1.6}
              step={0.05}
              value={settings.fontScale}
              onChange={(e) => update({ fontScale: Number(e.target.value) })}
              aria-label="Scripture text size"
            />
            <span className="fs-demo" style={{ fontSize: '1.3rem' }}>A</span>
          </div>
        </div>
        <div className="settings-row col">
          <div className="settings-copy">
            <strong>Line spacing</strong>
            <span>Room between verse lines.</span>
          </div>
          <input
            type="range"
            min={1.4}
            max={2.2}
            step={0.1}
            value={settings.lineHeight}
            onChange={(e) => update({ lineHeight: Number(e.target.value) })}
            aria-label="Line spacing"
          />
        </div>
        <div className="settings-row col">
          <div className="settings-copy">
            <strong>Typeface</strong>
            <span>Scripture can read as a book or as an article.</span>
          </div>
          <Segmented<'serif' | 'sans'>
            options={[
              { value: 'serif', label: 'Literata (serif)' },
              { value: 'sans', label: 'Inter (sans)' },
            ]}
            value={settings.scriptureFont}
            onChange={(scriptureFont) => update({ scriptureFont })}
          />
        </div>
        <p className="settings-preview scripture" data-font={settings.scriptureFont} style={{ fontSize: `calc(var(--verse-size) * ${settings.fontScale})`, lineHeight: String(settings.lineHeight) }}>
          <span className="vnum">1</span>
          <span className="vtext">In the beginning, God created the heavens and the earth.</span>
        </p>
      </section>

      {/* Audio ---------------------------------------------------------------- */}
      <section className="settings-card card">
        <h3 className="settings-title">
          <Headphones size={15} /> Audio
        </h3>
        {!player.supported ? (
          <p className="muted-note">
            Speech narration is not supported by this browser. Try Safari, Chrome, or Edge.
          </p>
        ) : (
          <>
            <div className="settings-row col">
              <div className="settings-copy">
                <strong>Narration speed</strong>
                <span>Applies immediately while listening.</span>
              </div>
              <Segmented<number>
                options={[0.75, 1, 1.25, 1.5, 2].map((r) => ({ value: r, label: `${r}×` }))}
                value={settings.ttsRate}
                onChange={(ttsRate) => update({ ttsRate })}
              />
            </div>
            <div className="settings-row col">
              <div className="settings-copy">
                <strong>Voice</strong>
                <span>Provided by your device&rsquo;s speech engines.</span>
              </div>
              <select
                className="voice-select"
                value={settings.ttsVoiceURI ?? ''}
                onChange={(e) => update({ ttsVoiceURI: e.target.value || null })}
                aria-label="Narration voice"
              >
                <option value="">Device default</option>
                {player.voices.map((v) => (
                  <option key={v.uri} value={v.uri}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
            <div className="settings-row">
              <div className="settings-copy">
                <strong>Continue into next chapter</strong>
                <span>Narration flows on past chapter ends.</span>
              </div>
              <Toggle
                checked={settings.autoAdvanceChapters}
                onChange={(autoAdvanceChapters) => update({ autoAdvanceChapters })}
                label="Auto-advance"
              />
            </div>
            <div className="settings-row">
              <div className="settings-copy">
                <strong>Follow along</strong>
                <span>Scrolls to the verse being spoken.</span>
              </div>
              <Toggle
                checked={settings.followText}
                onChange={(followText) => update({ followText })}
                label="Follow text"
              />
            </div>
          </>
        )}
      </section>

      {/* Notifications --------------------------------------------------------- */}
      <section className="settings-card card">
        <h3 className="settings-title">
          <Bell size={15} /> Daily reminder
        </h3>
        {!notificationsSupported() ? (
          <p className="muted-note">
            This browser does not support notifications. Daily Light still greets you with a fresh
            verse whenever you open it.
          </p>
        ) : (
          <>
            <div className="settings-row">
              <div className="settings-copy">
                <strong>Daily verse reminder</strong>
                <span>
                  {perm === 'granted'
                    ? 'A gentle nudge with today’s verse.'
                    : perm === 'denied'
                      ? 'Blocked — allow notifications in your browser site settings.'
                      : 'Permission will be requested when you turn this on.'}
                </span>
              </div>
              <Toggle
                checked={settings.notificationsEnabled && perm === 'granted'}
                onChange={onToggleNotifications}
                label="Daily reminder"
              />
            </div>
            {settings.notificationsEnabled && perm === 'granted' && (
              <div className="settings-row col">
                <div className="settings-copy">
                  <strong>Remind me at</strong>
                  <span>Local time on this device.</span>
                </div>
                <input
                  type="time"
                  className="time-input"
                  value={settings.reminderTime}
                  onChange={(e) => update({ reminderTime: e.target.value || '08:00' })}
                  aria-label="Reminder time"
                />
              </div>
            )}
            {perm === 'granted' && (
              <Button
                variant="soft"
                onClick={() =>
                  void showNotification(
                    'Daily Light',
                    'This is how your daily verse reminder will look.',
                  ).then((how) => {
                    if (how === 'denied' || how === 'failed') toast('Could not show a test notification')
                  })
                }
              >
                <Volume2 size={15} /> Send a test notification
              </Button>
            )}
            <p className="settings-note">
              <BellOff size={13} aria-hidden /> Because Daily Light is a website with no server,
              reminders are delivered while the app is open (or in another tab), and it catches up
              when you return. For always-on reminders, install it as an app and keep it running,
              or rely on your device&rsquo;s clock.
            </p>
          </>
        )}
      </section>

      {/* Data ------------------------------------------------------------------ */}
      <section className="settings-card card">
        <h3 className="settings-title">
          <Database size={15} /> Your data
        </h3>
        <div className="data-grid">
          <div className="data-cell">
            <Flame size={15} className="streak" aria-hidden />
            <strong>{streak.current}</strong>
            <span>day streak</span>
          </div>
          <div className="data-cell">
            <BookOpen size={15} aria-hidden />
            <strong>{chaptersRead.size}</strong>
            <span>chapters read ({percentBible}%)</span>
          </div>
          <div className="data-cell">
            <Link to="/saved" className="data-link">
              <strong>{bookmarks.length + highlights.length + notes.length}</strong>
              <span>saved items</span>
            </Link>
          </div>
          <div className="data-cell">
            <strong>{history.length}</strong>
            <span>recent chapters</span>
          </div>
        </div>
        <p className="settings-note">
          Everything is stored privately on this device{ idb === true ? ' (IndexedDB)' : idb === false ? ' (localStorage — private mode?)' : '' }.
          Nothing is uploaded anywhere.
        </p>
        <div className="settings-actions">
          <Button variant="soft" onClick={() => void exportData()}>
            <Download size={15} /> Export backup
          </Button>
          <Button variant="ghost" onClick={() => setWipeOpen(true)}>
            <Trash2 size={15} /> Clear all data
          </Button>
        </div>
      </section>

      {/* About ----------------------------------------------------------------- */}
      <section className="settings-card card about-card">
        <h3 className="settings-title">
          <Info size={15} /> About
        </h3>
        <p className="about-line">
          <strong>Daily Light</strong> — a complete, offline-capable Bible app.
        </p>
        <p className="about-line">
          Scripture: <strong>World English Bible</strong> — public domain, no rights reserved.
         {' '}
          {index ? `Updated ${new Date(index.updatedAt).toLocaleDateString()}.` : ''}
        </p>
        <p className="about-line">
          Words of Jesus shown in red letters; Song of Solomon speaker labels; footnote markers
          from the WEB.
        </p>
        <p className="about-line credit">
          Built by <strong>FL3SH</strong>{' '}
          <svg viewBox="0 0 24 24" width="12" height="12" className="inline-ico" aria-hidden fill="currentColor">
            <rect x="9.4" y="3.2" width="5.2" height="17.6" rx="1.6" />
            <rect x="4.5" y="8.1" width="15" height="5.2" rx="1.6" />
          </svg>
        </p>
      </section>

      <button className="reset-all" onClick={() => { reset(); toast('Settings restored to defaults') }}>
        Reset all settings
      </button>

      {/* Wipe confirmation */}
      <Sheet open={wipeOpen} onClose={() => setWipeOpen(false)} title="Clear all data?">
        <p className="sheet-note">
          This permanently removes bookmarks, highlights, notes, plans, reading progress, and the
          cached Bible text from this device. There is no undo — export a backup first if you want
          one.
        </p>
        <div className="note-actions">
          <Button variant="ghost" onClick={() => setWipeOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              void dbWipeAll().then(() => {
                setWipeOpen(false)
                toast('All data cleared — reloading')
                window.setTimeout(() => window.location.reload(), 600)
              })
            }}
          >
            <Trash2 size={15} /> Clear everything
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
