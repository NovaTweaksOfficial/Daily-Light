/* Daily verse selection — a curated, devotional rotation that is fully
 * deterministic: the same calendar day always produces the same verse. */

import type { BibleIndex } from '@/types'

export interface DailyVerse {
  book: number
  chapter: number
  verse: number
  devotion: string
}

/**
 * Curated verse list (World English Bible references).
 * Book ids follow canonical order: 1 Genesis … 66 Revelation.
 */
export const DAILY_VERSES: DailyVerse[] = [
  { book: 43, chapter: 3, verse: 16, devotion: 'The whole gospel in one sentence — God’s love is a giving love, measured by the price He was willing to pay.' },
  { book: 19, chapter: 23, verse: 1, devotion: 'The Lord shepherds you personally. Wherever today leads, you follow His leading, not your own strength.' },
  { book: 20, chapter: 3, verse: 5, devotion: 'Understanding has limits; trust does not. Lean on God today even where you cannot see the path.' },
  { book: 50, chapter: 4, verse: 13, devotion: 'Your capacity today is not your own — it is Christ strengthening you from the inside.' },
  { book: 45, chapter: 8, verse: 28, devotion: 'God weaves every thread — even the frayed ones — into good for those who love Him.' },
  { book: 6, chapter: 1, verse: 9, devotion: 'Courage is not the absence of fear; it is God’s presence with you in the middle of it.' },
  { book: 23, chapter: 41, verse: 10, devotion: 'Fear loses its grip when you remember who holds your hand and promises never to let go.' },
  { book: 40, chapter: 11, verse: 28, devotion: 'Jesus invites the exhausted, not the impressive. Bring the tired version of you — that is who He calls.' },
  { book: 50, chapter: 4, verse: 6, devotion: 'Worry is prayer in the wrong direction. Trade your anxieties for gratitude and let peace stand guard.' },
  { book: 24, chapter: 29, verse: 11, devotion: 'God’s plans for you outlast your worst plans for yourself. Hope is His language for your future.' },
  { book: 45, chapter: 12, verse: 2, devotion: 'Renewal starts in the mind. Change what you dwell on and the shape of your life follows.' },
  { book: 19, chapter: 46, verse: 10, devotion: 'Some answers only come in stillness. Pause long enough today to remember who God is.' },
  { book: 55, chapter: 1, verse: 7, devotion: 'You were not designed for fear. God gives power, love, and a sound mind — live from that supply.' },
  { book: 19, chapter: 119, verse: 105, devotion: 'One step of light is enough. God rarely shows the whole road — just the next step.' },
  { book: 23, chapter: 40, verse: 31, devotion: 'Waiting on God is not wasted time; it is where strength is quietly exchanged for weariness.' },
  { book: 40, chapter: 6, verse: 33, devotion: 'Order matters: seek the King first, and the other things find their rightful place.' },
  { book: 46, chapter: 13, verse: 4, devotion: 'Real love is patient before it is loud. Today, love people at their pace, not yours.' },
  { book: 48, chapter: 5, verse: 22, devotion: 'The Spirit grows what no effort can manufacture — let His fruit ripen in your ordinary days.' },
  { book: 58, chapter: 11, verse: 1, devotion: 'Faith is confidence before confirmation — resting on God’s character when evidence runs thin.' },
  { book: 59, chapter: 1, verse: 5, devotion: 'God is generous with wisdom and never annoyed by the asking. Bring today’s decisions to Him.' },
  { book: 19, chapter: 34, verse: 8, devotion: 'Happiness fades; blessedness deepens. Take refuge in God and taste the difference.' },
  { book: 45, chapter: 5, verse: 8, devotion: 'God proved His love while you were still unlovely. You never had to earn the rescue.' },
  { book: 23, chapter: 26, verse: 3, devotion: 'A steadfast mind is a kept heart — God guards the person who trusts Him completely.' },
  { book: 60, chapter: 5, verse: 7, devotion: 'You can offload what you were never meant to carry. He cares for you — personally.' },
  { book: 19, chapter: 27, verse: 1, devotion: 'Light, salvation, and a stronghold — three names for the same refuge when trouble comes.' },
  { book: 20, chapter: 16, verse: 3, devotion: 'Commit your plans to God first, and He aligns your steps with His purpose.' },
  { book: 43, chapter: 1, verse: 1, devotion: 'Before anything else existed, the Word already was. Your story starts in a bigger story.' },
  { book: 43, chapter: 14, verse: 6, devotion: 'Jesus did not claim to know a way — He claimed to be the way. Follow the Person, not just the path.' },
  { book: 43, chapter: 8, verse: 12, devotion: 'When Jesus is your light, darkness becomes a place you pass through, not a place you live.' },
  { book: 40, chapter: 5, verse: 16, devotion: 'Your quiet goodness can be a public gift. Live so that people thank God for knowing you.' },
  { book: 40, chapter: 6, verse: 34, devotion: 'Today has enough weight of its own. God supplies daily bread — take one day at a time.' },
  { book: 44, chapter: 1, verse: 8, devotion: 'The mission runs on God’s power, not your confidence. He equips the witnesses He calls.' },
  { book: 45, chapter: 10, verse: 9, devotion: 'Salvation is not a ladder you climb; it is a confession you make from the heart.' },
  { book: 45, chapter: 6, verse: 23, devotion: 'Sin earns; grace gives. Eternal life is a gift — which means it can never be a wage.' },
  { book: 62, chapter: 4, verse: 19, devotion: 'You did not initiate this love — you responded to it. He loved first, and still does.' },
  { book: 18, chapter: 19, verse: 25, devotion: 'Even from the ash heap, Job confessed a living Redeemer. Hope survives the worst chapters.' },
  { book: 19, chapter: 121, verse: 1, devotion: 'Help comes from the Maker of everything — the hills are just His delivery address.' },
  { book: 21, chapter: 3, verse: 1, devotion: 'Every season has an Author. What feels like loss may be a chapter turning.' },
  { book: 20, chapter: 17, verse: 17, devotion: 'A friend loves at all times — including the unimpressive, inconvenient ones.' },
  { book: 2, chapter: 14, verse: 14, devotion: 'Some battles are won by standing still. The Lord fights for you; hold your peace.' },
  { book: 5, chapter: 31, verse: 6, devotion: 'He who called you forward will never fail you at the crossing. Be strong.' },
  { book: 16, chapter: 8, verse: 10, devotion: 'Joy is not the absence of trouble — it is the presence of the Lord as your strength.' },
  { book: 17, chapter: 4, verse: 14, devotion: 'You are where you are “for such a time as this.” Your position has a purpose.' },
  { book: 25, chapter: 3, verse: 23, devotion: 'His mercies are not leftovers from yesterday. Every morning is a fresh delivery.' },
  { book: 33, chapter: 6, verse: 8, devotion: 'The whole of faith in three moves: act justly, love mercy, walk humbly.' },
  { book: 36, chapter: 3, verse: 17, devotion: 'God is not merely with you — He rejoices over you with singing. You are His delight.' },
  { book: 39, chapter: 4, verse: 2, devotion: 'The Sun of righteousness rises with healing in His rays — morning always wins.' },
  { book: 47, chapter: 5, verse: 17, devotion: 'In Christ you are not an improved you — you are an entirely new creation.' },
  { book: 47, chapter: 4, verse: 16, devotion: 'Outward things decay, but the inner self can be renewed every single day.' },
  { book: 49, chapter: 2, verse: 10, devotion: 'You are God’s handiwork — His workmanship, made on purpose, for purpose.' },
  { book: 49, chapter: 4, verse: 32, devotion: 'You have been forgiven an ocean; forgive others their cupfuls with kindness.' },
  { book: 51, chapter: 3, verse: 23, devotion: 'Whatever your hand finds today — do it heartily, as working for the Lord Himself.' },
  { book: 52, chapter: 5, verse: 16, devotion: 'Joy is a command disguised as a gift. Choose rejoicing, always, again.' },
  { book: 52, chapter: 5, verse: 17, devotion: 'Prayer was never meant to be an appointment — keep the line open all day.' },
  { book: 54, chapter: 4, verse: 12, devotion: 'Young or old, your life can preach. Be the example before you give the advice.' },
  { book: 58, chapter: 13, verse: 8, devotion: 'Everything around you changes; Jesus does not. Anchor to what never moves.' },
  { book: 59, chapter: 1, verse: 22, devotion: 'Hearing without doing is like reading directions without traveling. Be a doer today.' },
  { book: 60, chapter: 2, verse: 9, devotion: 'You were called out of darkness to display His light — royalty with a message.' },
  { book: 62, chapter: 1, verse: 9, devotion: 'Confession does not inform God — it heals you. He is faithful to forgive, every time.' },
  { book: 62, chapter: 4, verse: 18, devotion: 'Perfect love expels fear the way light expels darkness. Let His love finish its work.' },
  { book: 65, chapter: 1, verse: 24, devotion: 'He is able to keep you from stumbling — and present you faultless with exceeding joy.' },
  { book: 4, chapter: 6, verse: 24, devotion: 'The oldest blessing in Scripture is yours to live under today — kept, blessed, at peace.' },
  { book: 8, chapter: 1, verse: 16, devotion: 'Ruth’s loyalty rewrote a family’s story. Your faithfulness today writes tomorrows.' },
  { book: 9, chapter: 16, verse: 7, devotion: 'People judge the outside; God searches the heart. Aim to be beautiful where it counts.' },
  { book: 11, chapter: 19, verse: 12, devotion: 'God sometimes speaks loudest in the whisper. Quiet yourself enough to hear it.' },
  { book: 13, chapter: 16, verse: 11, devotion: 'Seek His strength along with His face — worship and help come from the same place.' },
  { book: 14, chapter: 7, verse: 14, devotion: 'Revival has always started small: humble people praying, and God hearing.' },
  { book: 23, chapter: 55, verse: 11, devotion: 'God’s Word never returns empty. What He sends out, He accomplishes.' },
  { book: 24, chapter: 33, verse: 3, devotion: 'Call to Him for what you cannot figure out — He answers with things you do not know.' },
  { book: 26, chapter: 36, verse: 26, devotion: 'God specializes in heart transplants — He can soften what life has hardened.' },
  { book: 38, chapter: 4, verse: 6, devotion: 'Not by might, not by power — the mountain moves by His Spirit. Rest in that.' },
  { book: 35, chapter: 3, verse: 19, devotion: 'When your legs give out, He becomes your strength — walking you onto the high places.' },
  { book: 19, chapter: 37, verse: 4, devotion: 'Delight yourself in God first, and desire and provision start to rhyme.' },
  { book: 19, chapter: 51, verse: 10, devotion: 'A clean heart is God’s creation, not your project. Ask Him to create it in you.' },
  { book: 19, chapter: 91, verse: 1, devotion: 'The secret place of the Most High — an address you can live at, hidden in His shadow.' },
  { book: 19, chapter: 139, verse: 14, devotion: 'You are not an accident of chemistry. You were fearfully and wonderfully made.' },
  { book: 23, chapter: 53, verse: 5, devotion: 'Healing, peace, and wholeness were purchased together — by His wounds.' },
  { book: 66, chapter: 21, verse: 4, devotion: 'Every tear has an expiration date. God Himself will wipe them away.' },
  { book: 66, chapter: 1, verse: 3, devotion: 'There is a blessing attached to reading and keeping His words — happy are the readers.' },
  { book: 40, chapter: 28, verse: 20, devotion: 'The Great Commission ends with a greater promise: “I am with you always.”' },
  { book: 42, chapter: 6, verse: 31, devotion: 'The golden rule is short enough to memorize and long enough to fill a lifetime.' },
  { book: 42, chapter: 1, verse: 37, devotion: '“Nothing shall be impossible” — the size of your God, not the size of your problem.' },
  { book: 44, chapter: 16, verse: 31, devotion: 'Salvation came to a whole house through one believing heart. Yours can carry others too.' },
  { book: 45, chapter: 15, verse: 13, devotion: 'Hope overflows by the Spirit’s power, not positive thinking. Ask Him to fill you with joy.' },
  { book: 46, chapter: 10, verse: 13, devotion: 'No temptation is tailor-made to defeat you — God always builds in an exit.' },
  { book: 48, chapter: 6, verse: 9, devotion: 'Do not quit in the field. Harvests come to those who keep sowing.' },
  { book: 49, chapter: 6, verse: 10, devotion: 'Strength for the fight is borrowed from the Lord — be strong in His might, not yours.' },
  { book: 50, chapter: 1, verse: 6, devotion: 'God finishes what He starts. The good work in you will be completed.' },
  { book: 58, chapter: 4, verse: 12, devotion: 'The Word is alive — cutting where nothing else reaches, discerning what nothing else sees.' },
  { book: 61, chapter: 3, verse: 9, devotion: 'God is patient because He is unwilling that any should perish — patience is love waiting.' },
  { book: 47, chapter: 9, verse: 8, devotion: 'Grace is God’s arithmetic: a cheerful giver reaps generously beyond the math.' },
  { book: 27, chapter: 12, verse: 3, devotion: 'The wise will shine like stars — brightness earned in dark places.' },
]

/* Deterministic rotation --------------------------------------------------- */

/** Local calendar day number (days since 1970-01-01, local time). */
export function dayNumber(date = new Date()): number {
  const local = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.floor(local / 86400000)
}

/** 'YYYY-MM-DD' for a date in local time. */
export function dateKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function dateFromKey(key: string): Date | null {
  const m = key.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return isNaN(d.getTime()) ? null : d
}

/** A seeded shuffle so the rotation order is stable across app versions. */
function shuffledOrder(length: number): number[] {
  const order = Array.from({ length }, (_, i) => i)
  // Mulberry32 with a fixed seed keeps the order deterministic.
  let seed = 0x4c494748
  const rand = () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

const ORDER = shuffledOrder(DAILY_VERSES.length)

/** The verse for a given day number — stable all day long. */
export function dailyVerseForDay(day: number): DailyVerse {
  const idx = ((day % ORDER.length) + ORDER.length) % ORDER.length
  return DAILY_VERSES[ORDER[idx]]
}

export function dailyVerseForDate(date = new Date()): DailyVerse {
  return dailyVerseForDay(dayNumber(date))
}

export function dailyVerseForDateKey(key: string): DailyVerse | null {
  const d = dateFromKey(key)
  return d ? dailyVerseForDay(dayNumber(d)) : null
}

/** Reference label like "John 3:16" for a daily verse. */
export function dailyRef(v: DailyVerse, index: BibleIndex | null): string {
  const meta = index?.books.find((b) => b.id === v.book)
  return `${meta ? meta.name : `Book ${v.book}`} ${v.chapter}:${v.verse}`
}
