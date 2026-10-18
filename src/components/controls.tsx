import { ArrowLeft, Bookmark, Compass, FlaskConical, Luggage, User, X } from 'lucide-react'
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { formatTHB } from '../lib/format'
import { navigate } from '../lib/router'
import { useToast } from '../state/store'
import { BottomSheet } from './BottomSheet'
import { cx, IconButton, inputClass } from './ui'

// ── Budget field ───────────────────────────────────────────────

export function BudgetField({
  id, value, onChange, error, presets = [6000, 9000, 12000],
}: { id: string; value: number | null; onChange: (v: number | null) => void; error?: string; presets?: number[] }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-small font-semibold">
        Budget per person
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-body font-semibold text-ink-muted" aria-hidden>
          ฿
        </span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          placeholder="e.g. 9,000"
          aria-invalid={!!error}
          aria-describedby={`${id}-scope ${error ? `${id}-error` : ''}`}
          value={value === null ? '' : value.toLocaleString('en-GB')}
          onChange={(e) => {
            const digits = e.target.value.replace(/[^\d]/g, '')
            onChange(digits ? Math.min(Number(digits), 10_000_000) : null)
          }}
          className={cx(inputClass(!!error), 'pr-14 pl-8')}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-small font-semibold text-ink-subtle">THB</span>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Budget suggestions">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-pressed={value === p}
            className={cx(
              'min-h-11 rounded-chip border px-3 text-small font-medium',
              value === p ? 'border-primary bg-primary-soft text-primary-ink' : 'border-line-strong bg-surface',
            )}
          >
            {formatTHB(p)}
          </button>
        ))}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-small text-danger" role="alert">
          {error}
        </p>
      )}
      <div id={`${id}-scope`} className="rounded-control bg-surface-sunken p-3 text-small text-ink-muted">
        <p>
          <strong className="text-ink">Per person, whole trip.</strong> Covers activities and entry fees, food, and local transport.
        </p>
        <p className="mt-1">
          <strong className="text-ink">Not included:</strong> flights, accommodation and shopping.
        </p>
      </div>
    </div>
  )
}

// ── Day selector (tabs) ────────────────────────────────────────

export function DaySelector({
  days, value, onChange, controls,
}: { days: { label: string; sub?: string }[]; value: number; onChange: (i: number) => void; controls: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent, i: number) => {
    let next = i
    if (e.key === 'ArrowRight') next = (i + 1) % days.length
    else if (e.key === 'ArrowLeft') next = (i - 1 + days.length) % days.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = days.length - 1
    else return
    e.preventDefault()
    onChange(next)
    refs.current[next]?.focus()
  }
  return (
    <div role="tablist" aria-label="Trip days" className="flex gap-2">
      {days.map((d, i) => (
        <button
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="button"
          role="tab"
          id={`day-tab-${i}`}
          aria-selected={value === i}
          aria-controls={controls}
          tabIndex={value === i ? 0 : -1}
          onClick={() => onChange(i)}
          onKeyDown={(e) => onKey(e, i)}
          className={cx(
            'flex min-h-14 flex-1 flex-col items-center justify-center rounded-tile border px-2 py-1.5 transition-colors',
            value === i ? 'border-primary bg-primary text-ink-inverse' : 'border-line bg-surface text-ink hover:border-line-strong',
          )}
        >
          <span className="text-body font-bold">{d.label}</span>
          {d.sub && <span className={cx('text-micro font-medium', value === i ? 'text-ink-inverse/85' : 'text-ink-subtle')}>{d.sub}</span>}
        </button>
      ))}
    </div>
  )
}

// ── Navigation ─────────────────────────────────────────────────

const NAV = [
  { id: 'discover', label: 'Discover', icon: Compass, to: '/discover' },
  { id: 'saved', label: 'Saved', icon: Bookmark, to: '/saved' },
  { id: 'trips', label: 'My trips', icon: Luggage, to: '/trips' },
  { id: 'profile', label: 'Profile', icon: User, to: '/profile' },
] as const

export type NavId = (typeof NAV)[number]['id']

export function BottomNav({ active }: { active: NavId | null }) {
  return (
    <nav
      aria-label="Main"
      className="fixed-column z-40 px-3"
      style={{ bottom: 'calc(12px + env(safe-area-inset-bottom))' }}
    >
      <ul className="flex h-[var(--nav-height)] items-center gap-1 rounded-[24px] border border-line bg-surface p-1.5 shadow-float">
        {NAV.map((n) => {
          const on = active === n.id
          const Icon = n.icon
          return (
            <li key={n.id} className="h-full flex-1">
              <a
                href={`#${n.to}`}
                aria-current={on ? 'page' : undefined}
                className={cx(
                  'flex h-full flex-col items-center justify-center gap-0.5 rounded-[18px] text-micro font-semibold transition-colors',
                  on ? 'bg-ink text-ink-inverse' : 'text-ink-subtle hover:text-ink',
                )}
              >
                <Icon size={20} aria-hidden strokeWidth={on ? 2.3 : 1.8} className={on ? 'text-lime' : undefined} />
                {n.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function DemoBadge({ compact }: { compact?: boolean } = {}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="About this demo: sample travel data"
        className={cx(
          'inline-flex min-h-11 items-center gap-1.5 rounded-chip text-micro font-semibold text-ink-muted hover:text-ink',
          compact ? 'px-2' : 'border border-line bg-surface px-3',
        )}
      >
        <FlaskConical size={13} aria-hidden /> {compact ? 'Demo' : 'Demo · sample data'}
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="About this demo">
        <div className="flex flex-col gap-3 text-body text-ink-muted">
          <p>
            Roam is a product design prototype. Plans are made by fixed planning rules over a small set of sample Bangkok places. No AI service, map
            provider or booking system is connected.
          </p>
          <p>Prices (in THB), visit durations, opening hours, travel times and the map are illustrative estimates. Verify opening hours, prices and reservations before you travel.</p>
          <p>Your trips and saved places are stored only in this browser.</p>
          <a href="#/demo" onClick={() => setOpen(false)} className="text-small font-semibold text-primary-ink underline">
            Open demo states
          </a>
        </div>
      </BottomSheet>
    </>
  )
}

export function TopBar({
  title, back, actions, subtitle, large,
}: { title?: string; back?: string | (() => void); actions?: ReactNode; subtitle?: ReactNode; large?: boolean }) {
  return (
    <header className="screen-topbar safe-top px-5 pt-2">
      <div className="flex min-h-11 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          {back && (
            <IconButton
              icon={ArrowLeft}
              label="Back"
              className="-ml-2"
              onClick={() => (typeof back === 'string' ? navigate(back) : back())}
            />
          )}
          {!large && title && <h1 className="truncate text-heading font-bold">{title}</h1>}
        </div>
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      </div>
      {large && title && <h1 className="mt-1 text-display font-extrabold">{title}</h1>}
      {subtitle && <div className="mt-1 text-small text-ink-muted">{subtitle}</div>}
    </header>
  )
}

// ── Toast host ─────────────────────────────────────────────────

const TOAST_BOTTOM = {
  none: 'calc(16px + env(safe-area-inset-bottom))',
  action: 'calc(92px + env(safe-area-inset-bottom))',
  nav: 'calc(var(--nav-offset) + 12px + env(safe-area-inset-bottom))',
  'nav-action': 'calc(var(--nav-offset) + 84px + env(safe-area-inset-bottom))',
}

/** Toasts sit above whichever fixed bars the current screen shows. */
export function ToastHost({ offset }: { offset: keyof typeof TOAST_BOTTOM }) {
  const { toast, dismiss } = useToast()
  return (
    <div
      className="fixed-column pointer-events-none z-[60] px-5"
      style={{ bottom: TOAST_BOTTOM[offset] }}
      aria-live="polite"
      role="status"
    >
      {toast && (
        <div
          key={toast.id}
          className={cx(
            'anim-sheet pointer-events-auto flex items-center gap-2 rounded-tile px-4 py-1.5 text-small text-ink-inverse shadow-raised',
            toast.tone === 'error' ? 'bg-danger' : 'bg-ink',
          )}
        >
          <p className="min-w-0 flex-1 py-1.5">{toast.message}</p>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                const { onAction } = toast.action!
                dismiss()
                onAction()
              }}
              className="min-h-11 rounded-control px-3 font-semibold text-lime underline-offset-2 hover:underline"
            >
              {toast.action.label}
            </button>
          )}
          <button type="button" onClick={dismiss} aria-label="Dismiss" className="inline-flex size-11 items-center justify-center rounded-full">
            <X size={16} aria-hidden />
          </button>
        </div>
      )}
    </div>
  )
}
