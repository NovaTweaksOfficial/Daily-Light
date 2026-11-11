/* Device diagnostics for narration.
 *
 * Phones fail in ways a desktop never does: the speech engine can be
 * missing, have no voice for the page's language, or be an in-app browser
 * that never makes a sound. This module collects the facts so the app can
 * show them and the user can send a copy back.
 */

import { speechPlayer } from '@/lib/tts'

export interface VoiceDiagnostics {
  /** Does this browser expose a speech engine at all? */
  supported: boolean
  /** How many voices the device reports. */
  voiceCount: number
  /** How many of those can speak English. */
  englishVoices: number
  /** The first few voice names, for the report. */
  sampleVoices: string[]
  /** The device's own language. */
  deviceLanguage: string
  /** Is the app running as an installed app rather than a web page? */
  standalone: boolean
  /** Engine state right now. */
  speaking: boolean
  pending: boolean
  paused: boolean
  /** The last narration problem, if any. */
  lastError: string | null
  /** A short platform description. */
  platform: string
}

function isStandalone(): boolean {
  try {
    if (window.matchMedia?.('(display-mode: standalone)').matches) return true
    const nav = navigator as unknown as { standalone?: boolean }
    return nav.standalone === true
  } catch {
    return false
  }
}

function describePlatform(): string {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS (Safari/WebKit)'
  if (/Android/.test(ua)) return 'Android'
  if (/Macintosh/.test(ua)) return 'macOS'
  if (/Windows/.test(ua)) return 'Windows'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Unknown'
}

export function collectDiagnostics(): VoiceDiagnostics {
  const synth = window.speechSynthesis
  const supported = speechPlayer.supported
  const voices = supported ? synth.getVoices() : []
  const issue = speechPlayer.issue
  return {
    supported,
    voiceCount: voices.length,
    englishVoices: voices.filter((v) => v.lang.toLowerCase().startsWith('en')).length,
    sampleVoices: voices.slice(0, 5).map((v) => `${v.name} (${v.lang})`),
    deviceLanguage: navigator.language,
    standalone: isStandalone(),
    speaking: supported ? synth.speaking : false,
    pending: supported ? synth.pending : false,
    paused: supported ? synth.paused : false,
    lastError: issue ? `${issue.code}: ${issue.message}` : null,
    platform: describePlatform(),
  }
}

/** A copy-paste report the user can send when narration misbehaves. */
export function diagnosticsReport(d: VoiceDiagnostics): string {
  const lines = [
    'Daily Light — narration diagnostics',
    `Platform:        ${d.platform}`,
    `Speech engine:   ${d.supported ? 'available' : 'NOT AVAILABLE'}`,
    `Voices:          ${d.voiceCount} (${d.englishVoices} English)`,
    `Device language: ${d.deviceLanguage}`,
    `Running as app:  ${d.standalone ? 'yes (installed)' : 'no (browser tab)'}`,
    `Engine state:    speaking=${d.speaking} pending=${d.pending} paused=${d.paused}`,
    `Last error:      ${d.lastError ?? 'none'}`,
    '',
    'Voices:',
    ...(d.sampleVoices.length ? d.sampleVoices.map((v) => `  - ${v}`) : ['  (none reported)']),
  ]
  return lines.join('\n')
}
