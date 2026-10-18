import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from 'lucide-react'
import { forwardRef, useId, type ButtonHTMLAttributes, type ReactNode } from 'react'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

// ── Button ─────────────────────────────────────────────────────

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet' | 'lime' | 'ink'
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'md' | 'lg' | 'sm'
  icon?: LucideIcon
  iconRight?: LucideIcon
  block?: boolean
}

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-ink-inverse hover:bg-primary-hover disabled:bg-line-strong disabled:text-ink-inverse',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-surface-sunken',
  ghost: 'bg-transparent text-primary-ink hover:bg-primary-soft',
  quiet: 'bg-surface-sunken text-ink hover:bg-line',
  danger: 'bg-danger text-ink-inverse hover:opacity-90',
  lime: 'bg-lime text-ink hover:brightness-95 disabled:opacity-60',
  ink: 'bg-ink text-ink-inverse hover:bg-[#2a2d31] disabled:opacity-60',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight, block, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-chip font-bold transition-colors disabled:cursor-not-allowed',
        size === 'lg' && 'min-h-12 px-5 text-body',
        size === 'md' && 'min-h-11 px-4 text-body',
        size === 'sm' && 'min-h-11 px-3 text-small',
        block && 'w-full',
        variants[variant],
        className,
      )}
      {...rest}
    >
      {Icon && <Icon size={18} aria-hidden />}
      {children}
      {IconRight && <IconRight size={18} aria-hidden />}
    </button>
  )
})

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  label: string
  tone?: 'plain' | 'surface'
}

export function IconButton({ icon: Icon, label, tone = 'plain', className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink transition-colors',
        tone === 'surface' ? 'bg-surface shadow-card hover:bg-surface-sunken' : 'hover:bg-surface-sunken',
        className,
      )}
      {...rest}
    >
      <Icon size={20} aria-hidden />
    </button>
  )
}

// ── Banner ─────────────────────────────────────────────────────

const bannerTone = {
  info: { cls: 'bg-info-soft text-primary-ink', icon: Info, label: 'Note' },
  warning: { cls: 'bg-warning-soft text-warning', icon: AlertTriangle, label: 'Warning' },
  error: { cls: 'bg-danger-soft text-danger', icon: XCircle, label: 'Error' },
  success: { cls: 'bg-success-soft text-success', icon: CheckCircle2, label: 'Success' },
}

export function Banner({
  tone = 'info', title, children, action, role,
}: { tone?: keyof typeof bannerTone; title?: string; children?: ReactNode; action?: ReactNode; role?: 'status' | 'alert' }) {
  const t = bannerTone[tone]
  const Icon = t.icon
  return (
    <div role={role} className={cx('flex gap-3 rounded-card p-3 text-small', t.cls)}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-label={t.label} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-ink-muted [&_strong]:text-ink">{children}</div>}
        {action && <div className="mt-2 flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  )
}

// ── Chips ──────────────────────────────────────────────────────

export function Chip({
  selected, onClick, children, icon: Icon, count,
}: { selected: boolean; onClick: () => void; children: ReactNode; icon?: LucideIcon; count?: number }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-chip border px-4 text-small font-semibold transition-colors',
        selected ? 'border-ink bg-ink text-ink-inverse' : 'border-line bg-surface text-ink hover:border-line-strong',
      )}
    >
      {Icon && <Icon size={16} aria-hidden />}
      {children}
      {count !== undefined && <span className={selected ? 'text-ink-inverse/75' : 'text-ink-subtle'}>{count}</span>}
      {selected && <span className="sr-only">(selected)</span>}
    </button>
  )
}

export function Tag({ children, tone = 'neutral', icon: Icon }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'primary' | 'warning' | 'success' | 'lime'; icon?: LucideIcon }) {
  const tones = {
    neutral: 'bg-surface-sunken text-ink-muted',
    accent: 'bg-accent-soft text-accent-ink',
    primary: 'bg-primary-soft text-primary-ink',
    warning: 'bg-warning-soft text-warning',
    success: 'bg-success-soft text-success',
    lime: 'bg-lime text-ink',
  }
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-chip px-2 py-0.5 text-micro font-semibold', tones[tone])}>
      {Icon && <Icon size={12} aria-hidden />}
      {children}
    </span>
  )
}

// ── Form fields ────────────────────────────────────────────────

export function Field({
  label, helper, error, children, htmlFor, optional,
}: { label: string; helper?: ReactNode; error?: string; children: ReactNode; htmlFor: string; optional?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-small font-semibold text-ink">
        {label} {optional && <span className="font-normal text-ink-subtle">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="flex items-center gap-1 text-small text-danger" role="alert">
          <XCircle size={14} aria-hidden /> {error}
        </p>
      ) : helper ? (
        <p id={`${htmlFor}-help`} className="text-small text-ink-subtle">{helper}</p>
      ) : null}
    </div>
  )
}

export const inputClass = (invalid?: boolean) =>
  cx(
    'min-h-12 w-full rounded-control border bg-surface px-3 text-body text-ink placeholder:text-ink-subtle',
    invalid ? 'border-danger' : 'border-line-strong',
  )

export function Fieldset({ legend, helper, error, children }: { legend: string; helper?: ReactNode; error?: string; children: ReactNode }) {
  const id = useId()
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={`${id}-d`}>
      <legend className="mb-1 text-small font-semibold text-ink">{legend}</legend>
      {children}
      <div id={`${id}-d`}>
        {error ? (
          <p className="flex items-center gap-1 text-small text-danger" role="alert">
            <XCircle size={14} aria-hidden /> {error}
          </p>
        ) : helper ? (
          <p className="text-small text-ink-subtle">{helper}</p>
        ) : null}
      </div>
    </fieldset>
  )
}

/** Single-choice cards rendered as radio buttons. */
export function RadioCards<T extends string>({
  name, value, onChange, options,
}: { name: string; value: T; onChange: (v: T) => void; options: { value: T; label: string; detail?: string }[] }) {
  return (
    <div className="flex flex-col gap-2" role="radiogroup">
      {options.map((o) => (
        <label
          key={o.value}
          className={cx(
            'flex min-h-12 cursor-pointer items-start gap-3 rounded-control border bg-surface p-3 has-[:focus-visible]:shadow-[var(--focus-ring)]',
            value === o.value ? 'border-primary bg-primary-soft' : 'border-line-strong',
          )}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="mt-1 size-4 accent-[var(--color-primary)]"
          />
          <span>
            <span className="block text-body font-semibold">{o.label}</span>
            {o.detail && <span className="block text-small text-ink-muted">{o.detail}</span>}
          </span>
        </label>
      ))}
    </div>
  )
}

export function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId()
  return (
    <div className="flex min-h-12 items-center justify-between gap-3">
      <div>
        <p id={id} className="text-body font-semibold">{label}</p>
        {description && <p className="text-small text-ink-muted">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        onClick={() => onChange(!checked)}
        className="flex min-h-11 min-w-14 items-center justify-center rounded-chip"
      >
        <span className={cx('relative h-7 w-12 rounded-chip transition-colors', checked ? 'bg-primary' : 'bg-line-strong')}>
          <span className={cx('absolute top-1 size-5 rounded-full bg-surface shadow-card transition-all', checked ? 'left-6' : 'left-1')} />
        </span>
        <span className="sr-only">{checked ? 'On' : 'Off'}</span>
      </button>
    </div>
  )
}

export function Segmented<T extends string>({
  label, value, onChange, options,
}: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string; icon?: LucideIcon }[] }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-chip border border-line bg-surface p-1">
      {options.map((o) => {
        const Icon = o.icon
        const on = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cx(
              'inline-flex min-h-9 items-center gap-1.5 rounded-chip px-3 text-small font-semibold',
              on ? 'bg-ink text-ink-inverse' : 'text-ink-muted hover:text-ink',
            )}
          >
            {Icon && <Icon size={16} aria-hidden />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Layout helpers ─────────────────────────────────────────────

export function Section({ title, action, children, id }: { title: string; action?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id={id} className="text-title font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-card bg-surface p-4 shadow-card', className)}>{children}</div>
}

export function EmptyState({
  icon: Icon, title, children, action, headingLevel = 2,
}: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode; headingLevel?: 1 | 2 }) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line-strong bg-surface px-6 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-sunken text-ink-muted">
        <Icon size={22} aria-hidden />
      </span>
      <Heading className="text-heading font-semibold">{title}</Heading>
      {children && <div className="text-small text-ink-muted">{children}</div>}
      {action}
    </div>
  )
}

export function Spinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2" role="status">
      <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent motion-reduce:animate-none" aria-hidden />
      <span>{label}</span>
    </span>
  )
}

/** A fixed bar for primary actions; content above reserves space with `pb-action`. */
export function ActionBar({ children, aboveNav }: { children: ReactNode; aboveNav?: boolean }) {
  return (
    <div
      className="fixed-column z-30 bg-gradient-to-t from-canvas from-70% to-canvas/0 px-5 pt-5"
      style={{
        bottom: aboveNav ? 'calc(var(--nav-offset) + env(safe-area-inset-bottom))' : 0,
        paddingBottom: aboveNav ? 10 : 'calc(14px + env(safe-area-inset-bottom))',
      }}
    >
      {children}
    </div>
  )
}
