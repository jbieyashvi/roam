import { AlertTriangle, ArrowRight, BedDouble, CarTaxiFront, Coffee, Footprints, Ship, Star, UtensilsCrossed } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { CATEGORY_LABEL, getHotel } from '../data/catalog'
import { PLACES, requirePlace } from '../data/places'
import type { PlanDiff } from '../domain/adjust'
import type { CostBreakdown, DaySchedule, TimelineItem } from '../domain/planner'
import type { TripBrief, Zone } from '../domain/types'
import { formatClock, formatDuration, formatTHB, formatSignedDuration, formatSignedTHB, plural } from '../lib/format'
import { PlaceImage } from './cards'
import { cx, Tag } from './ui'

// ── Schematic map ──────────────────────────────────────────────

const ZONE_LABEL: Record<Zone, string> = {
  rattanakosin: 'Rattanakosin',
  'old-town': 'Old town',
  chinatown: 'Chinatown & Talat Noi',
  'pathum-wan': 'Pathum Wan',
  chatuchak: 'Chatuchak',
  dusit: 'Dusit',
}

/** A hand-drawn, simplified line for the Chao Phraya river on the same km grid. Not survey-accurate. */
const RIVER: { x: number; y: number }[] = [
  { x: -1.0, y: 7 }, { x: -1.05, y: 1.5 }, { x: -1.02, y: 0.2 }, { x: -0.85, y: -0.45 }, { x: -0.2, y: -0.85 },
  { x: 0.5, y: -1.0 }, { x: 1.0, y: -1.6 }, { x: 1.15, y: -2.4 }, { x: 1.2, y: -6 },
]

const ZONE_BOXES = (Object.keys(ZONE_LABEL) as Zone[]).map((zone) => {
  const ps = PLACES.filter((p) => p.zone === zone)
  const xs = ps.map((p) => p.x)
  const ys = ps.map((p) => p.y)
  return { zone, minX: Math.min(...xs) - 0.5, maxX: Math.max(...xs) + 0.5, minY: Math.min(...ys) - 0.5, maxY: Math.max(...ys) + 0.5 }
})

const ASPECT = 11 / 10 // width / height of the map frame

export interface MapStop {
  placeId: string
  order: number
}

/**
 * Illustrative map: places sit on a schematic km grid (not real geography).
 * Pins are real buttons layered over an SVG so they are keyboard accessible.
 * `bottomInset` keeps pins clear of a surface that overlaps the map's lower edge.
 */
export function SchematicMap({
  stops, schedule, brief, selectedId, onSelect, label, bottomInset = 0,
}: { stops: MapStop[]; schedule: DaySchedule; brief: TripBrief; selectedId: string | null; onSelect: (id: string) => void; label: string; bottomInset?: number }) {
  const hotel = getHotel(brief.startLocationId)
  const points = [{ x: hotel.x, y: hotel.y }, ...stops.map((s) => requirePlace(s.placeId))]
  let minX = Math.min(...points.map((p) => p.x)) - 0.8
  let maxX = Math.max(...points.map((p) => p.x)) + 0.8
  let minY = Math.min(...points.map((p) => p.y)) - 0.8
  let maxY = Math.max(...points.map((p) => p.y)) + 0.8
  // Expand to the frame's aspect ratio so x and y share one scale.
  const w0 = maxX - minX
  const h0 = maxY - minY
  if (w0 / h0 < ASPECT) {
    const extra = (h0 * ASPECT - w0) / 2
    minX -= extra
    maxX += extra
  } else {
    const extra = (w0 / ASPECT - h0) / 2
    minY -= extra
    maxY += extra
  }
  const W = maxX - minX
  const H = maxY - minY
  const sx = (x: number) => x - minX
  const sy = (y: number) => maxY - y
  // Pins live between the label row at the top and the overlapping surface at the bottom.
  const topPad = 16
  const bottomPad = 8 + bottomInset
  const pct = (p: { x: number; y: number }) => ({ left: ((p.x - minX) / W) * 100, top: topPad + ((maxY - p.y) / H) * (100 - topPad - bottomPad) })
  const clamp = (pos: { left: number; top: number }) => ({
    left: Math.min(93, Math.max(7, pos.left)),
    top: Math.min(100 - bottomPad, Math.max(topPad, pos.top)),
  })

  // Nudge pins that would overlap (clustered sights like the Wat Pho area).
  const placed: { left: number; top: number }[] = [clamp(pct(hotel))]
  const pins = stops.map((s) => {
    const origin = clamp(pct(requirePlace(s.placeId)))
    const clear = (p: { left: number; top: number }) => !placed.some((q) => Math.hypot(q.left - p.left, (q.top - p.top) / ASPECT) < 11)
    // Spiral outwards from the true position until the pin no longer covers another.
    let pos = origin
    for (let tries = 1; tries <= 36 && !clear(pos); tries++) {
      const angle = tries * 0.9
      const r = 6 + tries * 0.6
      pos = clamp({ left: origin.left + Math.cos(angle) * r, top: origin.top + Math.sin(angle) * r * ASPECT })
    }
    placed.push(pos)
    return { ...s, pos }
  })
  const legs = schedule.items.filter((i): i is Extract<TimelineItem, { kind: 'travel' }> => i.kind === 'travel')
  const route = [placed[0], ...pins.map((p) => p.pos), placed[0]]
  const toSvg = (p: { left: number; top: number }) => ({ x: (p.left / 100) * W, y: (p.top / 100) * H })
  // Zones and roads are drawn in the same squeezed vertical space as the pins.
  const zy = (y: number) => (topPad / 100) * H + sy(y) * ((100 - topPad - bottomPad) / 100)
  const zh = (h: number) => h * ((100 - topPad - bottomPad) / 100)

  // Zone names sit above the routes as HTML, and are dropped where a pin would cover them.
  const zoneLabels = ZONE_BOXES.map((z) => {
    const text = ZONE_LABEL[z.zone]
    const box = { left: (sx(z.minX) / W) * 100 + 1.5, top: (zy(z.maxY) / H) * 100 + 1.5, width: text.length * 2.1, height: 6 }
    const covered = placed.some((q) => q.left > box.left - 6 && q.left < box.left + box.width + 6 && q.top > box.top - 6 && q.top < box.top + box.height + 6)
    const visible = box.left > 0 && box.left + box.width < 100 && box.top > topPad && box.top < 100 - bottomPad - 4
    return { zone: z.zone, text, box, show: visible && !covered }
  }).filter((l) => l.show)

  return (
    <figure className="m-0">
      <div className="relative aspect-[11/10] w-full overflow-hidden rounded-card bg-map-land">
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden preserveAspectRatio="none">
          {ZONE_BOXES.map((z) => (
            <g key={z.zone}>
              <rect x={sx(z.minX)} y={zy(z.maxY)} width={z.maxX - z.minX} height={zh(z.maxY - z.minY)} rx={0.4} className="fill-map-district" />
            </g>
          ))}
          {/* Schematic Chao Phraya river */}
          <polyline
            points={RIVER.map((r) => `${sx(r.x)},${zy(r.y)}`).join(' ')}
            fill="none"
            className="stroke-map-water"
            strokeWidth={10}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {route.slice(1).map((p, i) => {
            const a = toSvg(route[i])
            const b = toSvg(p)
            const mode = legs[i]?.leg.mode
            const walk = mode === 'walk'
            return (
              <line
                key={i}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                className="stroke-map-route"
                strokeWidth={walk ? 2.5 : 3}
                strokeDasharray={walk ? '2 5' : mode === 'boat' ? '8 4' : undefined}
                strokeLinecap="round"
                opacity={walk ? 0.9 : 0.7}
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
        </svg>
        {zoneLabels.map((l) => (
          <span
            key={l.zone}
            aria-hidden
            className="pointer-events-none absolute rounded-[6px] bg-map-district/85 px-1 text-[11px] leading-4 font-semibold whitespace-nowrap text-map-label"
            style={{ left: `${l.box.left}%`, top: `${l.box.top}%` }}
          >
            {l.text}
          </span>
        ))}
        <figcaption className="absolute inset-x-3 top-3 flex flex-wrap items-center justify-between gap-1.5 text-micro">
          <span className="rounded-chip bg-surface/90 px-2.5 py-1 font-semibold text-ink-muted">{label}</span>
          <span className="inline-flex items-center gap-2.5 rounded-chip bg-surface/90 px-2.5 py-1 text-ink-muted">
            <span className="inline-flex items-center gap-1">
              <svg width="16" height="6" aria-hidden><line x1="1" y1="3" x2="15" y2="3" stroke="var(--color-map-route)" strokeWidth="2.5" strokeDasharray="2 3.5" strokeLinecap="round" /></svg>
              Walk
            </span>
            <span className="inline-flex items-center gap-1">
              <svg width="16" height="6" aria-hidden><line x1="1" y1="3" x2="15" y2="3" stroke="var(--color-map-route)" strokeWidth="3" /></svg>
              Taxi
            </span>
            {legs.some((l) => l.leg.mode === 'boat') && (
              <span className="inline-flex items-center gap-1">
                <svg width="16" height="6" aria-hidden><line x1="1" y1="3" x2="15" y2="3" stroke="var(--color-map-route)" strokeWidth="3" strokeDasharray="5 3" /></svg>
                Ferry
              </span>
            )}
          </span>
        </figcaption>
        <span
          className="absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[9px] border-2 border-surface bg-ink text-ink-inverse shadow-card"
          style={{ left: `${placed[0].left}%`, top: `${placed[0].top}%` }}
          role="img"
          aria-label={`Start and end: ${hotel.name} (fictional hotel)`}
        >
          <BedDouble size={14} aria-hidden />
        </span>
        {pins.map((p) => (
          <MapPin
            key={p.placeId}
            n={p.order}
            name={requirePlace(p.placeId).name}
            selected={selectedId === p.placeId}
            style={{ left: `${p.pos.left}%`, top: `${p.pos.top}%` }}
            onClick={() => onSelect(p.placeId)}
          />
        ))}
      </div>
    </figure>
  )
}

export function MapPin({
  n, name, selected, onClick, style,
}: { n: number; name: string; selected: boolean; onClick: () => void; style?: CSSProperties }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`Stop ${n}: ${name}`}
      className={cx('absolute flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center', selected && 'z-10')}
      style={style}
    >
      <span
        className={cx(
          'flex items-center justify-center rounded-full border-2 font-extrabold shadow-raised transition-all',
          selected ? 'size-10 border-ink bg-lime text-body text-ink' : 'size-8 border-surface bg-primary text-small text-ink-inverse',
        )}
      >
        {n}
      </span>
    </button>
  )
}

// ── Timeline ───────────────────────────────────────────────────
// One continuous list inside a rounded surface: time · rail · content.

const ROW = 'grid grid-cols-[58px_32px_minmax(0,1fr)] gap-x-1.5'

function Rail({ dashed, children }: { dashed?: boolean; children?: ReactNode }) {
  return (
    <span className="relative flex justify-center self-stretch" aria-hidden>
      <span className={cx('absolute inset-y-0 left-1/2 -translate-x-1/2 border-l-2', dashed ? 'border-dashed border-line-strong' : 'border-line')} />
      {children && <span className="relative">{children}</span>}
    </span>
  )
}

export function TravelRow({ item }: { item: Extract<TimelineItem, { kind: 'travel' }> }) {
  const { mode, toPier } = item.leg
  const walk = mode === 'walk'
  const Icon = walk ? Footprints : mode === 'boat' ? Ship : CarTaxiFront
  const label = walk ? 'Walk' : mode === 'boat' ? `${toPier === 'car' ? 'Taxi + ferry' : 'Walk + ferry'} across the river` : 'Taxi or ride-hail'
  return (
    <li className={cx(ROW, 'min-h-9 items-center')}>
      <span />
      <Rail dashed={walk} />
      <span className="flex items-center gap-1.5 py-1.5 text-small text-ink-subtle">
        <Icon size={14} aria-hidden className="shrink-0" />
        <span>
          {label} ~{formatDuration(item.leg.mins)} · {item.leg.km} km
          {!walk && item.leg.cost > 0 && <> · ~{formatTHB(item.leg.cost)} pp</>}
          {item.bufferMins > 0 && <> · +{item.bufferMins} min buffer</>}
        </span>
      </span>
    </li>
  )
}

export function BreakRow({ item }: { item: Extract<TimelineItem, { kind: 'meal' | 'rest' }> }) {
  const meal = item.kind === 'meal'
  const Icon = meal ? UtensilsCrossed : Coffee
  return (
    <li className={cx(ROW, 'items-center')}>
      <span className="pt-0.5 text-small text-ink-subtle tabular-nums whitespace-nowrap">{formatClock(item.start)}</span>
      <Rail>
        <span className="flex size-6 items-center justify-center rounded-full bg-surface-sunken text-ink-muted">
          <Icon size={13} />
        </span>
      </Rail>
      <span className="py-2 text-small">
        <span className="font-semibold">{meal ? 'Lunch break' : item.waitFor !== undefined ? 'Free time' : 'Breathing room'}</span>{' '}
        <span className="text-ink-muted">
          · {formatDuration(item.end - item.start)}
          {!meal && item.waitFor && <> · {item.waitFor} suits later in the day</>}
          {meal && <> · ~{formatTHB(item.cost)} pp near {item.near}</>}
        </span>
      </span>
    </li>
  )
}

export function ItineraryStop({
  item, mustVisit, selected, onOpen,
}: { item: Extract<TimelineItem, { kind: 'stop' }>; mustVisit: boolean; selected: boolean; onOpen: () => void }) {
  const p = requirePlace(item.placeId)
  const cost = p.costPerPerson === null ? 'cost unverified' : p.costPerPerson === 0 ? 'free entry' : `~${formatTHB(p.costPerPerson)} pp`
  return (
    <li id={`stop-${p.id}`} className={cx(ROW, 'scroll-mt-28')}>
      <span className="pt-3.5 text-small font-bold tabular-nums whitespace-nowrap">{formatClock(item.start)}</span>
      <Rail>
        <span
          className={cx(
            'mt-2.5 flex items-center justify-center rounded-full border-2 font-extrabold transition-all',
            selected ? 'size-8 border-ink bg-lime text-small text-ink' : 'size-8 border-surface bg-primary text-small text-ink-inverse',
          )}
        >
          {item.order}
        </span>
      </Rail>
      <button
        type="button"
        onClick={onOpen}
        aria-current={selected ? 'true' : undefined}
        className={cx(
          'my-1 flex min-h-16 w-full items-center gap-3 rounded-tile p-2 pl-3 text-left transition-colors',
          selected ? 'bg-lime-soft ring-2 ring-ink' : 'hover:bg-surface-sunken',
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-body leading-snug font-bold">
            <span className="sr-only">Stop {item.order}, {formatClock(item.start)}: </span>
            {p.name}
          </span>
          <span className="mt-0.5 block text-small text-ink-muted">
            {item.isMeal ? 'Lunch stop' : CATEGORY_LABEL[p.category]} · ~{formatDuration(p.visitMins)} · {cost}
          </span>
          {(mustVisit || p.hoursNote === null || p.costPerPerson === null) && (
            <span className="mt-1 flex flex-wrap items-center gap-1.5">
              {mustVisit && <Tag tone="accent" icon={Star}>Must visit</Tag>}
              {(p.hoursNote === null || p.costPerPerson === null) && (
                <span className="inline-flex items-center gap-1 text-micro font-semibold text-warning">
                  <AlertTriangle size={12} aria-label="Warning" />
                  {p.hoursNote === null ? 'Hours unknown — check before you go' : 'Entry cost not verified'}
                </span>
              )}
            </span>
          )}
        </span>
        <PlaceImage src={p.image} alt="" category={p.category} className="size-12 shrink-0 rounded-[12px]" iconSize={18} />
      </button>
    </li>
  )
}

/** Full ordered timeline for one day, including travel, meals and breaks. */
export function DayTimeline({
  schedule, mustVisit, selectedId, onOpen, hotelName,
}: { schedule: DaySchedule; mustVisit: string[]; selectedId: string | null; onOpen: (id: string) => void; hotelName: string }) {
  const hotelDot = (
    <span className="flex size-6 items-center justify-center rounded-[8px] bg-ink text-ink-inverse">
      <BedDouble size={13} />
    </span>
  )
  return (
    <ol className="flex flex-col" aria-label="Day timeline">
      <li className={cx(ROW, 'items-center')}>
        <span className="text-small text-ink-subtle tabular-nums whitespace-nowrap">{formatClock(schedule.start)}</span>
        <span className="relative flex justify-center self-stretch" aria-hidden>
          <span className="absolute top-1/2 bottom-0 left-1/2 -translate-x-1/2 border-l-2 border-line" />
          <span className="relative">{hotelDot}</span>
        </span>
        <span className="py-2 text-small text-ink-muted">Leave {hotelName}</span>
      </li>
      {schedule.items.map((item, i) => {
        if (item.kind === 'stop') return <ItineraryStop key={i} item={item} mustVisit={mustVisit.includes(item.placeId)} selected={selectedId === item.placeId} onOpen={() => onOpen(item.placeId)} />
        if (item.kind === 'travel') return <TravelRow key={i} item={item} />
        return <BreakRow key={i} item={item} />
      })}
      <li className={cx(ROW, 'items-center')}>
        <span className="text-small text-ink-subtle tabular-nums">~{formatClock(schedule.end)}</span>
        <span className="relative flex justify-center self-stretch" aria-hidden>
          <span className="absolute top-0 bottom-1/2 left-1/2 -translate-x-1/2 border-l-2 border-line" />
          <span className="relative">{hotelDot}</span>
        </span>
        <span className="py-2 text-small text-ink-muted">Back at the hotel</span>
      </li>
    </ol>
  )
}

// ── Cost summary ───────────────────────────────────────────────

export function CostSummary({
  title, cost, budget, compact, perDay, actions,
}: { title: string; cost: CostBreakdown; budget?: number | null; compact?: boolean; perDay?: number[]; actions?: ReactNode }) {
  const ratio = budget ? cost.total / budget : 0
  const over = budget ? cost.total - budget : 0
  return (
    <section aria-label={title} className="rounded-card bg-surface p-4 shadow-card">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-heading font-bold">{title}</h3>
        <p className="text-title font-extrabold tabular-nums">
          ~{formatTHB(cost.total)} <span className="text-small font-medium text-ink-muted">pp</span>
        </p>
      </div>
      {budget ? (
        <div className="mt-2.5">
          <div
            className="h-2 overflow-hidden rounded-chip bg-surface-sunken"
            role="meter"
            aria-label="Estimated spend against budget"
            aria-valuemin={0}
            aria-valuemax={budget}
            aria-valuenow={cost.total}
          >
            <div className={cx('h-full rounded-chip', over > 0 ? 'bg-danger' : 'bg-primary')} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
          </div>
          <p className={cx('mt-1.5 text-small', over > 0 ? 'font-semibold text-danger' : 'text-ink-muted')}>
            {over > 0
              ? `Over budget by ${formatTHB(over)} (budget ${formatTHB(budget)})`
              : `${formatTHB(budget - cost.total)} left of ${formatTHB(budget)} budget`}
          </p>
        </div>
      ) : null}
      {!compact && (
        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-small">
          {(perDay
            ? perDay.map((v, i) => [`Day ${i + 1}`, v] as const)
            : ([['Activities', cost.activities], ['Food', cost.food], ['Transport', cost.transport]] as const)
          ).map(([k, v]) => (
            <div key={k} className="flex gap-1">
              <dt className="text-ink-muted">{k}</dt>
              <dd className="font-semibold tabular-nums">{formatTHB(v)}</dd>
            </div>
          ))}
        </dl>
      )}
      {perDay && !compact && (
        <p className="mt-1 text-small text-ink-muted">
          Activities {formatTHB(cost.activities)} · Food {formatTHB(cost.food)} · Transport {formatTHB(cost.transport)}
        </p>
      )}
      {cost.unpriced > 0 && (
        <p className="mt-2 flex items-center gap-1 text-small text-warning">
          <AlertTriangle size={13} aria-label="Warning" /> {plural(cost.unpriced, 'stop')} without a cost estimate — not included above.
        </p>
      )}
      <p className="mt-2 text-micro text-ink-subtle">Sample estimates in THB. Covers activities, food and local transport; excludes flights, accommodation and shopping.</p>
      {actions && <div className="mt-2 flex flex-wrap gap-x-1 gap-y-0">{actions}</div>}
    </section>
  )
}

// ── Change comparison ──────────────────────────────────────────

export function ChangeComparison({ diff }: { diff: PlanDiff }) {
  const dayName = (i: number) => `Day ${i + 1}`
  const rows: { label: string; before: string; after: string; delta: string; better: boolean | null }[] = [
    {
      label: 'Est. cost pp',
      before: formatTHB(diff.before.cost.total),
      after: formatTHB(diff.after.cost.total),
      delta: formatSignedTHB(diff.costDelta),
      better: diff.costDelta === 0 ? null : diff.costDelta < 0,
    },
    {
      label: 'Walking',
      before: formatDuration(diff.before.walkMins),
      after: formatDuration(diff.after.walkMins),
      delta: formatSignedDuration(diff.walkMinsDelta),
      better: diff.walkMinsDelta === 0 ? null : diff.walkMinsDelta < 0,
    },
    {
      label: 'Taxi & ferry',
      before: formatDuration(diff.before.carMins),
      after: formatDuration(diff.after.carMins),
      delta: formatSignedDuration(diff.carMinsDelta),
      better: null,
    },
    {
      label: 'Stops',
      before: String(diff.before.stopCount),
      after: String(diff.after.stopCount),
      delta: diff.after.stopCount === diff.before.stopCount ? 'no change' : `${diff.after.stopCount > diff.before.stopCount ? '+' : '−'}${Math.abs(diff.after.stopCount - diff.before.stopCount)}`,
      better: null,
    },
  ]
  return (
    <div className="flex flex-col gap-3">
      <table className="w-full text-small">
        <caption className="sr-only">Plan before and after this change</caption>
        <thead>
          <tr className="text-left text-micro text-ink-subtle uppercase">
            <th scope="col" className="pb-1 font-semibold">Whole trip</th>
            <th scope="col" className="pb-1 font-semibold">Before</th>
            <th scope="col" className="pb-1 font-semibold">After</th>
            <th scope="col" className="pb-1 text-right font-semibold">Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-line">
              <th scope="row" className="py-2 text-left font-medium">{r.label}</th>
              <td className="py-2 text-ink-muted">{r.before}</td>
              <td className="py-2 font-semibold">{r.after}</td>
              <td className={cx('py-2 text-right font-semibold', r.better === true && 'text-success', r.better === false && 'text-danger')}>{r.delta}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {(diff.added.length > 0 || diff.removed.length > 0 || diff.moved.length > 0 || diff.modeChanged) && (
        <ul className="flex flex-col gap-1.5 text-small" aria-label="Changes to stops">
          {diff.modeChanged && <DiffLine sign="~" tone="neutral">Getting around: taxi or ride-hail for most hops over ~400 m</DiffLine>}
          {diff.removed.map((r) => (
            <DiffLine key={`r${r.placeId}`} sign="−" tone="danger">
              Remove {requirePlace(r.placeId).name} <span className="text-ink-subtle">({dayName(r.day)})</span>
            </DiffLine>
          ))}
          {diff.added.map((a) => (
            <DiffLine key={`a${a.placeId}`} sign="+" tone="success">
              Add {requirePlace(a.placeId).name} <span className="text-ink-subtle">({dayName(a.day)})</span>
            </DiffLine>
          ))}
          {diff.moved.map((m) => (
            <DiffLine key={`m${m.placeId}`} sign="→" tone="neutral">
              Move {requirePlace(m.placeId).name} <span className="text-ink-subtle">{dayName(m.from)}</span> <ArrowRight size={12} className="inline" aria-label="to" />{' '}
              <span className="text-ink-subtle">{dayName(m.to)}</span>
            </DiffLine>
          ))}
        </ul>
      )}
      {diff.dayEndDeltas.some((d) => d !== 0) && (
        <p className="text-small text-ink-muted">
          Day end times:{' '}
          {diff.dayEndDeltas
            .map((d, i) => (d === 0 ? null : `${dayName(i)} ${d < 0 ? 'ends' : 'runs'} ${formatDuration(Math.abs(d))} ${d < 0 ? 'earlier' : 'later'}`))
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
    </div>
  )
}

function DiffLine({ sign, tone, children }: { sign: string; tone: 'success' | 'danger' | 'neutral'; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span
        aria-hidden
        className={cx(
          'flex size-5 shrink-0 items-center justify-center rounded-full text-micro font-bold',
          tone === 'success' && 'bg-success-soft text-success',
          tone === 'danger' && 'bg-danger-soft text-danger',
          tone === 'neutral' && 'bg-surface-sunken text-ink-muted',
        )}
      >
        {sign}
      </span>
      <span>{children}</span>
    </li>
  )
}
