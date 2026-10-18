/*
 * Itinerary edits and the four supported "Adjust plan" rules.
 * Every function is pure: it returns a new itinerary/brief and never mutates.
 * Must-visit places are never removed by an adjustment.
 */
import { getHotel } from '../data/catalog'
import { PLACES, requirePlace } from '../data/places'
import { formatTHB } from '../lib/format'
import { centroid, dayFits, dayOfPlace, insertCheapest, isOpenOnDay, orderDay, OVERFLOW_MAX_KM, scheduleDay, summarize, type TripSummary } from './planner'
import type { Itinerary, Place, Trip, TripBrief } from './types'

/** Sample THB thresholds for "Lower the cost": stops from ฿200, alternatives at ≤60% of the price, drop from ฿400. */
export const LOWER_COST = { minCost: 200, maxAltShare: 0.6, dropFrom: 400 }

export type PlanState = Pick<Trip, 'brief' | 'placeIds' | 'mustVisit'> & { itinerary: Itinerary }

const hotelPoint = (brief: TripBrief) => {
  const h = getHotel(brief.startLocationId)
  return { x: h.x, y: h.y }
}
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)
const cloneIt = (it: Itinerary): Itinerary => ({
  ...it,
  days: it.days.map((d) => ({ ...d, placeIds: [...d.placeIds] })),
  unscheduled: [...it.unscheduled],
  edits: [...it.edits],
})
const allScheduled = (it: Itinerary) => it.days.flatMap((d) => d.placeIds)

// ── Direct edits ───────────────────────────────────────────────

export function removeFromDay(it: Itinerary, placeId: string): Itinerary {
  const next = cloneIt(it)
  next.days.forEach((d) => (d.placeIds = d.placeIds.filter((id) => id !== placeId)))
  if (!next.unscheduled.includes(placeId)) next.unscheduled.push(placeId)
  next.edits.push(`Removed ${requirePlace(placeId).name} from the plan`)
  return next
}

export function moveToDay(it: Itinerary, placeId: string, toDay: number, brief: TripBrief): Itinerary {
  const next = cloneIt(it)
  const from = dayOfPlace(next, placeId)
  next.days.forEach((d) => (d.placeIds = d.placeIds.filter((id) => id !== placeId)))
  next.unscheduled = next.unscheduled.filter((id) => id !== placeId)
  next.days[toDay].placeIds = insertCheapest(next.days[toDay].placeIds, placeId, hotelPoint(brief))
  next.edits.push(
    from === -1
      ? `Added ${requirePlace(placeId).name} to day ${toDay + 1}`
      : `Moved ${requirePlace(placeId).name} from day ${from + 1} to day ${toDay + 1}`,
  )
  return next
}

export function swapPlace(it: Itinerary, oldId: string, newId: string): Itinerary {
  const next = cloneIt(it)
  next.days.forEach((d) => (d.placeIds = d.placeIds.map((id) => (id === oldId ? newId : id))))
  next.unscheduled = next.unscheduled.filter((id) => id !== newId)
  if (!next.unscheduled.includes(oldId)) next.unscheduled.push(oldId)
  next.edits.push(`Swapped ${requirePlace(oldId).name} for ${requirePlace(newId).name}`)
  return next
}

/** Alternatives for swapping: same category first, then nearby, excluding places already on a day. */
export function swapAlternatives(it: Itinerary, placeId: string, limit = 4, brief?: TripBrief): Place[] {
  const cur = requirePlace(placeId)
  const used = new Set(allScheduled(it))
  const day = dayOfPlace(it, placeId)
  return PLACES.filter(
    (p) => p.destinationId === cur.destinationId && p.id !== placeId && !used.has(p.id) && (!brief || day < 0 || isOpenOnDay(p.id, brief, day)),
  )
    .map((p) => ({ p, score: (p.category === cur.category ? 0 : 6) + dist(p, cur) }))
    .sort((a, b) => a.score - b.score || a.p.id.localeCompare(b.p.id))
    .slice(0, limit)
    .map((x) => x.p)
}

// ── Comparison ─────────────────────────────────────────────────

export interface PlanDiff {
  added: { placeId: string; day: number }[]
  removed: { placeId: string; day: number }[]
  moved: { placeId: string; from: number; to: number }[]
  costDelta: number
  walkMinsDelta: number
  walkKmDelta: number
  carMinsDelta: number
  before: TripSummary
  after: TripSummary
  modeChanged: boolean
  dayEndDeltas: number[]
}

export function comparePlans(before: PlanState, after: PlanState): PlanDiff {
  const b = summarize(before.itinerary, before.brief)
  const a = summarize(after.itinerary, after.brief)
  const added: PlanDiff['added'] = []
  const removed: PlanDiff['removed'] = []
  const moved: PlanDiff['moved'] = []
  const ids = new Set([...allScheduled(before.itinerary), ...allScheduled(after.itinerary)])
  ids.forEach((id) => {
    const from = dayOfPlace(before.itinerary, id)
    const to = dayOfPlace(after.itinerary, id)
    if (from === -1 && to !== -1) added.push({ placeId: id, day: to })
    else if (from !== -1 && to === -1) removed.push({ placeId: id, day: from })
    else if (from !== to) moved.push({ placeId: id, from, to })
  })
  return {
    added,
    removed,
    moved,
    costDelta: a.cost.total - b.cost.total,
    walkMinsDelta: a.walkMins - b.walkMins,
    walkKmDelta: Math.round((a.walkKm - b.walkKm) * 10) / 10,
    carMinsDelta: a.carMins - b.carMins,
    before: b,
    after: a,
    modeChanged: before.brief.travelMode !== after.brief.travelMode,
    dayEndDeltas: a.days.map((d, i) => d.end - (b.days[i]?.end ?? d.end)),
  }
}

export const isNoChange = (d: PlanDiff) =>
  !d.added.length && !d.removed.length && !d.moved.length && d.costDelta === 0 && d.walkMinsDelta === 0 && d.carMinsDelta === 0 && d.dayEndDeltas.every((x) => x === 0)

// ── Adjustment rules ───────────────────────────────────────────

export type AdjustKind = 'less-walking' | 'lower-cost' | 'more-cafes' | 'relax-day'

export const ADJUSTMENTS: { kind: AdjustKind; label: string; hint: string }[] = [
  { kind: 'less-walking', label: 'Less walking', hint: 'Use taxi or ride-hail for most hops' },
  { kind: 'lower-cost', label: 'Lower the cost', hint: 'Swap or drop pricier flexible stops' },
  { kind: 'more-cafes', label: 'More cafés', hint: 'Add café stops near your route' },
  { kind: 'relax-day', label: 'A slower day', hint: 'Fewer stops and more rest on one day' },
]

export interface Proposal {
  kind: AdjustKind
  title: string
  explanation: string[]
  next: PlanState
  /** Set when the rule found nothing it could change. */
  noChangeReason?: string
}

export function propose(kind: AdjustKind, state: PlanState, dayIndex: number): Proposal {
  switch (kind) {
    case 'less-walking':
      return lessWalking(state)
    case 'lower-cost':
      return lowerCost(state)
    case 'more-cafes':
      return moreCafes(state)
    case 'relax-day':
      return relaxDay(state, dayIndex)
  }
}

function lessWalking(state: PlanState): Proposal {
  const title = 'Less walking'
  if (state.brief.travelMode === 'car-first') {
    return {
      kind: 'less-walking', title, explanation: [], next: state,
      noChangeReason: 'Taxi or ride-hail transfers are already used for everything except hops under about 400 m.',
    }
  }
  const brief: TripBrief = { ...state.brief, travelMode: 'car-first' }
  const itinerary = cloneIt(state.itinerary)
  itinerary.edits.push('Switched to taxi/ride-hail transfers for most hops')
  const before = summarize(state.itinerary, state.brief)
  const walkLegs = before.days.flatMap((d) => d.items).filter((i) => i.kind === 'travel' && i.leg.mode === 'walk' && i.leg.km > 0.4).length
  return {
    kind: 'less-walking', title,
    explanation: [
      `Walking is kept only for hops under about 400 m; ${walkLegs} longer walks become short taxi or ride-hail trips.`,
      'Your stops and their order stay the same. The ferry to Wat Arun stays a ferry.',
      'Rides add a small fare and pickup time, shown below (sample estimates).',
    ],
    next: { ...state, brief, itinerary },
  }
}

function lowerCost(state: PlanState): Proposal {
  const itinerary = cloneIt(state.itinerary)
  const used = new Set(allScheduled(itinerary))
  const explanation: string[] = []
  const candidates = allScheduled(itinerary)
    .map(requirePlace)
    .filter((p) => !state.mustVisit.includes(p.id) && (p.costPerPerson ?? 0) >= LOWER_COST.minCost)
    .sort((a, b) => (b.costPerPerson ?? 0) - (a.costPerPerson ?? 0) || a.id.localeCompare(b.id))
    .slice(0, 3)

  for (const p of candidates) {
    const cost = p.costPerPerson ?? 0
    const day = dayOfPlace(itinerary, p.id)
    const alt = PLACES.filter(
      (q) =>
        q.destinationId === p.destinationId &&
        q.category === p.category &&
        !used.has(q.id) &&
        q.costPerPerson !== null &&
        q.costPerPerson <= cost * LOWER_COST.maxAltShare &&
        isOpenOnDay(q.id, state.brief, day),
    ).sort((a, b) => dist(a, p) - dist(b, p) || a.id.localeCompare(b.id))[0]
    if (alt) {
      const swapped = itinerary.days[day].placeIds.map((id) => (id === p.id ? alt.id : id))
      if (dayFits(scheduleDay(swapped, state.brief, itinerary.days[day].pace))) {
        itinerary.days[day].placeIds = swapped
        itinerary.unscheduled.push(p.id)
        used.add(alt.id)
        explanation.push(`Swap ${p.name} (~${formatTHB(cost)}) for ${alt.name} (~${formatTHB(alt.costPerPerson!)}), a similar ${alt.category === 'cafe' ? 'café' : alt.category === 'food' ? 'food stop' : 'stop'} on day ${day + 1}.`)
        continue
      }
    }
    if (cost >= LOWER_COST.dropFrom) {
      itinerary.days[day].placeIds = itinerary.days[day].placeIds.filter((id) => id !== p.id)
      itinerary.unscheduled.push(p.id)
      explanation.push(`Drop ${p.name} (~${formatTHB(cost)}); there’s no similar lower-cost option that fits. It stays in your saved places.`)
    }
  }
  if (!explanation.length) {
    return {
      kind: 'lower-cost', title: 'Lower the cost', explanation: [], next: state,
      noChangeReason: `Every remaining paid stop is either a must-visit or already under ${formatTHB(LOWER_COST.minCost)} per person.`,
    }
  }
  explanation.push('Must-visit places are unchanged. Prices are sample estimates.')
  itinerary.edits.push('Lowered the cost')
  return { kind: 'lower-cost', title: 'Lower the cost', explanation, next: { ...state, itinerary } }
}

function moreCafes(state: PlanState): Proposal {
  const itinerary = cloneIt(state.itinerary)
  const start = hotelPoint(state.brief)
  const used = new Set(allScheduled(itinerary))
  const explanation: string[] = []
  let added = 0
  itinerary.days.forEach((day, d) => {
    if (added >= 2 || day.placeIds.length === 0) return
    if (day.placeIds.some((id) => requirePlace(id).category === 'cafe')) return
    const stops = day.placeIds.map(requirePlace)
    const nearest = PLACES.filter((p) => p.category === 'cafe' && p.destinationId === stops[0].destinationId && !used.has(p.id) && isOpenOnDay(p.id, state.brief, d))
      .map((p) => ({ p, km: Math.min(...stops.map((s) => dist(s, p))) }))
      .sort((a, b) => a.km - b.km || a.p.id.localeCompare(b.p.id))[0]
    if (!nearest) return
    let ids = insertCheapest(day.placeIds, nearest.p.id, start)
    let dropped: Place | undefined
    if (!dayFits(scheduleDay(ids, state.brief, day.pace))) {
      // Make room by dropping the longest flexible stop that isn't a café (the one farther from the
      // new café on a tie). Places open only on some days (e.g. a weekend market) go last.
      dropped = stops
        .filter((s) => !state.mustVisit.includes(s.id) && s.category !== 'cafe')
        .sort(
          (a, b) =>
            Number(!!a.openDays) - Number(!!b.openDays) ||
            b.visitMins - a.visitMins ||
            dist(b, nearest.p) - dist(a, nearest.p) ||
            a.id.localeCompare(b.id),
        )[0]
      if (!dropped) return
      ids = ids.filter((id) => id !== dropped!.id)
      if (!dayFits(scheduleDay(ids, state.brief, day.pace))) return
    }
    itinerary.days[d].placeIds = ids
    itinerary.unscheduled = itinerary.unscheduled.filter((id) => id !== nearest.p.id)
    if (dropped) itinerary.unscheduled.push(dropped.id)
    used.add(nearest.p.id)
    added++
    explanation.push(
      `Add ${nearest.p.name} on day ${d + 1}, roughly ${Math.max(0.1, Math.round(nearest.km * 12.5) / 10)} km from your nearest stop (estimate).` +
        (dropped ? ` To keep the day’s pace, ${dropped.name} moves to “Not in the plan”.` : ''),
    )
  })
  if (!added) {
    return {
      kind: 'more-cafes', title: 'More cafés', explanation: [], next: state,
      noChangeReason: 'Each day already has a café, or there isn’t room without removing a must-visit.',
    }
  }
  itinerary.edits.push('Added café stops')
  return { kind: 'more-cafes', title: 'More cafés', explanation, next: { ...state, itinerary } }
}

function relaxDay(state: PlanState, dayIndex: number): Proposal {
  const title = `Make day ${dayIndex + 1} more relaxed`
  const itinerary = cloneIt(state.itinerary)
  const day = itinerary.days[dayIndex]
  if (!day || day.pace === 'relaxed' || (state.brief.pace === 'relaxed' && !day.pace)) {
    return { kind: 'relax-day', title, explanation: [], next: state, noChangeReason: `Day ${dayIndex + 1} already uses the relaxed pace.` }
  }
  day.pace = 'relaxed'
  const start = hotelPoint(state.brief)
  const explanation = [`Day ${dayIndex + 1} starts later (9:30 am), ends by about 6 pm, and gets an hour’s rest after lunch.`]
  // Drop flexible stops, least-interesting/longest first, until the relaxed day fits.
  while (!dayFits(scheduleDay(day.placeIds, state.brief, 'relaxed'))) {
    const flexible = day.placeIds
      .map(requirePlace)
      .filter((p) => !state.mustVisit.includes(p.id))
      .sort((a, b) => b.visitMins - a.visitMins || a.id.localeCompare(b.id))
    const victim = flexible[0]
    if (!victim) {
      explanation.push('Only must-visits remain, so the day may still run a little long.')
      break
    }
    day.placeIds = day.placeIds.filter((id) => id !== victim.id)
    const target = itinerary.days.findIndex(
      (d, i) =>
        i !== dayIndex &&
        d.placeIds.length > 0 &&
        isOpenOnDay(victim.id, state.brief, i) &&
        dist(centroid(d.placeIds), victim) <= OVERFLOW_MAX_KM &&
        dayFits(scheduleDay(insertCheapest(d.placeIds, victim.id, start), state.brief, d.pace)),
    )
    if (target !== -1) {
      itinerary.days[target].placeIds = insertCheapest(itinerary.days[target].placeIds, victim.id, start)
      explanation.push(`Move ${victim.name} to day ${target + 1}, which has room.`)
    } else {
      itinerary.unscheduled.push(victim.id)
      explanation.push(`Set aside ${victim.name}; no other day has room. It stays in your saved places.`)
    }
  }
  day.placeIds = orderDay(day.placeIds, start)
  itinerary.edits.push(`Relaxed day ${dayIndex + 1}`)
  return { kind: 'relax-day', title, explanation, next: { ...state, itinerary } }
}

// ── Free-text matching ─────────────────────────────────────────

const KEYWORDS: [AdjustKind, RegExp][] = [
  ['less-walking', /\b(walk|walking|feet|legs|on foot|taxi|cab|car|grab|bolt|tuk-?tuk|ride-?hail|rides)\b/i],
  ['lower-cost', /\b(cheap|cheaper|cost|costs|budget|expensive|money|save|spend|price|afford)/i],
  ['more-cafes', /\b(caf[eé]s?|coffee|tea|kopi)\b/i],
  ['relax-day', /\b(relax|relaxed|slow|slower|tired|easy|rest|chill|calm|less rushed|fewer stops)\b/i],
]

const ORDINAL_DAY: Record<string, number> = { first: 0, second: 1, third: 2, '1st': 0, '2nd': 1, '3rd': 2 }

/**
 * Parses a free-text request into a supported adjustment plus an optional day,
 * e.g. "Make day 2 more relaxed" → { kind: 'relax-day', dayIndex: 1 }.
 * `days` bounds the day number; out-of-range days are ignored.
 */
export function parseRequest(text: string, days = 3): { kind: AdjustKind | null; dayIndex?: number } {
  const kind = matchRequest(text)
  const m = text.match(/\bday\s*(\d+)\b/i) ?? text.match(/\b(first|second|third|1st|2nd|3rd)\s+day\b/i)
  if (!m) return { kind }
  const n = /^\d+$/.test(m[1]) ? Number(m[1]) - 1 : ORDINAL_DAY[m[1].toLowerCase()]
  return n >= 0 && n < days ? { kind, dayIndex: n } : { kind }
}

// ── Conflicts ──────────────────────────────────────────────────

export type Conflict =
  | { kind: 'must-visit'; title: string; detail: string; placeIds: string[] }
  | { kind: 'budget'; title: string; detail: string; overBy: number }

/**
 * Things the traveller should decide on before applying a proposal:
 * a day that still runs late because only must-visits remain, a cost cut that
 * can't reach the budget because must-visits carry the cost, or a change that
 * pushes the plan over (or further over) the budget.
 */
export function findConflicts(p: Proposal, diff: PlanDiff, state: PlanState, dayIndex: number): Conflict[] {
  const out: Conflict[] = []
  const budget = diff.after.budget
  const names = (ids: string[]) => ids.map((id) => requirePlace(id).name).join(', ')
  if (p.kind === 'relax-day' && diff.after.days[dayIndex]?.overTime) {
    const ids = state.itinerary.days[dayIndex].placeIds.filter((id) => state.mustVisit.includes(id))
    out.push({
      kind: 'must-visit',
      title: `Day ${dayIndex + 1} may still run late`,
      detail: `Its must-visits (${names(ids)}) stay in the plan, so the slower pace can’t fully fit.`,
      placeIds: ids,
    })
  }
  if (budget && diff.after.overBudgetBy > 0) {
    if (p.kind === 'lower-cost') {
      const ids = state.mustVisit
        .filter((id) => dayOfPlace(p.next.itinerary, id) >= 0 && (requirePlace(id).costPerPerson ?? 0) > 0)
        .sort((a, b) => (requirePlace(b).costPerPerson ?? 0) - (requirePlace(a).costPerPerson ?? 0))
      out.push({
        kind: 'must-visit',
        title: `Still about ${formatTHB(diff.after.overBudgetBy)} over budget`,
        detail: ids.length
          ? `Roam won’t drop must-visits, and they carry the biggest remaining costs (${ids
              .slice(0, 3)
              .map((id) => `${requirePlace(id).name} ~${formatTHB(requirePlace(id).costPerPerson!)}`)
              .join(', ')}).`
          : 'Meals and transfers make up most of what’s left.',
        placeIds: ids,
      })
    } else if (diff.costDelta > 0) {
      out.push({
        kind: 'budget',
        title: diff.before.overBudgetBy > 0 ? 'Adds to a plan that’s already over budget' : 'This would go over your budget',
        detail: `The sample estimate would be about ${formatTHB(diff.after.cost.total)} per person against ${formatTHB(budget)}.`,
        overBy: diff.after.overBudgetBy,
      })
    }
  }
  return out
}

/**
 * True when a day's stops sit close together (one district, short spread),
 * which is when "grouped nearby stops" is an honest description.
 */
export function isCompactDay(placeIds: string[], maxSpreadKm = 2): boolean {
  if (placeIds.length < 3) return false
  const ps = placeIds.map(requirePlace)
  if (new Set(ps.map((p) => p.zone)).size > 1) return false
  return ps.every((a) => ps.every((b) => dist(a, b) <= maxSpreadKm))
}

/** Map a free-text request to one supported adjustment, or null if unsupported. */
export function matchRequest(text: string): AdjustKind | null {
  const t = text.trim()
  if (!t) return null
  for (const [kind, re] of KEYWORDS) if (re.test(t)) return kind
  return null
}
