/* Minimal promise-based IndexedDB helper with a localStorage fallback so the
 * app keeps working in private browsing modes where IDB is unavailable. */

const DB_NAME = 'daily-light'
const DB_VERSION = 1
export const STORES = [
  'kv',
  'bookmarks',
  'highlights',
  'notes',
  'history',
  'progress',
  'plans',
  'cache',
] as const
export type StoreName = (typeof STORES)[number]

let dbPromise: Promise<IDBDatabase> | null = null
let idbBroken = false

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined' || idbBroken) {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'))
    req.onblocked = () => reject(new Error('IndexedDB blocked'))
  })
  return dbPromise
}

/* localStorage fallback -------------------------------------------------- */

function lsKey(store: string, key: IDBValidKey) {
  return `${DB_NAME}:${store}:${String(key)}`
}

function lsGet<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  try {
    const raw = localStorage.getItem(lsKey(store, key))
    return Promise.resolve(raw === null ? undefined : (JSON.parse(raw) as T))
  } catch {
    return Promise.resolve(undefined)
  }
}

function lsSet(store: string, key: IDBValidKey, value: unknown): Promise<void> {
  try {
    localStorage.setItem(lsKey(store, key), JSON.stringify(value))
  } catch {
    /* quota exceeded — ignore */
  }
  return Promise.resolve()
}

function lsGetAll<T>(store: string): Promise<T[]> {
  const out: T[] = []
  const prefix = `${DB_NAME}:${store}:`
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(prefix)) {
        const raw = localStorage.getItem(k)
        if (raw) out.push(JSON.parse(raw))
      }
    }
  } catch {
    /* ignore */
  }
  return Promise.resolve(out)
}

/* Public API -------------------------------------------------------------- */

export async function dbGet<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  try {
    const db = await openDB()
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(store, 'readonly')
      const req = tx.objectStore(store).get(key)
      req.onsuccess = () => resolve(req.result as T | undefined)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return lsGet<T>(store, key)
  }
}

export async function dbSet(store: StoreName, key: IDBValidKey, value: unknown): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      tx.objectStore(store).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    await lsSet(store, key, value)
  }
}

export async function dbDelete(store: StoreName, key: IDBValidKey): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      tx.objectStore(store).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    try {
      localStorage.removeItem(lsKey(store, key))
    } catch {
      /* ignore */
    }
  }
}

export async function dbGetAll<T>(store: StoreName): Promise<T[]> {
  try {
    const db = await openDB()
    return await new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(store, 'readonly')
      const req = tx.objectStore(store).getAll()
      req.onsuccess = () => resolve(req.result as T[])
      req.onerror = () => reject(req.error)
    })
  } catch {
    return lsGetAll<T>(store)
  }
}

/** Wipe everything the app persisted (both IDB and localStorage mirrors). */
export async function dbWipeAll(): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([...STORES], 'readwrite')
      for (const s of STORES) tx.objectStore(s).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    /* ignore */
  }
  try {
    const prefix = `${DB_NAME}:`
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && (k.startsWith(prefix) || k.startsWith('dl.'))) keys.push(k)
    }
    for (const k of keys) localStorage.removeItem(k)
  } catch {
    /* ignore */
  }
}

/** True when IndexedDB works (used only for informational UI). */
export async function idbAvailable(): Promise<boolean> {
  try {
    await openDB()
    return true
  } catch {
    return false
  }
}
