/* Small building blocks shared by the landing page sections. */
import { ArrowRight, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { cx } from '../components/ui'

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="lp-eyebrow">{children}</p>
}

/** "01  How it works": the small numbered label that opens each section's first cell. */
export function SectionLabel({ n, children }: { n: string; children: ReactNode }) {
  return (
    <p className="lp-label">
      <span className="lp-label-n">{n}</span>
      {children}
    </p>
  )
}

export function Wordmark({ inverse }: { inverse?: boolean }) {
  return (
    <span className={cx('lp-wordmark', inverse && 'lp-wordmark-inverse')}>
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden>
        <circle cx="16" cy="16" r="14" fill="var(--color-primary)" />
        <path d="M10 21l6-11 6 11" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Roam
    </span>
  )
}

/** A link styled as a button. App routes are plain hash links, so refresh and Back just work. */
export function CtaLink({
  href, children, tone = 'primary', icon: Icon = ArrowRight, className, onClick,
}: { href: string; children: ReactNode; tone?: 'primary' | 'secondary' | 'lime' | 'inverse'; icon?: LucideIcon | null; className?: string; onClick?: () => void }) {
  return (
    <a href={href} onClick={onClick} className={cx('lp-btn', `lp-btn-${tone}`, className)}>
      {children}
      {Icon && <Icon size={18} aria-hidden />}
    </a>
  )
}

/**
 * A grid cell whose contents fade up as it scrolls into view. Only the children move, so the
 * cell's background (and the grid lines around it) stay put. Content is visible by default: the
 * hidden starting state only applies once JS has marked the page as motion-friendly (see LandingPage).
 */
export function Reveal({ children, className, delay = 0, as: Tag = 'div', id }: { children: ReactNode; className?: string; delay?: 0 | 1 | 2; as?: 'div' | 'li' | 'figure' | 'nav'; id?: string }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        // Also reveal anything already scrolled past (e.g. after jumping to an anchor).
        if (e.isIntersecting || e.boundingClientRect.bottom < 0) {
          e.target.classList.add('is-in')
          io.unobserve(e.target)
        }
      }),
      { rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} id={id} className={cx('lp-reveal', className)} data-delay={delay || undefined}>
      {children}
    </Tag>
  )
}

/** A full-bleed band with the page's outer rails and its 12-column grid. */
export function Band({ id, label, tone, className, children }: { id?: string; label: string; tone?: 'blue'; className?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={label} className={cx('lp-band', tone && `lp-band-${tone}`)}>
      <div className="lp-frame">
        <div className={cx('lp-grid', className)}>{children}</div>
      </div>
    </section>
  )
}

/** The heading row that opens a section: a narrow numbered label cell beside the title cell. */
export function SectionHead({
  n, label, id, title, lede, action, level = 2,
}: { n: string; label: string; id: string; title: ReactNode; lede?: ReactNode; action?: ReactNode; level?: 2 | 3 }) {
  const H = level === 2 ? 'h2' : 'h3'
  return (
    <>
      <Reveal className="lp-cell lp-head-label"><SectionLabel n={n}>{label}</SectionLabel></Reveal>
      <Reveal className="lp-cell lp-head-title" delay={1}>
        <div className="lp-head-in">
          <H id={id} className="lp-h2">{title}</H>
          {lede && <p className="lp-lede">{lede}</p>}
          {action && <div className="lp-head-action">{action}</div>}
        </div>
      </Reveal>
    </>
  )
}
