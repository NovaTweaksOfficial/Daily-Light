/* Daily Light service worker.
 *
 * Strategy:
 *  - Bible data (public/bible/*): cache-first — the whole text is meant to be
 *    available offline and never changes between deploys (versioned by URL of
 *    the deploy directory is not possible on Pages, so we purge on activate).
 *  - Navigations: network-first with a cached fallback (so the app opens
 *    offline).
 *  - Hashed build assets: stale-while-revalidate.
 *
 * A new deploy ships a new SW (byte-different) which takes over via
 * SKIP_WAITING; old caches are deleted on activate.
 */

const VERSION = 'v2'
const SHELL_CACHE = `dl-shell-${VERSION}`
const DATA_CACHE = `dl-data-${VERSION}`
const ASSET_CACHE = `dl-assets-${VERSION}`

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE)
      // The app shell (index.html) is what navigations fall back to.
      await cache.addAll([new URL('./', self.registration.scope).href]).catch(() => undefined)
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, DATA_CACHE, ASSET_CACHE])
      for (const name of await caches.keys()) {
        if (!keep.has(name)) await caches.delete(name)
      }
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

function isBibleData(url) {
  return url.pathname.includes('/bible/') && url.pathname.endsWith('.json')
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // fonts etc. go straight to network

  /* Bible data: cache-first */
  if (isBibleData(url)) {
    event.respondWith(
      caches.open(DATA_CACHE).then(async (cache) => {
        const hit = await cache.match(req)
        if (hit) return hit
        try {
          const res = await fetch(req)
          if (res.ok) cache.put(req, res.clone())
          return res
        } catch {
          return new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      }),
    )
    return
  }

  /* Navigations: network-first, cache fallback */
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // `cache: 'reload'` bypasses the HTTP cache so a new deploy is
          // picked up immediately instead of serving a stale index.html.
          const res = await fetch(req, { cache: 'reload' })
          const cache = await caches.open(SHELL_CACHE)
          cache.put(new URL('./', self.registration.scope).href, res.clone())
          return res
        } catch {
          const cache = await caches.open(SHELL_CACHE)
          const shell =
            (await cache.match(new URL('./', self.registration.scope).href)) ||
            (await cache.match(req))
          if (shell) return shell
          return new Response('Daily Light is offline and the shell is not cached yet.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          })
        }
      })(),
    )
    return
  }

  /* Hashed assets: stale-while-revalidate */
  event.respondWith(
    (async () => {
      const cache = await caches.open(ASSET_CACHE)
      const hit = await cache.match(req)
      const network = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone())
          return res
        })
        .catch(() => null)
      if (hit) {
        // Refresh in the background; serve the cached copy immediately.
        network.catch(() => undefined)
        return hit
      }
      const res = await network
      if (res) return res
      return new Response('', { status: 504 })
    })(),
  )
})

/* Notification interactions ------------------------------------------------------ */

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    (async () => {
      const target = new URL('./#/daily', self.registration.scope).href
      const clientsArr = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clientsArr) {
        if ('focus' in client) {
          await client.focus()
          if (client.navigate) await client.navigate(target)
          return
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(target)
    })(),
  )
})
