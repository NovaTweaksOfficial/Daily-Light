import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, ChevronRight, RotateCcw, Trash2, Play } from 'lucide-react'
import { loadIndex } from '@/lib/bible'
import { currentDayIndex, dayLabel, planDaysFor, percentComplete } from '@/lib/plans'
import { usePlans } from '@/state/plans'
import { useToast } from '@/state/toast'
import type { BibleIndex } from '@/types'
import { PageHeader, ProgressRing, Spinner, Button, EmptyState } from '@/components/ui'

export default function PlanDetailView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [index, setIndex] = useState<BibleIndex | null>(null)
  const { ready, plans, markDayComplete, uncompleteDay, deletePlan, restartPlan } = usePlans()
  const { toast } = useToast()
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    let alive = true
    loadIndex().then((idx) => alive && setIndex(idx))
    return () => {
      alive = false
    }
  }, [])

  const plan = plans.find((p) => p.id === id) ?? null
  const days = useMemo(() => (plan && index ? planDaysFor(index, plan) : []), [plan, index])

  if (!ready || !index) {
    return (
      <div className="view">
        <PageHeader title="Plan" back={{ to: '/plans', label: 'Back to plans' }} />
        <div className="loading-block">
          <Spinner />
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="view">
        <PageHeader title="Plan" back={{ to: '/plans', label: 'Back to plans' }} />
        <EmptyState icon={<Trash2 size={22} />} title="That plan is gone" text="It may have been deleted." />
      </div>
    )
  }

  const cur = currentDayIndex(plan)
  const pct = percentComplete(plan, days.length || 1)
  const done = new Set(plan.completedDays)
  const complete = cur >= days.length
  const today = days[cur]?.passages[0]

  return (
    <div className="view plan-detail">
      <PageHeader title={plan.name} back={{ to: '/plans', label: 'All plans' }} />

      <div className="plan-detail-hero card">
        <ProgressRing progress={pct} size={84} stroke={8}>
          <strong>{pct}%</strong>
        </ProgressRing>
        <div className="plan-detail-copy">
          <strong>
            {complete ? 'Plan complete — well done!' : `Day ${cur + 1} of ${days.length}`}
          </strong>
          <span>
            {plan.completedDays.length} of {days.length} days finished
          </span>
          {today && !complete && (
            <Link
              to={`/read/${today.book}/${today.chapter}?plan=${plan.id}&day=${cur}`}
              className="btn btn-primary btn-md plan-detail-cta"
            >
              <Play size={15} /> Continue day {cur + 1}
            </Link>
          )}
          {complete && (
            <Button variant="soft" onClick={() => { restartPlan(plan.id); toast('Plan restarted from day 1') }}>
              <RotateCcw size={15} /> Restart
            </Button>
          )}
        </div>
      </div>

      <div className="day-list">
        {days.map((day, i) => {
          const isDone = done.has(i)
          const isCurrent = i === cur && !complete
          return (
            <div key={i} className={`day-row ${isCurrent ? 'current' : ''} ${isDone ? 'done' : ''}`}>
              <button
                className={`day-check ${isDone ? 'on' : ''}`}
                aria-label={isDone ? `Undo day ${i + 1}` : `Mark day ${i + 1} complete`}
                onClick={() => (isDone ? uncompleteDay(plan.id, i) : markDayComplete(plan.id, i))}
              >
                {isDone && <Check size={14} />}
              </button>
              <Link to={`/read/${day.passages[0].book}/${day.passages[0].chapter}?plan=${plan.id}&day=${i}`} className="day-copy">
                <span className="day-num">Day {i + 1}</span>
                <span className="day-passages">{dayLabel(index, day)}</span>
              </Link>
              {isCurrent && <span className="day-current-tag">Now</span>}
              <ChevronRight size={15} className="day-chev" aria-hidden />
            </div>
          )
        })}
      </div>

      <div className="plan-detail-actions">
        {!complete && (
          <Button
            variant="soft"
            onClick={() => {
              restartPlan(plan.id)
              toast('Progress cleared — starting fresh')
            }}
          >
            <RotateCcw size={15} /> Restart plan
          </Button>
        )}
        {confirmDelete ? (
          <>
            <Button
              variant="danger"
              onClick={() => {
                deletePlan(plan.id)
                navigate('/plans')
                toast('Plan deleted')
              }}
            >
              <Trash2 size={15} /> Delete for good
            </Button>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Keep it
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={15} /> Delete plan
          </Button>
        )}
      </div>
    </div>
  )
}
