# Daily Light

**A complete, offline-capable Bible app** — read the whole Bible, listen to it narrated, and
get a fresh verse every day. Built as an installable PWA that works on phones, tablets, and
desktops, with no account, no server, and no tracking.

> Scripture text: **World English Bible** (public domain) — bundled with the app, so every
> feature works offline.

---

## Features

| Area | What it does |
| --- | --- |
| **Read** | All 66 books, 1,189 chapters, 31,103 verses. Poetry line breaks, Psalm superscriptions, Song of Solomon speaker labels, manuscript notes, and **words of Jesus in red letters**. |
| **Listen** | Verse-by-verse narration with auto-advance through the chapter (and into the next one), the verse being read is highlighted, and the text scrolls to follow along. Speed 0.75×–2×, voice picker, tap any verse to jump there. |
| **Daily** | A curated devotional verse that rotates deterministically — the same verse for everyone on a given day — with a short reflection, listen/save/share, and the previous six days for review. |
| **Plans** | Four ready-made plans (*The Bible in a Year*, *New Testament in 90 Days*, *Old Testament in 180 Days*, *Life of Jesus in 30 Days*) plus a **custom plan builder** (pick books, pick a length). Every chapter appears exactly once, streaks are tracked, and days can be completed or undone. |
| **Search** | Full-text keyword search across the entire Bible (offline) *and* reference lookup — type `John 3:16`, `Jude 2`, `ps 23`, `iii john`, or `Rom 8` to jump straight to a passage. |
| **Library** | Bookmarks, five highlight colours, and notes on any verse; recent chapters; resume-where-you-left-off; reading progress per book and overall. |
| **Settings** | Light/dark/auto themes, four accent colours, text size, line spacing, serif or sans scripture type, narration speed/voice, daily reminder, JSON backup export, and a full data wipe. |
| **Offline** | The whole Bible plus the app shell are cached by a service worker — the app opens and reads with no connection. |

Everything is stored **on your device** (IndexedDB, with a localStorage fallback for private
browsing). Nothing is uploaded, and there is no analytics or tracking of any kind.

---

## Quick start

```bash
npm install     # install dependencies
npm run dev     # start the dev server (http://localhost:5173)
```

Other scripts:

```bash
npm run build     # type-check (tsc --noEmit) + production build into dist/
npm run preview   # serve the production build locally
npm test          # run the unit test suite (vitest)
npm run bible     # re-download and re-convert the World English Bible (see below)
npm run icons     # regenerate the PWA icons from source
npm run silence   # regenerate public/silence.wav (see "How audio works")
```

Requires Node 20 or newer.

---

## Deploying to GitHub Pages

The repository ships with a GitHub Actions workflow at
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) that builds the app and publishes
it to GitHub Pages.

1. Make sure the repository's **Settings → Pages → Build and deployment → Source** is set to
   **GitHub Actions**.
2. Push to the `main` branch — the workflow runs automatically.

```
https://<user>.github.io/<repo>/
```

Every deploy is a plain static site (HTML + hashed JS/CSS + the Bible JSON), so it also works
on any other static host — Netlify, Cloudflare Pages, S3, or your own server. Point the host at
the `dist/` folder.

The build uses a relative base path (`base: './'`) and hash-based routing, so the app works
under any sub-path without configuration and never 404s on a page refresh.

---

## Updating the Bible text

The Bible ships **inside the app** (`public/bible/`), so there is no API dependency at runtime.

```
public/bible/index.json      book metadata: names, abbreviations, chapter + verse counts
public/bible/web/01.json     Genesis  (one file per book, lazy-loaded on demand)
public/bible/web/66.json     Revelation
```

To refresh or regenerate it from the official eBible USFM source:

```bash
npm run bible
```

This downloads `eng-web_usfm.zip` from [ebible.org](https://ebible.org/find/show.php?id=eng-web),
converts it into the JSON format above, and prints a report:

```
Books:      66/66
Chapters:   1189
Verses:     31103
Jesus-text: 2059 verses with red-letter ranges
Speakers:   31 speaker headings (Song of Solomon)
Notes:      5 manuscript-note verses
Issues:     0
```

The converter strips USFM markup (Strong's tags, footnotes, cross-references), records the
character ranges of the words of Jesus for red-letter rendering, preserves poetry line breaks,
and **validates every range against the final verse text** — so a bad conversion fails loudly
instead of shipping broken output. Pass a path to a local copy to work offline:

```bash
npm run bible -- /path/to/eng-web_usfm.zip
npm run bible -- /path/to/extracted/usfm/directory
```

The World English Bible is dedicated to the **public domain** — no attribution is legally
required, though the app credits it in Settings.

---

## How audio (narration) works

Narration uses the browser's built-in **Web Speech API** (`speechSynthesis`) — there is no
audio file to download and no server involved.

- The app speaks **one utterance per verse**, then advances automatically.
- When a chapter ends it moves on to the next chapter (toggleable in Settings → Audio).
- The verse being spoken is highlighted, and the reader scrolls to follow it.
- A **wake lock** keeps the screen awake while narrating where the browser supports it.
- Voices come from your device, so quality and language depend on your OS.

**Mobile specifics (these matter more than they look):**

- iOS and Android only accept speech that *starts inside your tap*. The app therefore primes
  the speech engine on the first touch of the screen and starts speaking within the tap that
  you pressed — it never waits on a network request before the first word.
- **iOS Silent mode mutes apps, including narration.** When Daily Light is added to the home
  screen, iOS routes its audio through the ambient category, so a phone in Silent mode stays
  completely silent. The app fixes this by playing a silent clip (`public/silence.wav`, 2 KB of
  nothing) during your first tap, which switches iOS to the playback category so the voice is
  heard. If it is still quiet, check the Silent switch on the side of the phone.
- WebKit drops an utterance that is spoken in the same tick as a `cancel()`, so the app waits a
  moment before interrupting or jumping.
- If the engine is left paused (a common state after the app was backgrounded), the app resumes
  it when you come back.
- **Settings → Audio → Play a sample** speaks a short phrase so you can confirm your device has
  a working voice. The number of installed voices is shown next to it.
- **Settings → Audio → Narration diagnostics** reports the device, the speech engine, the
  installed voices, the device language, whether the app is running as an installed app, and
  the last error. "Copy report" puts all of it on the clipboard so it can be sent along with a
  bug report — this is the fastest way to diagnose a phone that stays silent.
- If narration fails, the app **says so** with the browser's actual error (blocked audio, no
  voice installed, audio output busy, and so on) instead of failing silently.
- If the page was opened **inside another app** (a chat app, a social app), that in-app browser
  often has a speech engine that never makes a sound. Open the address in Safari or Chrome, or
  add the app to your home screen, and narration works.

**Platform limits (handled honestly in the UI):**

- If the browser has no speech engine, the Listen tab explains what is missing and everything
  else keeps working.
- Chrome on Android does not implement `pause()`; the app detects this and falls back to
  cancel-and-resume-from-the-current-verse.
- iOS Safari stops speech when the app is backgrounded — return to the app and it resumes.
- Voice availability depends on the operating system, not on this app.
- On a phone, keep your media volume up and the screen awake; narration plays through the
  device's normal audio output.

---

## How reminders work

Daily Light has **no backend**, so it cannot push notifications from the cloud. The reminder
feature works like this:

- A scheduler runs inside the app while it is open (or open in another tab) and fires at your
  chosen local time.
- If the app was closed when the reminder was due, it **catches up** the next time you open it.
- Notifications are delivered through the service worker, so they render even if the tab is in
  the background.
- Turning the reminder on asks for permission; if permission is blocked, the app says so
  plainly instead of pretending it works.

For a daily nudge you never have to think about, install the app to your home screen and let
your device's own clock/notification settings handle it.

---

## Installing as an app

The app ships a web manifest and icons, so browsers offer "Install app" / "Add to Home
Screen":

- **iOS (Safari)** — Share → *Add to Home Screen*
- **Android (Chrome)** — menu → *Install app*
- **Desktop (Chrome/Edge)** — the install icon in the address bar

Installed, it runs full-screen with the app icon, and works offline.

---

## Project structure

```
bible-app/
├── public/
│   ├── bible/            the World English Bible (generated, committed)
│   ├── icons/            app icons (generated)
│   ├── favicon.svg
│   ├── manifest.webmanifest
│   └── sw.js             service worker: cache-first Bible data, offline shell
├── scripts/
│   ├── fetch-bible.mjs   USFM → JSON converter + validator
│   └── gen-icons.mjs     dependency-free PNG icon generator
├── src/
│   ├── components/       AppShell, VerseRow, VerseActionSheet, MiniPlayer, Toasts, ui
│   ├── lib/              bible, refs, plans, daily, tts, notify, storage, share
│   ├── state/            settings, library, plans, player, toast (React contexts)
│   ├── styles/           tokens.css (theme/accent variables) + app.css
│   ├── views/            Home, Bible, Reader, Daily, Listen, Plans, Saved, Search, Settings
│   ├── App.tsx           hash-based routing with lazy-loaded views
│   └── main.tsx          provider tree, error boundary, service worker registration
└── .github/workflows/deploy.yml
```

**Stack:** React 18 + TypeScript (strict) + Vite 6, `react-router-dom` with hash routing (so it
never breaks on a static host), and `lucide-react` for icons. No UI framework, no state
library, no CSS framework — the design system is a couple of plain CSS files driven by CSS
custom properties.

---

## Testing

```bash
npm test
```

The suite covers the reference parser (`John 3:16`, `Jude 2`, `iii john`, out-of-range input),
plan generation (every chapter exactly once, at least one passage per day, determinism),
streak maths, the daily-verse rotation, and the integrity of the bundled Bible text
(66 books, 1,189 chapters, 31,103 verses, in-bounds red-letter ranges, no leftover markup).

---

## Credits

- **Scripture:** World English Bible — public domain, [ebible.org](https://ebible.org/find/show.php?id=eng-web).
- **Design & build:** FL3SH — Daily Light.
