/*
 * Part of the sample-trip demo: the app's rule-based (simulated AI) adjustments, run on a local
 * copy of the Bangkok sample. Apply / Undo / Reset only touch this component's state.
 */
import { ArrowRight, Check, CircleCheck, Lock, RotateCcw, Shuffle, Undo2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cx } from '../components/ui'
import { requirePlace } from '../data/places'
import { comparePlans, isNoChange, propose, type AdjustKind, type PlanDiff, type PlanState } from '../domain/adjust'
import { formatDuration, formatSignedDuration, formatSignedTHB, formatTHB, plural } from '../lib/format'
import { SAMPLE_PLAN, summaryFor } from './sample'
import { Band, Reveal, SectionHead } from './parts'

/** "A slower day" previews day 1 of the sample. */
const RELAX_DAY = 0

const CHIPS: { kind: AdjustKind; label: string; ask: string }[] = [
  { kind: 'less-walking', label: 'Less walking', ask: 'Less walking, please' },
  { kind: 'lower-cost', label: 'Lower the cost', ask: 'Can we spend a bit less?' },
  { kind: 'more-cafes', label: 'More cafés', ask: 'Fit in another café' },
  { kind: 'relax-day', label: 'A slower day', ask: 'Make day 1 slower' },
]

const STAYS = /stay the same|are unchanged/i

const listNames = (n: string[]) => (n.length > 1 ? `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}` : n.join(''))

function stopsKept(diff: PlanDiff) {
  return diff.before.stopCount - diff.removed.length - diff.moved.length
}

export function AdjustDemo() {
  const [history, setHistory] = useState<PlanState[]>([SAMPLE_PLAN])
  const plan = history[history.length - 1]
  const [kind, setKind] = useState<AdjustKind | null>('lower-cost')
  const [appliedLabel, setAppliedLabel] = useState<string | null>(null)

  const preview = useMemo(() => {
    if (!kind) return null
    const p = propose(kind, plan, RELAX_DAY)
    const diff = comparePlans(plan, p.next)
    return { p, diff, none: !!p.noChangeReason || isNoChange(diff) }
  }, [kind, plan])

  const summary = summaryFor(plan)
  const mustKept = plan.mustVisit.filter((id) => plan.itinerary.days.some((d) => d.placeIds.includes(id)))

  const choose = (k: AdjustKind) => {
    setKind((cur) => (cur === k ? null : k))
    setAppliedLabel(null)
  }
  const apply = () => {
    if (!preview || preview.none) return
    setHistory((h) => [...h, preview.p.next])
    setAppliedLabel(preview.p.title)
    setKind(null)
  }
  const undo = () => {
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h))
    setAppliedLabel(null)
  }
  const reset = () => {
    setHistory([SAMPLE_PLAN])
    setAppliedLabel(null)
    setKind('lower-cost')
  }

  return (
    <Band id="adjust" label="adjust-title" tone="blue" className="lp-adjust">
      <SectionHead
        n="B"
        label="Sample · Adjust"
        id="adjust-title"
        level={3}
        title="Change the plan. Keep the adventure."
        lede="Ask for a change to the Bangkok sample, then review exactly what moves before you apply it. Suggestions are simulated with simple rules, not a live AI model."
      />

      <Reveal className="lp-cell lp-adjust-controls">
        <div>
          <p className="lp-h4" id="adjust-try">Try a request</p>
          <div role="group" aria-labelledby="adjust-try" className="lp-chips">
            {CHIPS.map((c) => (
              <button key={c.kind} type="button" aria-pressed={kind === c.kind} onClick={() => choose(c.kind)} className="lp-chip">
                {kind === c.kind && <Check size={15} aria-hidden />}
                {c.label}
              </button>
            ))}
          </div>
          <p className="lp-fineprint">A rule-based demo, not a live AI model. It never touches your saved trips.</p>
        </div>

        <div className="lp-demoplan" aria-live="polite">
          <p className="lp-h4">
            Demo plan{history.length > 1 ? ` · ${plural(history.length - 1, 'change')} applied` : ' · Bangkok sample'}
          </p>
          <dl className="lp-strip lp-demoplan-stats">
            <div><dt>Est. cost</dt><dd>~{formatTHB(summary.cost.total)} pp</dd></div>
            <div><dt>Stops</dt><dd>{summary.stopCount}</dd></div>
            <div><dt>Walking</dt><dd>{formatDuration(summary.walkMins)}</dd></div>
            <div><dt>Must-visits</dt><dd>{mustKept.length} of {plan.mustVisit.length}</dd></div>
          </dl>
          {history.length > 1 && (
            <div className="lp-demoplan-actions">
              <button type="button" onClick={undo} className="lp-textbtn"><Undo2 size={15} aria-hidden /> Undo last change</button>
              <button type="button" onClick={reset} className="lp-textbtn"><RotateCcw size={15} aria-hidden /> Reset demo</button>
            </div>
          )}
        </div>
      </Reveal>

      <Reveal className="lp-cell lp-preview" delay={1}>
        <div aria-live="polite">
          {appliedLabel ? (
            <div className="lp-preview-done">
              <CircleCheck size={28} aria-hidden className="lp-done-icon" />
              <p className="text-title font-extrabold">“{appliedLabel}” applied to the demo plan</p>
              <p className="lp-on-blue-muted text-body">The sample is now about {formatTHB(summary.cost.total)} per person.</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={undo} className="lp-btn lp-btn-inverse lp-btn-sm"><Undo2 size={16} aria-hidden /> Undo</button>
                <button type="button" onClick={reset} className="lp-btn lp-btn-inverse lp-btn-sm"><RotateCcw size={16} aria-hidden /> Reset demo</button>
              </div>
            </div>
          ) : !preview ? (
            <div className="lp-preview-empty">
              <p className="text-heading font-bold">Pick a request to preview it.</p>
              <p className="lp-on-blue-muted text-body">Nothing changes until you choose “Apply changes”.</p>
            </div>
          ) : (
            <Preview
              ask={CHIPS.find((c) => c.kind === kind)!.ask}
              title={preview.p.title}
              lines={preview.p.explanation}
              none={preview.none ? preview.p.noChangeReason ?? 'This request doesn’t change the current plan.' : null}
              diff={preview.diff}
              mustKept={mustKept.map((id) => requirePlace(id).name)}
              onApply={apply}
              onDismiss={() => setKind(null)}
            />
          )}
        </div>
      </Reveal>
    </Band>
  )
}

function Preview({
  ask, title, lines, none, diff, mustKept, onApply, onDismiss,
}: { ask: string; title: string; lines: string[]; none: string | null; diff: PlanDiff; mustKept: string[]; onApply: () => void; onDismiss: () => void }) {
  const changes = lines.filter((l) => !STAYS.test(l))
  const stays = [
    // The must-visit line is listed by name below, and the card's fine print covers prices.
    ...lines.filter((l) => STAYS.test(l) && !/^Must-visit places/.test(l)),
    `${plural(stopsKept(diff), 'stop')} stay on the same day`,
    `Must-visits: ${listNames(mustKept)}`,
    'Your dates, hotel and budget',
  ]
  const endShifts = diff.dayEndDeltas
    .map((d, i) => (d === 0 ? null : `Day ${i + 1} ends ${formatDuration(Math.abs(d))} ${d < 0 ? 'earlier' : 'later'}`))
    .filter((l): l is string => !!l)
  const swaps = [
    ...diff.removed.map((r) => <li key={`r${r.placeId}`} className="lp-minus">Out: {requirePlace(r.placeId).name} (day {r.day + 1})</li>),
    ...diff.added.map((a) => <li key={`a${a.placeId}`} className="lp-plus">In: {requirePlace(a.placeId).name} (day {a.day + 1})</li>),
  ]

  return (
    <article className="lp-preview-card" aria-label={`Preview: ${title}`}>
      <p className="lp-ask"><span className="sr-only">You asked: </span>{ask}</p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-title font-extrabold tracking-[-0.01em]">{title}</h3>
        <span className="lp-pill">Preview · not applied</span>
      </div>

      {none ? (
        <p className="lp-on-blue-muted mt-3 text-body">{none}</p>
      ) : (
        <>
          <div className="lp-preview-cols">
            <div>
              <h4 className="lp-h4"><Shuffle size={14} aria-hidden /> What changes</h4>
              <ul className="lp-bullets">
                {swaps.length ? swaps : changes.map((l) => <li key={l}>{l}</li>)}
              </ul>
            </div>
            <div className="lp-tradeoff">
              <h4 className="lp-h4">Trade-off, whole trip</h4>
              <dl>
                <div>
                  <dt>Cost pp</dt>
                  <dd>{formatTHB(diff.before.cost.total)} <ArrowRight size={13} aria-label="to" /> {formatTHB(diff.after.cost.total)}</dd>
                  <dd className={cx('lp-delta', diff.costDelta < 0 && 'is-good', diff.costDelta > 0 && 'is-cost')}>{formatSignedTHB(diff.costDelta)}</dd>
                </div>
                <div>
                  <dt>Walking</dt>
                  <dd>{formatDuration(diff.before.walkMins)} <ArrowRight size={13} aria-label="to" /> {formatDuration(diff.after.walkMins)}</dd>
                  <dd className={cx('lp-delta', diff.walkMinsDelta < 0 && 'is-good')}>{formatSignedDuration(diff.walkMinsDelta)}</dd>
                </div>
                <div>
                  <dt>Rides &amp; ferry</dt>
                  <dd>{formatDuration(diff.before.carMins)} <ArrowRight size={13} aria-label="to" /> {formatDuration(diff.after.carMins)}</dd>
                  <dd className="lp-delta">{formatSignedDuration(diff.carMinsDelta)}</dd>
                </div>
              </dl>
            </div>
          </div>

          <details className="lp-details">
            <summary>View details</summary>
            <div className="lp-details-cols">
              {swaps.length > 0 && changes.length > 0 && (
                <div>
                  <h4 className="lp-h4">Why</h4>
                  <ul className="lp-bullets">{changes.map((l) => <li key={l}>{l}</li>)}</ul>
                </div>
              )}
              <div>
                <h4 className="lp-h4"><Lock size={14} aria-hidden /> What stays</h4>
                <ul className="lp-bullets">
                  {stays.map((l) => <li key={l}>{l}</li>)}
                  {endShifts.map((l) => <li key={l}>{l}</li>)}
                </ul>
              </div>
            </div>
          </details>
        </>
      )}

      <div className="lp-preview-actions">
        <button type="button" onClick={onApply} disabled={!!none} className="lp-btn lp-btn-lime">
          <Check size={18} aria-hidden /> Apply changes
        </button>
        <button type="button" onClick={onDismiss} className="lp-btn lp-btn-inverse">Keep current plan</button>
      </div>
      <p className="lp-fineprint">Sample estimates. Applying only updates this demo.</p>
    </article>
  )
}
