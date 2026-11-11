import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, ListChecks, ChevronRight, Sparkles, RotateCcw } from 'lucide-react'
import { loadIndex } from '@/lib/bible'
import { PLAN_DEFS, currentDayIndex, dayLabel, planDaysFor, percentComplete } from '@/lib/plans'
import { usePlans } from '@/state/plans'
import { useToast } from '@/state/toast'
import type { BibleIndex, PlanState } from '@/types'
import { PageHeader, ProgressRing, Button, Sheet } from '@/components/ui'

export default function PlansView() {
  const [index, setIndex] = useState<BibleIndex | null>(null)
  const { plans, startPlan, createCustomPlan } = usePlans()
  const { toast } = useToast()
  const [builderOpen, setBuilderOpen] = useState(false)

  useEffect(() => {
    let alive = true
    loadIndex().then((idx) => alive && setIndex(idx))
    return () => {
      alive = false
    }
  }, [])

  const activePlans = plans

  const onStart = async (defId: string) => {
    const plan = await startPlan(defId)
    toast(`${plan.name} started — day 1 is ready`)
  }

  return (
    <div className="view plans-view">
      <PageHeader
        title="Plans"
        subtitle="Structured reading with streaks"
        actions={
          <Button variant="soft" onClick={() => setBuilderOpen(true)}>
            <Plus size={16} />
            Custom
          </Button>
        }
      />

      {/* Active plans */}
      {activePlans.length > 0 && (
        <section className="home-section">
          <div className="home-head-row">
            <h2>Your plans</h2>
          </div>
          <div className="plan-cards">
            {activePlans.map((plan) => (
              <ActivePlanCard key={plan.id} plan={plan} index={index} />
            ))}
          </div>
        </section>
      )}

      {/* Built-in plans */}
      <section className="home-section">
        <div className="home-head-row">
          <h2>{activePlans.length ? 'Start another' : 'Start a plan'}</h2>
        </div>
        <div className="plan-offers">
          {PLAN_DEFS.map((def) => {
            const active = plans.find((p) => p.defId === def.id && !p.custom)
            if (active) {
              return (
                <Link key={def.id} to={`/plans/${active.id}`} className="plan-offer card active">
                  <div className="plan-offer-copy">
                    <strong>{def.name}</strong>
                    <span>{def.description}</span>
                  </div>
                  <span className="plan-offer-tag">Active</span>
                  <ChevronRight size={16} aria-hidden />
                </Link>
              )
            }
            return (
              <div key={def.id} className="plan-offer card">
                <div className="plan-offer-copy">
                  <strong>{def.name}</strong>
                  <span>{def.description}</span>
                  <span className="plan-offer-days">{def.days} days</span>
                </div>
                <Button variant="soft" onClick={() => void onStart(def.id)}>
                  <Sparkles size={15} />
                  Start
                </Button>
              </div>
            )
          })}
        </div>
      </section>

      {index && (
        <CustomPlanSheet
          open={builderOpen}
          index={index}
          onClose={() => setBuilderOpen(false)}
          onCreate={async (name, books, days) => {
            const plan = await createCustomPlan(name, books, days)
            setBuilderOpen(false)
            toast(`${plan.name} created`)
          }}
        />
      )}
    </div>
  )
}

function ActivePlanCard({ plan, index }: { plan: PlanState; index: BibleIndex | null }) {
  const navigate = useNavigate()
  const days = useMemo(() => (index ? planDaysFor(index, plan) : []), [index, plan])
  const cur = currentDayIndex(plan)
  const pct = percentComplete(plan, days.length || 1)
  const dayLabelStr = index && days[cur] ? dayLabel(index, days[cur]) : '…'
  const first = days[cur]?.passages[0]
  const complete = days.length > 0 && cur >= days.length

  return (
    <Link to={`/plans/${plan.id}`} className="plan-card card">
      <ProgressRing progress={pct} size={56} stroke={5.5}>
        <strong>{pct}%</strong>
      </ProgressRing>
      <div className="plan-card-copy">
        <strong>{plan.name}</strong>
        <span>
          {complete
            ? `All ${days.length} days complete`
            : `Day ${cur + 1} of ${days.length} · ${dayLabelStr}`}
        </span>
        {first && !complete && (
          <span
            className="plan-card-continue"
            onClick={(e) => {
              e.preventDefault()
              navigate(`/read/${first.book}/${first.chapter}?plan=${plan.id}&day=${cur}`)
            }}
          >
            <RotateCcw size={13} /> Continue reading
          </span>
        )}
        {complete && (
          <span className="plan-card-continue">
            <ListChecks size={13} /> Review or restart
          </span>
        )}
      </div>
      <ChevronRight size={16} className="plan-card-chev" aria-hidden />
    </Link>
  )
}

/* Custom plan builder --------------------------------------------------------- */

function CustomPlanSheet({
  open,
  index,
  onClose,
  onCreate,
}: {
  open: boolean
  index: BibleIndex
  onClose: () => void
  onCreate: (name: string, books: number[], days: number) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [days, setDays] = useState(30)
  const [busy, setBusy] = useState(false)

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const chapterCount = useMemo(() => {
    let n = 0
    for (const id of selected) n += index.books.find((b) => b.id === id)?.chapters ?? 0
    return n
  }, [selected, index])

  const valid = selected.size > 0 && days >= 1 && days <= 365 && chapterCount > 0

  return (
    <Sheet open={open} onClose={onClose} title="Build a custom plan">
      <label className="field">
        <span>Plan name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Prophets in the fall"
          maxLength={60}
        />
      </label>

      <div className="field">
        <span>Books ({selected.size} selected · {chapterCount} chapters)</span>
        <div className="builder-books">
          {(['OT', 'NT'] as const).map((t) => (
            <div key={t}>
              <p className="builder-testament">{t === 'OT' ? 'Old Testament' : 'New Testament'}</p>
              <div className="builder-grid">
                {index.books
                  .filter((b) => b.testament === t)
                  .map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      className={`builder-book ${selected.has(b.id) ? 'on' : ''}`}
                      onClick={() => toggle(b.id)}
                      aria-pressed={selected.has(b.id)}
                    >
                      {b.abbr}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <label className="field">
        <span>Days: {days}</span>
        <input
          type="range"
          min={Math.max(1, Math.min(chapterCount || 1, 30))}
          max={Math.max(chapterCount, 30)}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          disabled={selected.size === 0}
        />
        <span className="field-hint">
          {selected.size === 0
            ? 'Pick at least one book to choose a length.'
            : `About ${Math.max(1, Math.round(chapterCount / days))} chapter${chapterCount / days > 1.5 ? 's' : ''} per day`}
        </span>
      </label>

      <Button
        disabled={!valid || busy}
        onClick={async () => {
          setBusy(true)
          try {
            await onCreate(name, [...selected], days)
          } finally {
            setBusy(false)
          }
        }}
      >
        {busy ? 'Creating…' : 'Create plan'}
      </Button>
    </Sheet>
  )
}
