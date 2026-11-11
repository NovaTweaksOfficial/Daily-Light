/* Sharing helpers: Web Share API with a clipboard fallback. */

export async function shareText(text: string, title?: string): Promise<'shared' | 'copied' | 'failed'> {
  if (navigator.share) {
    try {
      await navigator.share({ text, title: title ?? 'Daily Light' })
      return 'shared'
    } catch (err) {
      // AbortError = user dismissed the share sheet; treat as done.
      if ((err as Error).name === 'AbortError') return 'shared'
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    try {
      // Fallback for older browsers without the async clipboard API.
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      return 'copied'
    } catch {
      return 'failed'
    }
  }
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDayLabel(key: string): string {
  const m = key.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return key
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const today = new Date()
  const diff = Math.round(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - d.getTime()) / 86400000,
  )
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function greeting(date = new Date()): string {
  const h = date.getHours()
  if (h < 5) return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}
