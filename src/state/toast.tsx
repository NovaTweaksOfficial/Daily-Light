import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

export interface Toast {
  id: number
  message: string
  action?: { label: string; onClick: () => void }
}

interface ToastCtx {
  toasts: Toast[]
  toast: (message: string, action?: Toast['action']) => void
}

const Ctx = createContext<ToastCtx | null>(null)
let nextId = 1

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const t = timers.current.get(id)
    if (t) clearTimeout(t)
    timers.current.delete(id)
  }, [])

  const toast = useCallback(
    (message: string, action?: Toast['action']) => {
      const id = nextId++
      setToasts((prev) => [...prev.slice(-2), { id, message, action }])
      const timer = setTimeout(() => dismiss(id), 4000)
      timers.current.set(id, timer)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toasts, toast }), [toasts, toast])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
