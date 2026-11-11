import { useToast } from '@/state/toast'

export function Toasts() {
  const { toasts } = useToast()
  if (!toasts.length) return null
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span>{t.message}</span>
          {t.action && (
            <button
              onClick={() => {
                t.action!.onClick()
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
