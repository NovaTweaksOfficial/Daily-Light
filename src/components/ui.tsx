import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

/* Button -------------------------------------------------------------------- */

type ButtonVariant = 'primary' | 'soft' | 'ghost' | 'danger' | 'outline'

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button className={`btn btn-${variant} btn-${size} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function IconButton({
  label,
  className = '',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button aria-label={label} title={label} className={`icon-btn ${className}`} {...props}>
      {children}
    </button>
  )
}

/* Card ---------------------------------------------------------------------- */

export function Card({ className = '', children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card ${className}`} {...rest}>
      {children}
    </div>
  )
}

/* Bottom sheet ---------------------------------------------------------------- */

export function Sheet({
  open,
  onClose,
  title,
  children,
  maxWidth,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  maxWidth?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="sheet-root" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet-backdrop" aria-hidden />
      <div className="sheet" role="dialog" aria-modal="true" ref={ref} style={maxWidth ? { maxWidth } : undefined}>
        <div className="sheet-grab" />
        {title && (
          <div className="sheet-head">
            <h3>{title}</h3>
            <IconButton label="Close" onClick={onClose}>
              <X size={18} />
            </IconButton>
          </div>
        )}
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}

/* Toggle ---------------------------------------------------------------------- */

export function Toggle({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  id?: string
}) {
  return (
    <label className="toggle" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden />
      <span className="toggle-label">{label}</span>
    </label>
  )
}

/* Segmented control ------------------------------------------------------------ */

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  className = '',
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={`segmented ${className}`} role="tablist">
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="tab"
          aria-selected={o.value === value}
          className={o.value === value ? 'seg active' : 'seg'}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* Progress ring ----------------------------------------------------------------- */

export function ProgressRing({
  progress,
  size = 64,
  stroke = 6,
  children,
}: {
  progress: number
  size?: number
  stroke?: number
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, progress))
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-bg" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="ring-fg"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-content">{children}</div>
    </div>
  )
}

/* Spinner ------------------------------------------------------------------------ */

export function Spinner({ size = 22 }: { size?: number }) {
  return (
    <span className="spinner" style={{ width: size, height: size }} role="status" aria-label="Loading">
      <svg viewBox="0 0 24 24" width={size} height={size}>
        <circle cx="12" cy="12" r="9" fill="none" strokeWidth="2.5" className="spinner-track" />
        <path d="M21 12a9 9 0 0 0-9-9" fill="none" strokeWidth="2.5" className="spinner-head" strokeLinecap="round" />
      </svg>
    </span>
  )
}

/* Empty state ---------------------------------------------------------------------- */

export function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text?: string }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
    </div>
  )
}

/* Page header ---------------------------------------------------------------------- */

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  back?: { to: string; label: string }
}) {
  return (
    <header className="page-head">
      <div className="page-head-row">
        {back ? (
          <a className="page-head-back" href={`#${back.to}`} aria-label={back.label}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </a>
        ) : null}
        <div className="page-head-titles">
          <h1>{title}</h1>
          {subtitle && <p className="page-head-sub">{subtitle}</p>}
        </div>
        {actions && <div className="page-head-actions">{actions}</div>}
      </div>
    </header>
  )
}
