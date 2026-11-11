import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { CustomPlanDef, PlanState } from '@/types'
import { dbDelete, dbGetAll, dbSet } from '@/lib/storage'
import { planDefById } from '@/lib/plans'

interface PlansCtx {
  ready: boolean
  plans: PlanState[]

  startPlan: (defId: string) => Promise<PlanState>
  createCustomPlan: (name: string, books: number[], days: number) => Promise<PlanState>
  markDayComplete: (id: string, day: number) => void
  uncompleteDay: (id: string, day: number) => void
  deletePlan: (id: string) => void
  restartPlan: (id: string) => void
}

const Ctx = createContext<PlansCtx | null>(null)

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function PlansProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [plans, setPlans] = useState<PlanState[]>([])

  useEffect(() => {
    let alive = true
    dbGetAll<PlanState>('plans').then((all) => {
      if (!alive) return
      setPlans(all.sort((a, b) => b.lastActivity - a.lastActivity))
      setReady(true)
    })
    return () => {
      alive = false
    }
  }, [])

  const put = useCallback((next: PlanState[]) => {
    setPlans(next.sort((a, b) => b.lastActivity - a.lastActivity))
  }, [])

  const persist = useCallback((plan: PlanState) => {
    dbSet('plans', plan.id, plan).catch(() => undefined)
  }, [])

  const startPlan = useCallback(
    async (defId: string): Promise<PlanState> => {
      const def = planDefById(defId)
      if (!def) throw new Error(`Unknown plan: ${defId}`)
      const existing = plans.find((p) => p.defId === defId && !p.custom)
      if (existing) return existing
      const plan: PlanState = {
        id: newId(),
        defId,
        name: def.name,
        startedAt: Date.now(),
        lastActivity: Date.now(),
        completedDays: [],
      }
      put([plan, ...plans])
      persist(plan)
      return plan
    },
    [plans, put, persist],
  )

  const createCustomPlan = useCallback(
    async (name: string, books: number[], days: number): Promise<PlanState> => {
      const def: CustomPlanDef = {
        id: `custom-${newId()}`,
        name: name.trim() || 'My reading plan',
        description: 'A custom plan built from your selected books.',
        days,
        scope: 'custom',
        books: [...books].sort((a, b) => a - b),
      }
      const plan: PlanState = {
        id: newId(),
        defId: def.id,
        name: def.name,
        startedAt: Date.now(),
        lastActivity: Date.now(),
        completedDays: [],
        custom: def,
      }
      put([plan, ...plans])
      persist(plan)
      return plan
    },
    [plans, put, persist],
  )

  const markDayComplete = useCallback(
    (id: string, day: number) => {
      setPlans((prev) =>
        prev.map((p) => {
          if (p.id !== id || p.completedDays.includes(day)) return p
          const next: PlanState = {
            ...p,
            completedDays: [...p.completedDays, day],
            lastActivity: Date.now(),
          }
          dbSet('plans', id, next).catch(() => undefined)
          return next
        }),
      )
    },
    [],
  )

  const uncompleteDay = useCallback((id: string, day: number) => {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== id || !p.completedDays.includes(day)) return p
        const next: PlanState = {
          ...p,
          completedDays: p.completedDays.filter((d) => d !== day),
          lastActivity: Date.now(),
        }
        dbSet('plans', id, next).catch(() => undefined)
        return next
      }),
    )
  }, [])

  const deletePlan = useCallback(
    (id: string) => {
      setPlans((prev) => prev.filter((p) => p.id !== id))
      dbDelete('plans', id).catch(() => undefined)
    },
    [],
  )

  const restartPlan = useCallback(
    (id: string) => {
      setPlans((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p
          const next: PlanState = { ...p, completedDays: [], startedAt: Date.now(), lastActivity: Date.now() }
          dbSet('plans', id, next).catch(() => undefined)
          return next
        }),
      )
    },
    [],
  )

  const value = useMemo<PlansCtx>(
    () => ({ ready, plans, startPlan, createCustomPlan, markDayComplete, uncompleteDay, deletePlan, restartPlan }),
    [ready, plans, startPlan, createCustomPlan, markDayComplete, uncompleteDay, deletePlan, restartPlan],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePlans(): PlansCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePlans must be used within PlansProvider')
  return ctx
}
