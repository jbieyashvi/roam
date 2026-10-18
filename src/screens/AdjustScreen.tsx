import {
  AlertTriangle, Armchair, ArrowRight, ArrowUp, Banknote, CarTaxiFront, Check, CheckCircle2, Coffee, Footprints, Minus, Plus, type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { PlaceImage } from '../components/cards'
import { TopBar } from '../components/controls'
import { ActionBar, Banner, Button, Chip, cx, Spinner } from '../components/ui'
import { CATEGORY_LABEL } from '../data/catalog'
import { requirePlace } from '../data/places'
import {
  ADJUSTMENTS, comparePlans, findConflicts, isNoChange, parseRequest, propose,
  type AdjustKind, type Conflict, type PlanDiff, type Proposal,
} from '../domain/adjust'
import { summarize } from '../domain/planner'
import type { Trip } from '../domain/types'
import { addDays, formatDate, formatDateRange, formatDuration, formatTHB, formatSignedDuration, formatSignedTHB, plural } from '../lib/format'
import { navigate, setQuery, useRoute } from '../lib/router'
import { useApplyChange, useTrip } from '../state/hooks'
import { useToast } from '../state/store'
import { BudgetSheet, planState, reducedMotion } from './ItineraryScreen'
import { MissingTrip } from './sample'

const ICON: Record<AdjustKind, LucideIcon> = {
  'less-walking': Footprints,
  'lower-cost': Banknote,
  'more-cafes': Coffee,
  'relax-day': Armchair,
}
const isKind = (s: string): s is AdjustKind => ADJUSTMENTS.some((a) => a.kind === s)
const labelOf = (k: AdjustKind) => ADJUSTMENTS.find((a) => a.kind === k)!.label

type Phase =
  | { kind: 'idle' }
  | { kind: 'processing'; adjust: AdjustKind | null; label: string }
  | { kind: 'result'; adjust: AdjustKind; text?: string }
  | { kind: 'unsupported'; text: string }

/** Proposal for the current trip state — re-derived so budget edits and day changes stay in sync. */
function useProposal(trip: Trip | undefined, adjust: AdjustKind | null, dayIndex: number) {
  return useMemo(() => {
    if (!trip?.itinerary || !adjust) return null
    const state = planState(trip)
    const proposal = propose(adjust, state, dayIndex)
    const diff = comparePlans(state, proposal.next)
    const noChange = !!proposal.noChangeReason || isNoChange(diff)
    return { proposal, diff, noChange, conflicts: noChange ? [] : findConflicts(proposal, diff, state, dayIndex) }
  }, [trip, adjust, dayIndex])
}

export function AdjustScreen({ tripId }: { tripId: string }) {
  const trip = useTrip(tripId)
  const { query } = useRoute()
  const { show } = useToast()
  const apply = useApplyChange(tripId)
  const days = trip?.brief.days ?? 3
  const dayParam = Number(query.get('day'))
  const dayIndex = dayParam >= 1 && dayParam <= days ? dayParam - 1 : 0
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [text, setText] = useState('')
  const [budgetOpen, setBudgetOpen] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const started = useRef<string | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  const adjust = phase.kind === 'result' ? phase.adjust : null
  const result = useProposal(trip, adjust, dayIndex)
  const itineraryPath = `/trip/${tripId}/itinerary`
  const back = `${itineraryPath}?day=${dayIndex + 1}`

  const commit = (p: Proposal) => {
    // Keep the trip's current budget even if it was edited after the proposal was made.
    const next = { ...p.next, brief: { ...p.next.brief, budgetPerPerson: trip!.brief.budgetPerPerson } }
    apply(p.title, next, itineraryPath)
    navigate(back)
  }

  const run = (request: string, auto = false) => {
    let kind: AdjustKind | null
    if (isKind(request)) kind = request
    else {
      const parsed = parseRequest(request, days)
      kind = parsed.kind
      if (parsed.dayIndex !== undefined && parsed.dayIndex !== dayIndex) setQuery({ day: String(parsed.dayIndex + 1) })
    }
    setPhase({ kind: 'processing', adjust: kind, label: kind ? labelOf(kind) : request })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      if (!kind) return setPhase({ kind: 'unsupported', text: request })
      if (auto && trip?.itinerary) {
        // Demo deep link: apply straight away only when there is nothing to decide.
        const day = isKind(request) ? dayIndex : (parseRequest(request, days).dayIndex ?? dayIndex)
        const state = planState(trip)
        const p = propose(kind, state, day)
        const diff = comparePlans(state, p.next)
        if (!p.noChangeReason && !isNoChange(diff) && !findConflicts(p, diff, state, day).length) return commit(p)
      }
      setPhase({ kind: 'result', adjust: kind, text: isKind(request) ? undefined : request })
    }, reducedMotion() ? 100 : 900)
  }

  // Start a request passed in the link once (e.g. "Lower the cost" from the over-budget banner).
  const initial = query.get('request')
  useEffect(() => {
    if (!initial || started.current === initial || !trip?.itinerary) return
    started.current = initial
    if (!isKind(initial)) setText(initial)
    run(initial, query.get('autoApply') === '1')
    // Drop the one-shot params so a refresh shows the workspace, not a re-run.
    setQuery({ request: null, autoApply: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, trip?.itinerary])
  // Cancelling the pending run also forgets it, so a remount (e.g. StrictMode) starts it again.
  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      started.current = null
    },
    [],
  )
  // Bring the outcome into view and announce it by moving focus to its heading.
  useEffect(() => {
    if (phase.kind === 'result' || phase.kind === 'unsupported') {
      const h = resultRef.current?.querySelector<HTMLElement>('h2')
      h?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' })
      h?.focus({ preventScroll: true })
    }
  }, [phase])

  if (!trip) return <MissingTrip tripId={tripId} />
  if (!trip.itinerary) {
    return (
      <div className="px-5 pt-10">
        <Banner tone="info" title="No itinerary to adjust yet" action={<Button onClick={() => navigate(`/trip/${tripId}/places`)}>Review places</Button>}>
          Create an itinerary first, then come back to fine-tune it.
        </Banner>
      </div>
    )
  }

  const keep = () => {
    navigate(back)
    show({ tone: 'info', message: 'No changes made — your plan is as it was' })
  }
  const ready = phase.kind === 'result' && result && !result.noChange
  const busy = phase.kind === 'processing'
  const selectedKind = phase.kind === 'processing' ? phase.adjust : phase.kind === 'result' ? phase.adjust : null
  const est = summarize(trip.itinerary, trip.brief)

  return (
    <div className={ready ? 'pb-action' : 'pb-10'}>
      <TopBar back={back} title="Adjust plan" />
      <div className="flex flex-col gap-6 px-5 pt-2">
        <header className="adjust-intro">
          <span className="chapter-label">THE FINISHING TOUCHES / ROAM STUDIO</span>
          <h1 className="text-display font-extrabold">Make this trip yours.</h1>
          <p className="mt-2 text-body text-ink-muted">
            Pick a change and see exactly what it does before anything moves.
          </p>
        </header>

        {/* Trip + day context */}
        <section aria-label="Trip context" className="flex flex-col gap-3 rounded-card bg-accent-soft p-4">
          <div className="flex items-center gap-3">
            <PlaceImage src={requirePlace(trip.itinerary.days[dayIndex].placeIds[0] ?? 'grand-palace').image} alt="" category="destination" className="size-12 shrink-0 rounded-[14px]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-heading font-bold">{trip.name}</p>
              <p className="text-small text-ink-muted">
                {formatDateRange(trip.brief.startDate, trip.brief.days)} · ~{formatTHB(est.cost.total)} pp est.
              </p>
            </div>
          </div>
          <div>
            <p id="focus-day" className="text-small font-semibold">Focus day</p>
            <div role="group" aria-labelledby="focus-day" className="mt-1.5 flex gap-2 overflow-x-auto no-scrollbar">
              {trip.itinerary.days.map((_, i) => (
                <Chip key={i} selected={i === dayIndex} onClick={() => setQuery({ day: String(i + 1) })}>
                  Day {i + 1}
                  {trip.brief.startDate && <span className={i === dayIndex ? 'text-ink-inverse/75' : 'text-ink-subtle'}>{formatDate(addDays(trip.brief.startDate, i), { weekday: 'short' })}</span>}
                </Chip>
              ))}
            </div>
            <p className="mt-1.5 text-micro text-ink-muted">“A slower day” changes the focus day. The others look across the whole trip.</p>
          </div>
        </section>

        {/* Quick actions */}
        <section aria-labelledby="quick-h" className="flex flex-col gap-3">
          <h2 id="quick-h" className="text-title font-bold">Quick changes</h2>
          <div className="adjust-choices grid grid-cols-2 gap-3">
            {ADJUSTMENTS.map((a) => {
              const Icon = ICON[a.kind]
              const on = selectedKind === a.kind
              return (
                <button
                  key={a.kind}
                  type="button"
                  aria-pressed={on}
                  disabled={busy}
                  onClick={() => run(a.kind)}
                  className={cx(
                    'relative flex min-h-[112px] flex-col items-start justify-between gap-3 rounded-tile p-3.5 text-left transition-colors disabled:cursor-wait',
                    on ? 'bg-lime ring-2 ring-ink' : 'bg-surface shadow-card hover:bg-surface-sunken',
                  )}
                >
                  <span className={cx('flex size-9 items-center justify-center rounded-full', on ? 'bg-ink text-lime' : 'bg-primary-soft text-primary-ink')} aria-hidden>
                    {on ? <Check size={18} strokeWidth={2.6} /> : <Icon size={18} />}
                  </span>
                  <span>
                    <span className="block text-body leading-snug font-bold">{a.label}</span>
                    <span className={cx('mt-0.5 block text-small', on ? 'text-ink/75' : 'text-ink-muted')}>
                      {a.kind === 'relax-day' ? `Day ${dayIndex + 1}: fewer stops, more rest` : a.hint}
                    </span>
                  </span>
                  {on && <span className="sr-only">(selected)</span>}
                </button>
              )
            })}
          </div>
        </section>

        {/* Free-text request */}
        <form
          className="flex flex-col gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            if (text.trim()) run(text.trim())
          }}
        >
          <label htmlFor="adjust-text" className="text-small font-semibold">Or ask in your own words</label>
          <div className="flex items-center gap-2 rounded-chip border border-line-strong bg-surface p-1 pl-4 focus-within:border-primary">
            <input
              id="adjust-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Make day 2 more relaxed"
              autoComplete="off"
              aria-describedby="adjust-text-help"
              className="min-h-11 min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-ink-subtle"
            />
            <button
              type="submit"
              disabled={!text.trim() || busy}
              aria-label="Preview change"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-ink-inverse disabled:bg-line-strong"
            >
              <ArrowUp size={18} aria-hidden />
            </button>
          </div>
          <p id="adjust-text-help" className="text-micro text-ink-subtle">Matched to the four changes above with simple rules. No AI service is connected.</p>
        </form>

        {/* Outcome */}
        <div ref={resultRef} aria-live="polite" className="flex flex-col gap-4 scroll-mt-4">
          {phase.kind === 'processing' && (
            <div className="flex flex-col gap-1 rounded-card bg-primary-soft p-5 text-body text-primary-ink">
              <Spinner label={`Checking “${phase.label}” against your plan…`} />
              <p className="pl-6 text-small text-ink-muted">Re-running the planning rules on sample data.</p>
            </div>
          )}

          {phase.kind === 'result' && result && result.noChange && (
            <div className="flex flex-col gap-3">
              <h2 tabIndex={-1} className="sr-only">No change needed</h2>
              <Banner tone="info" title="Nothing to change">
                {result.proposal.noChangeReason ?? 'Your plan already matches this request.'}
              </Banner>
              <Button variant="secondary" onClick={() => setPhase({ kind: 'idle' })}>Try another change</Button>
            </div>
          )}

          {phase.kind === 'result' && result && !result.noChange && (
            <>
              <ProposalPanel proposal={result.proposal} diff={result.diff} before={trip.itinerary} request={phase.text} />
              {result.conflicts.map((c, i) => (
                <ConflictPanel
                  key={i}
                  conflict={c}
                  onEditBudget={() => setBudgetOpen(true)}
                  onReviewMust={() => navigate(`/trip/${tripId}/places`)}
                  onLowerCost={() => run('lower-cost')}
                />
              ))}
              <BeforeAfter diff={result.diff} mustVisit={trip.mustVisit} />
              <p className="text-small text-ink-subtle">Must-visits stay in the plan. Nothing changes until you apply, and you can undo afterwards. Costs and times are estimates.</p>
            </>
          )}

          {phase.kind === 'unsupported' && (
            <div className="flex flex-col gap-3">
              <h2 tabIndex={-1} className="sr-only">Request not supported</h2>
              <Banner tone="warning" title="Roam can't do that in this demo">
                “{phase.text}” isn't something the prototype's planning rules can handle. Nothing was booked or changed.
              </Banner>
              <p className="text-small font-semibold">It can:</p>
              <div className="flex flex-wrap gap-2">
                {ADJUSTMENTS.map((a) => (
                  <Button key={a.kind} size="sm" variant="secondary" icon={ICON[a.kind]} onClick={() => run(a.kind)}>{a.label}</Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {ready && (
        <ActionBar>
          <div className="flex gap-2">
            <Button variant="secondary" size="lg" className="flex-1 px-3! text-[0.875rem]! whitespace-nowrap" onClick={keep}>Keep current plan</Button>
            <Button size="lg" className="flex-1 px-3! text-[0.875rem]! whitespace-nowrap" icon={Check} onClick={() => commit(result.proposal)}>
              {result.conflicts.length ? 'Apply anyway' : 'Apply changes'}
            </Button>
          </div>
        </ActionBar>
      )}
      <BudgetSheet trip={trip} open={budgetOpen} onClose={() => setBudgetOpen(false)} />
    </div>
  )
}

// ── Proposal panel ─────────────────────────────────────────────

function Metric({ good, children }: { good: boolean; children: ReactNode }) {
  return (
    <li className={cx('inline-flex items-center gap-1 rounded-chip px-2.5 py-1 text-small font-bold', good ? 'bg-lime text-ink' : 'bg-ink-inverse/15 text-ink-inverse')}>
      {good && <Check size={14} strokeWidth={2.6} aria-hidden />}
      {children}
    </li>
  )
}

function ProposalPanel({ proposal, diff, before, request }: { proposal: Proposal; diff: PlanDiff; before: Trip['itinerary']; request?: string }) {
  const stopDelta = diff.after.stopCount - diff.before.stopCount
  // Name the days the proposal actually touches rather than guessing from the change type.
  const touched = (proposal.next.itinerary?.days ?? [])
    .map((d, i) => (d.placeIds.join() !== before?.days[i]?.placeIds.join() ? i + 1 : 0))
    .filter(Boolean)
  const scope = touched.length === 0 || touched.length === (before?.days.length ?? 0) ? 'Whole trip' : `Day ${touched.join(' & ')}`
  return (
    <section aria-labelledby="proposal-h" className="relative overflow-hidden rounded-card bg-primary p-5 text-ink-inverse">
      <span aria-hidden className="absolute -top-20 -right-16 size-48 rounded-full bg-primary-deep" />
      <div className="relative">
        <p className="text-micro font-bold tracking-wide text-ink-inverse/80 uppercase">
          Proposed change · {scope}
        </p>
        <h2 id="proposal-h" tabIndex={-1} className="mt-1 text-title font-extrabold outline-none">{proposal.title}</h2>
        {request && <p className="mt-1 text-small text-ink-inverse/80">From your request: “{request}”</p>}
        <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-small text-ink-inverse/95">
          {proposal.explanation.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Effect on the whole trip">
          {diff.costDelta !== 0 && (
            <Metric good={diff.costDelta < 0}>{diff.costDelta < 0 ? `${formatTHB(-diff.costDelta)} less pp` : `${formatTHB(diff.costDelta)} more pp`}</Metric>
          )}
          {diff.walkMinsDelta !== 0 && (
            <Metric good={diff.walkMinsDelta < 0}>{diff.walkMinsDelta < 0 ? `${formatDuration(-diff.walkMinsDelta)} less walking` : `${formatDuration(diff.walkMinsDelta)} more walking`}</Metric>
          )}
          {stopDelta !== 0 && <Metric good={false}>{stopDelta > 0 ? `+${plural(stopDelta, 'stop')}` : `${plural(-stopDelta, 'fewer stop')}`}</Metric>}
        </ul>
      </div>
    </section>
  )
}

// ── Conflicts ──────────────────────────────────────────────────

function ConflictPanel({ conflict, onEditBudget, onReviewMust, onLowerCost }: { conflict: Conflict; onEditBudget: () => void; onReviewMust: () => void; onLowerCost: () => void }) {
  return (
    <section aria-label={conflict.title} className="rounded-card border border-warning/30 bg-warning-soft p-4">
      <p className="flex items-start gap-2 text-body font-bold text-ink">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warning" aria-label="Conflict" />
        {conflict.title}
      </p>
      <p className="mt-1 pl-[26px] text-small text-ink-muted">{conflict.detail}</p>
      <p className="mt-2 pl-[26px] text-small font-semibold">You can apply it anyway, keep your current plan, or:</p>
      <div className="mt-2 flex flex-wrap gap-2 pl-[26px]">
        {conflict.kind === 'must-visit' && <Button size="sm" variant="secondary" onClick={onReviewMust}>Review must-visits</Button>}
        <Button size="sm" variant="secondary" icon={Banknote} onClick={onEditBudget}>Edit budget</Button>
        {conflict.kind === 'budget' && <Button size="sm" variant="secondary" onClick={onLowerCost}>Lower the cost instead</Button>}
      </div>
    </section>
  )
}

// ── Before / after ─────────────────────────────────────────────

function Row({ icon, title, sub, side }: { icon: ReactNode; title: ReactNode; sub?: ReactNode; side?: ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="shrink-0" aria-hidden>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-body font-semibold">{title}</span>
        {sub && <span className="block text-small text-ink-muted">{sub}</span>}
      </span>
      {side && <span className="shrink-0 text-right text-small font-semibold text-ink-muted">{side}</span>}
    </li>
  )
}

const dot = (cls: string, Icon: LucideIcon) => (
  <span className={cx('flex size-8 items-center justify-center rounded-full', cls)}>
    <Icon size={16} strokeWidth={2.4} />
  </span>
)

function BeforeAfter({ diff, mustVisit }: { diff: PlanDiff; mustVisit: string[] }) {
  const changed = new Set([...diff.added, ...diff.removed, ...diff.moved].map((x) => x.placeId))
  const keptMust = mustVisit.filter((id) => !changed.has(id) && diff.after.days.some((d) => d.items.some((i) => i.kind === 'stop' && i.placeId === id)))
  const keptCount = diff.before.stopCount - diff.removed.length - diff.moved.length
  const day = (i: number) => `Day ${i + 1}`
  const delta = (v: number, fmt: string, good: boolean) => (
    <span className={cx('inline-flex items-center gap-1', v === 0 ? 'text-ink-muted' : good ? 'text-success' : 'text-danger')}>
      {v !== 0 && (good ? <Check size={13} aria-hidden /> : <AlertTriangle size={13} aria-hidden />)}
      {fmt}
    </span>
  )
  return (
    <section aria-labelledby="ba-h" className="rounded-card bg-surface px-4 pt-4 pb-1 shadow-card">
      <h3 id="ba-h" className="text-heading font-bold">Before and after</h3>
      <ul className="divide-y divide-line">
        <Row
          icon={dot('bg-surface-sunken text-ink-muted', CheckCircle2)}
          title={`Kept: ${plural(keptCount, 'stop')}`}
          sub={keptMust.length ? `Including must-visits ${keptMust.map((id) => requirePlace(id).name).join(', ')}` : 'Same days, same order'}
        />
        {diff.moved.map((m) => (
          <Row
            key={`m${m.placeId}`}
            icon={dot('bg-primary-soft text-primary-ink', ArrowRight)}
            title={`Moved ${requirePlace(m.placeId).name}`}
            side={<>{day(m.from)} → {day(m.to)}</>}
          />
        ))}
        {diff.removed.map((r) => (
          <Row
            key={`r${r.placeId}`}
            icon={dot('bg-danger-soft text-danger', Minus)}
            title={`Set aside ${requirePlace(r.placeId).name}`}
            sub="Moves to “Not in the plan” · stays saved"
            side={day(r.day)}
          />
        ))}
        {diff.added.map((a) => {
          const p = requirePlace(a.placeId)
          return (
            <Row
              key={`a${a.placeId}`}
              icon={dot('bg-lime text-ink', Plus)}
              title={<>Added {p.name}</>}
              sub={`${CATEGORY_LABEL[p.category]} · ~${formatDuration(p.visitMins)}${p.costPerPerson ? ` · ~${formatTHB(p.costPerPerson)} pp` : ''}`}
              side={day(a.day)}
            />
          )
        })}
        {diff.modeChanged && (
          <Row icon={dot('bg-primary-soft text-primary-ink', CarTaxiFront)} title="Taxi or ride-hail for most hops" sub="Walking only for hops under about 400 m" />
        )}
        <Row
          icon={dot('bg-surface-sunken text-ink-muted', Banknote)}
          title="Estimated cost pp"
          sub={<>{formatTHB(diff.before.cost.total)} → <strong className="text-ink">{formatTHB(diff.after.cost.total)}</strong></>}
          side={delta(diff.costDelta, diff.costDelta === 0 ? 'no change' : formatSignedTHB(diff.costDelta), diff.costDelta < 0)}
        />
        {diff.walkMinsDelta !== 0 && (
          <Row
            icon={dot('bg-surface-sunken text-ink-muted', Footprints)}
            title="Walking, whole trip"
            sub={<>{formatDuration(diff.before.walkMins)} → <strong className="text-ink">{formatDuration(diff.after.walkMins)}</strong></>}
            side={delta(diff.walkMinsDelta, formatSignedDuration(diff.walkMinsDelta), diff.walkMinsDelta < 0)}
          />
        )}
        {diff.carMinsDelta !== 0 && (
          <Row
            icon={dot('bg-surface-sunken text-ink-muted', CarTaxiFront)}
            title="Taxi & ferry time, whole trip"
            sub={<>{formatDuration(diff.before.carMins)} → <strong className="text-ink">{formatDuration(diff.after.carMins)}</strong></>}
            side={<span className="text-ink-muted">{formatSignedDuration(diff.carMinsDelta)}</span>}
          />
        )}
      </ul>
      {diff.dayEndDeltas.some((d) => d !== 0) && (
        <p className="border-t border-line py-3 text-small text-ink-muted">
          {diff.dayEndDeltas
            .map((d, i) => (d === 0 ? null : `${day(i)} ${d < 0 ? 'ends' : 'runs'} ${formatDuration(Math.abs(d))} ${d < 0 ? 'earlier' : 'later'}`))
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
    </section>
  )
}
