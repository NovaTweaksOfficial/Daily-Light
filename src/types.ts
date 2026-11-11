/* Shared types for the Daily Light app. */

export type Testament = 'OT' | 'NT'

export interface BookMeta {
  id: number
  name: string
  abbr: string
  osis: string
  testament: Testament
  chapters: number
  verseCounts: number[]
  verses: number
}

export interface BibleIndex {
  id: string
  name: string
  shortName: string
  license: string
  source: string
  updatedAt: string
  totalVerses: number
  books: BookMeta[]
}

/** One chapter as stored in public/bible/web/NN.json */
export interface ChapterData {
  /** Psalm titles / superscriptions */
  title?: string
  /** Verse texts, index i = verse i + 1 */
  verses: string[]
  /** Words of Jesus character ranges per verse ("3": [[start, end]]) */
  wj?: Record<string, [number, number][]>
  /** Song of Solomon speaker labels shown above a verse ("2": "Beloved") */
  hv?: Record<string, string>
  /** Manuscript-note verses (kept number, text lives in a footnote) */
  tv?: Record<string, string>
}

export interface BookData {
  id: number
  name: string
  osis: string
  chapters: ChapterData[]
}

export interface VerseRef {
  book: number
  chapter: number
  verse: number
}

export interface Bookmark extends VerseRef {
  id: string
  text: string
  createdAt: number
}

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple'

export interface Highlight extends VerseRef {
  id: string
  color: HighlightColor
  createdAt: number
}

export interface Note extends VerseRef {
  id: string
  note: string
  text: string
  updatedAt: number
}

export interface HistoryItem {
  id: string
  book: number
  chapter: number
  at: number
}

export interface LastRead {
  book: number
  chapter: number
  at: number
}

export interface PlanDay {
  passages: { book: number; chapter: number }[]
}

export type PlanScope = 'whole' | 'nt' | 'ot' | 'gospels' | 'custom'

export interface PlanDef {
  id: string
  name: string
  description: string
  days: number
  scope: PlanScope
}

export interface CustomPlanDef extends PlanDef {
  books: number[]
}

export interface PlanState {
  /** Unique instance id */
  id: string
  defId: string
  name: string
  startedAt: number
  lastActivity: number
  completedDays: number[]
  custom?: CustomPlanDef
}

export type ThemeMode = 'system' | 'light' | 'dark'
export type AccentColor = 'gold' | 'indigo' | 'rose' | 'forest'

export interface Settings {
  theme: ThemeMode
  accent: AccentColor
  /** Scripture font size multiplier */
  fontScale: number
  /** Scripture line height */
  lineHeight: number
  scriptureFont: 'serif' | 'sans'
  ttsRate: number
  ttsVoiceURI: string | null
  autoAdvanceChapters: boolean
  followText: boolean
  notificationsEnabled: boolean
  reminderTime: string
}

export interface SearchHit {
  book: number
  chapter: number
  verse: number
  text: string
}
