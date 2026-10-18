import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from './ui'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

let openCount = 0

/**
 * Accessible bottom sheet (modal dialog): traps focus, closes on Escape or
 * backdrop, restores focus to the trigger, and locks page scroll.
 */
export function BottomSheet({
  open, onClose, title, subtitle, children, footer, size = 'auto', initialFocus,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'auto' | 'tall'
  initialFocus?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const trigger = document.activeElement as HTMLElement | null
    openCount++
    document.body.style.overflow = 'hidden'
    const appMain = document.getElementById('main')
    if (appMain) appMain.inert = true
    const node = ref.current!
    const first = (initialFocus && node.querySelector<HTMLElement>(initialFocus)) || node.querySelector<HTMLElement>('[data-autofocus]') || node
    first.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
      }
      if (e.key === 'Tab') {
        const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
        if (!items.length) return
        const firstEl = items[0]
        const lastEl = items[items.length - 1]
        if (e.shiftKey && (document.activeElement === firstEl || document.activeElement === node)) {
          e.preventDefault()
          lastEl.focus()
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault()
          firstEl.focus()
        }
      }
    }
    node.addEventListener('keydown', onKey)
    return () => {
      node.removeEventListener('keydown', onKey)
      openCount--
      if (openCount === 0) { document.body.style.overflow = ''; if (appMain) appMain.inert = false }
      if (trigger && document.contains(trigger)) trigger.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="anim-fade absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="anim-sheet fixed-column bottom-0 flex flex-col rounded-t-sheet bg-surface shadow-sheet"
        style={{ maxHeight: size === 'tall' ? '92dvh' : '85dvh', height: size === 'tall' ? '92dvh' : undefined }}
      >
        <div className="flex items-start gap-2 border-b border-line px-5 pt-2 pb-2">
          <div className="min-w-0 flex-1 pt-2.5">
            <h2 id={titleId} className="text-title font-semibold">{title}</h2>
            {subtitle && <div className="mt-0.5 text-small text-ink-muted">{subtitle}</div>}
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && (
          <div className="border-t border-line px-5 pt-3" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.querySelector('.app-shell') ?? document.body,
  )
}

export function ConfirmSheet({
  open, onClose, title, children, confirmLabel, onConfirm, destructive,
}: { open: boolean; onClose: () => void; title: string; children: ReactNode; confirmLabel: string; onConfirm: () => void; destructive?: boolean }) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-2">
          <button type="button" data-autofocus onClick={onClose} className="min-h-11 flex-1 rounded-control border border-line-strong bg-surface font-semibold">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-11 flex-1 rounded-control font-semibold text-ink-inverse ${destructive ? 'bg-danger' : 'bg-primary'}`}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="text-body text-ink-muted">{children}</div>
    </BottomSheet>
  )
}
