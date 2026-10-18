/*
 * Deterministic trip planner.
 *
 * Rules, not AI: places are grouped into days by area on a schematic distance
 * grid, ordered by preferred time of day, then timed with
 * sample visit durations, transfer estimates, lunch and breathing-room breaks.
 * Every number is an estimate derived from the mock data in /data.
 */
import { getHotel } from '../data/catalog'
import { requirePlace } from '../data/places'
import { addDays } from '../lib/format'
import type { BestTime, DayPlan, Itinerary, Pace, Place, TravelMode, Trip, TripBrief, Zone } from './types'

export const SUPPORTED_DAYS = 3
export const SUPPORTED_DESTINATION = 'bangkok'

export interface PaceRules {
  label: string
  start: number // minutes from midnight
  end: number
  bufferMins: number
  maxStops: number
  restMins: number
}

export const PACE_RULES: Record<Pace, PaceRules> = {
  relaxed: { label: 'Relaxed', start: 9 * 60 + 30, end: 18 * 60, bufferMins: 15, maxStops: 4, restMins: 60 },
  balanced: { label: 'Balanced', start: 9 * 60, end: 19 * 60 + 30, bufferMins: 10, maxStops: 6, restMins: 30 },
  packed: { label: 'Packed', start: 8 * 60 + 30, end: 21 * 60, bufferMins: 0, maxStops: 8, restMins: 0 },
}

/** Sample assumptions — surfaced in the UI under "Why this plan?". */
export const ASSUMPTIONS = {
  routeFactor: 1.25, // straight-line → street distance
  walkKmh: 4.5,
  carKmh: 15, // city traffic, sample
  carOverheadMins: 10, // booking, pickup, drop-off
  carBaseFare: 45, // THB per taxi/ride-hail ride, sample
  carPerKm: 9, // THB per km, sample
  walkLimitKm: { 'walk-car': 1.2, 'car-first': 0.4 } as Record<TravelMode, number>,
  ferryMins: 15, // cross-river ferry incl. waiting, sample
  ferryCost: 5, // THB per person, sample
  lunchMins: 60,
  lunchCost: 200, // THB per person, sample
  lunchFrom: 12 * 60 + 15,
}

/** Tha Tien pier on the Rattanakosin bank, where the cross-river ferry to Wat Arun leaves (schematic). */
export const FERRY_PIER: Point = { x: -0.86, y: -0.02 }

export interface Point {
  x: number
  y: number
  /** Set for points on the Thonburi bank; crossing to or from them needs the ferry. */
  riverSide?: 'thonburi'
}

export interface Leg {
  /** car = taxi or ride-hail; boat = cross-river ferry, plus a walk or ride to the pier. */
  mode: 'walk' | 'car' | 'boat'
  km: number
  mins: number
  /** Per-person cost, THB (ride fares split between travellers). */
  cost: number
  /** For boat legs: how the traveller reaches the pier on the city side. */
  toPier?: 'walk' | 'car'
}

function landLeg(a: Point, b: Point, travelMode: TravelMode, travellers: number): Leg {
  const km = Math.round(Math.hypot(a.x - b.x, a.y - b.y) * ASSUMPTIONS.routeFactor * 10) / 10
  if (km <= ASSUMPTIONS.walkLimitKm[travelMode]) {
    return { mode: 'walk', km, mins: Math.max(3, Math.ceil((km / ASSUMPTIONS.walkKmh) * 60)), cost: 0 }
  }
  const mins = Math.ceil((km / ASSUMPTIONS.carKmh) * 60) + ASSUMPTIONS.carOverheadMins
  const fare = ASSUMPTIONS.carBaseFare + ASSUMPTIONS.carPerKm * km
  const perPerson = Math.round(fare / Math.max(1, travellers) / 10) * 10
  return { mode: 'car', km, mins, cost: perPerson }
}

/**
 * Sample transfer between two points. Crossing the Chao Phraya (to or from the
 * Thonburi bank) is modelled as a walk or ride to Tha Tien pier plus a short ferry.
 */
export function legBetween(a: Point, b: Point, travelMode: TravelMode, travellers: number): Leg {
  if ((a.riverSide ?? null) === (b.riverSide ?? null)) return landLeg(a, b, travelMode, travellers)
  const cityPoint = a.riverSide ? b : a
  const land = landLeg(cityPoint, FERRY_PIER, travelMode, travellers)
  const pierWalk = land.mode === 'walk'
  return {
    mode: 'boat',
    km: Math.round((land.km + 0.4) * 10) / 10,
    mins: land.mins + ASSUMPTIONS.ferryMins,
    cost: land.cost + ASSUMPTIONS.ferryCost,
    toPier: pierWalk ? 'walk' : 'car',
  }
}

// ── Opening days (sample) ──────────────────────────────────────

const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Day of week (0 = Sunday) for trip day `dayIndex`, or null when no start date is set. */
export function weekdayOf(brief: Pick<TripBrief, 'startDate'>, dayIndex: number): number | null {
  if (!brief.startDate) return null
  const [y, m, d] = addDays(brief.startDate, dayIndex).split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

/** Whether a place is usually open on trip day `dayIndex` (sample opening days; unknown dates count as open). */
export function isOpenOnDay(placeId: string, brief: Pick<TripBrief, 'startDate'>, dayIndex: number): boolean {
  const p = requirePlace(placeId)
  if (!p.openDays) return true
  const wd = weekdayOf(brief, dayIndex)
  return wd === null || p.openDays.includes(wd)
}

/** Places restricted to certain days that are closed on every day of this trip. */
export const isClosedAllTrip = (placeId: string, brief: Pick<TripBrief, 'startDate' | 'days'>) =>
  Array.from({ length: brief.days }, (_, d) => d).every((d) => !isOpenOnDay(placeId, brief, d))

/** Human label for a place's sample opening days, e.g. "Saturday and Sunday". */
export function openDaysLabel(placeId: string): string | null {
  const days = requirePlace(placeId).openDays
  if (!days) return null
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'weekends'
  return days.map((d) => WEEKDAY[d]).join(', ')
}

/** Why a place can't go on its dates, if that's the reason it's not in the plan. */
export function closedReason(placeId: string, brief: TripBrief): string | null {
  if (!isClosedAllTrip(placeId, brief)) return null
  return `Usually open ${openDaysLabel(placeId)} only — not on your dates`
}

// ── Day schedule ───────────────────────────────────────────────

export type TimelineItem =
  | { kind: 'stop'; placeId: string; order: number; start: number; end: number; cost: number | null; isMeal: boolean }
  | { kind: 'travel'; fromLabel: string; toLabel: string; leg: Leg; bufferMins: number; start: number }
  | { kind: 'meal'; start: number; end: number; cost: number; near: string }
  | { kind: 'rest'; start: number; end: number; restMins: number; /** Free time before a place that suits the evening. */ waitFor?: string /* '' = plain free time */ }

export interface CostBreakdown {
  activities: number
  food: number
  transport: number
  total: number
  unpriced: number // count of stops without a price estimate
}

export interface DaySchedule {
  items: TimelineItem[]
  start: number
  end: number
  pace: Pace
  rules: PaceRules
  overTime: boolean
  overStops: boolean
  walkMins: number
  walkKm: number
  carMins: number
  carRides: number
  cost: CostBreakdown
  stopCount: number
}

export const isFoodStop = (p: Place) => p.category === 'food' || (p.category === 'cafe' && p.bestTime === 'midday')

export function scheduleDay(placeIds: string[], brief: TripBrief, paceOverride?: Pace): DaySchedule {
  const pace = paceOverride ?? brief.pace
  const rules = PACE_RULES[pace]
  const hotel = getHotel(brief.startLocationId)
  const items: TimelineItem[] = []
  const cost: CostBreakdown = { activities: 0, food: 0, transport: 0, total: 0, unpriced: 0 }
  let clock = rules.start
  let hadLunch = false
  let walkMins = 0
  let walkKm = 0
  let carMins = 0
  let carRides = 0
  let prev: Point & { label: string } = { x: hotel.x, y: hotel.y, label: hotel.name }

  const travel = (to: Point & { label: string }, withBuffer: boolean) => {
    const leg = legBetween(prev, to, brief.travelMode, brief.travellers)
    const bufferMins = withBuffer ? rules.bufferMins : 0
    items.push({ kind: 'travel', fromLabel: prev.label, toLabel: to.label, leg, bufferMins, start: clock })
    clock += leg.mins + bufferMins
    if (leg.mode === 'walk') {
      walkMins += leg.mins
      walkKm += leg.km
    } else if (leg.mode === 'boat') {
      // Ferry time counts as a ride; a walk to the pier is part of it, not a separate walk.
      carMins += leg.mins
      if (leg.toPier === 'car') carRides += 1
    } else {
      carMins += leg.mins
      carRides += 1
    }
    cost.transport += leg.cost
    prev = to
  }

  const addLunchAndRest = (rest = true) => {
    items.push({ kind: 'meal', start: clock, end: clock + ASSUMPTIONS.lunchMins, cost: ASSUMPTIONS.lunchCost, near: prev.label })
    clock += ASSUMPTIONS.lunchMins
    cost.food += ASSUMPTIONS.lunchCost
    hadLunch = true
    if (rest) addRest()
  }
  const addRest = () => {
    if (rules.restMins > 0) {
      items.push({ kind: 'rest', start: clock, end: clock + rules.restMins, restMins: rules.restMins })
      clock += rules.restMins
    }
  }

  const addWait = (until: number, label: string) => {
    if (until <= clock) return
    items.push({ kind: 'rest', start: clock, end: until, restMins: until - clock, waitFor: label })
    clock = until
  }

  placeIds.forEach((id, i) => {
    const p = requirePlace(id)
    const servesLunch = isFoodStop(p)
    // Insert a lunch break before this stop if we're past lunchtime and it isn't a meal stop.
    if (!hadLunch && i > 0 && clock >= ASSUMPTIONS.lunchFrom && !servesLunch) addLunchAndRest()
    // Evening places aren't visited before late afternoon: leave later, or take free time first.
    if (p.bestTime === 'evening') {
      const leg = legBetween(prev, p, brief.travelMode, brief.travellers)
      const leaveBy = EARLIEST.evening - leg.mins - (i > 0 ? rules.bufferMins : 0)
      if (i === 0) {
        clock = Math.max(clock, leaveBy)
        hadLunch = true // the day only starts in the afternoon
      } else if (clock < leaveBy) {
        if (!hadLunch) {
          // Free time is downtime already, so no extra breathing room after lunch.
          addWait(ASSUMPTIONS.lunchFrom, '')
          addLunchAndRest(false)
        }
        addWait(leaveBy, p.name)
      }
    }
    travel({ x: p.x, y: p.y, riverSide: p.riverSide, label: p.name }, i > 0)
    const start = clock
    clock += p.visitMins
    const isMeal = servesLunch && !hadLunch && start >= 11 * 60 + 30 && start <= 15 * 60
    items.push({ kind: 'stop', placeId: id, order: i + 1, start, end: clock, cost: p.costPerPerson, isMeal })
    if (p.costPerPerson === null) cost.unpriced += 1
    else if (p.category === 'food' || p.category === 'cafe') cost.food += p.costPerPerson
    else cost.activities += p.costPerPerson
    if (isMeal) {
      hadLunch = true
      addRest()
    }
  })
  if (placeIds.length > 0) {
    if (!hadLunch && clock > 13 * 60 + 30) addLunchAndRest()
    travel({ x: hotel.x, y: hotel.y, label: hotel.name }, false)
  }
  cost.total = cost.activities + cost.food + cost.transport

  return {
    items,
    start: rules.start,
    end: clock,
    pace,
    rules,
    overTime: clock > rules.end,
    overStops: placeIds.length > rules.maxStops,
    walkMins,
    walkKm: Math.round(walkKm * 10) / 10,
    carMins,
    carRides,
    cost,
    stopCount: placeIds.length,
  }
}

export const dayFits = (s: DaySchedule) => !s.overTime && !s.overStops

// ── Ordering & assignment ──────────────────────────────────────

/** Earliest sensible start (minutes) for each preferred time of day. */
const EARLIEST: Record<BestTime, number> = { morning: 0, any: 0, midday: 11 * 60 + 30, afternoon: 12 * 60 + 30, evening: 16 * 60 }

/**
 * Order a day's places with a simulated clock: morning places first while it's
 * morning, a meal stop around lunchtime, evening places last; otherwise the
 * nearest eligible place comes next.
 */
export function orderDay(placeIds: string[], start: Point, dayStart = PACE_RULES.balanced.start): string[] {
  const remaining = placeIds.map(requirePlace)
  const out: string[] = []
  let cur = start
  let clock = dayStart
  let hadLunch = false
  while (remaining.length) {
    let eligible = remaining.filter((p) => EARLIEST[p.bestTime] <= clock)
    if (!eligible.length) {
      // Nothing suits this hour yet: take the soonest non-meal place (meals wait for lunchtime).
      const sight = (p: Place) => p.category === 'architecture' || p.category === 'market' || p.category === 'park'
      const pool = remaining.some(sight) ? remaining.filter(sight) : remaining.some((p) => !isFoodStop(p)) ? remaining.filter((p) => !isFoodStop(p)) : remaining
      const soonest = Math.min(...pool.map((p) => EARLIEST[p.bestTime]))
      eligible = pool.filter((p) => EARLIEST[p.bestTime] === soonest)
    }
    const score = (p: Place) => {
      let s = Math.hypot(p.x - cur.x, p.y - cur.y)
      if (p.bestTime === 'morning' && clock < 12 * 60) s -= 50
      if (!hadLunch && isFoodStop(p) && clock >= 11 * 60 + 30) s -= 100
      if (isFoodStop(p) && (hadLunch || clock < 11 * 60 + 30) && p.bestTime === 'midday') s += 20
      return s
    }
    eligible.sort((a, b) => score(a) - score(b) || a.id.localeCompare(b.id))
    const next = eligible[0]
    out.push(next.id)
    clock += next.visitMins + 20
    if (isFoodStop(next) && clock >= 12 * 60) hadLunch = true
    if (!hadLunch && clock >= 12 * 60 + 30) {
      clock += ASSUMPTIONS.lunchMins
      hadLunch = true
    }
    cur = next
    remaining.splice(remaining.indexOf(next), 1)
  }
  return out
}

/** Insert a place into an existing order at the cheapest position (keeps existing order intact). */
export function insertCheapest(placeIds: string[], newId: string, start: Point): string[] {
  const p = requirePlace(newId)
  const pts: Point[] = [start, ...placeIds.map(requirePlace), start]
  let best = 0
  let bestCost = Infinity
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const added = Math.hypot(a.x - p.x, a.y - p.y) + Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(a.x - b.x, a.y - b.y)
    if (added < bestCost - 1e-9) {
      bestCost = added
      best = i
    }
  }
  const out = [...placeIds]
  out.splice(best, 0, newId)
  return out
}

export interface AssignResult {
  days: string[][]
  unplaced: string[]
}

export const OVERFLOW_MAX_KM = 5
const ZONE_ORDER: Zone[] = ['rattanakosin', 'old-town', 'chinatown', 'pathum-wan', 'dusit', 'chatuchak']
export const centroid = (ids: string[]): Point => {
  const ps = ids.map(requirePlace)
  return { x: ps.reduce((s, p) => s + p.x, 0) / ps.length, y: ps.reduce((s, p) => s + p.y, 0) / ps.length }
}

/**
 * Area-first assignment:
 * 1. Group selected places by area (zone) and give the largest areas their own day.
 * 2. Smaller areas join the day whose area centre is nearest.
 * 3. Within a day, places are added in priority order (must-visits, then matching
 *    interests) while the day still fits the pace; the rest try the nearest other
 *    day with room, otherwise they're reported as not scheduled.
 */
export function assignToDays(placeIds: string[], mustVisit: string[], brief: TripBrief, dayPaces?: (Pace | undefined)[]): AssignResult {
  const hotel = getHotel(brief.startLocationId)
  const start = { x: hotel.x, y: hotel.y }
  const interestCats = new Set(brief.interests.map((i) => ({ architecture: 'architecture', food: 'food', cafes: 'cafe', markets: 'market' })[i]))
  const priority = (id: string) => {
    const p = requirePlace(id)
    return (mustVisit.includes(id) ? 0 : 10) + (interestCats.has(p.category) ? 0 : 5)
  }
  const byPriority = (ids: string[]) =>
    [...ids].sort((a, b) => priority(a) - priority(b) || placeIds.indexOf(a) - placeIds.indexOf(b))

  // 1–2. Zones → day groups.
  const zones = new Map<Zone, string[]>()
  placeIds.forEach((id) => {
    const z = requirePlace(id).zone
    zones.set(z, [...(zones.get(z) ?? []), id])
  })
  const weight = (ids: string[]) => ids.reduce((s, id) => s + requirePlace(id).visitMins, 0) + ids.filter((id) => mustVisit.includes(id)).length * 1000
  const sortedZones = [...zones.entries()].sort(
    (a, b) => weight(b[1]) - weight(a[1]) || ZONE_ORDER.indexOf(a[0]) - ZONE_ORDER.indexOf(b[0]),
  )
  const groups: string[][] = sortedZones.slice(0, brief.days).map(([, ids]) => [...ids])
  sortedZones.slice(brief.days).forEach(([, ids]) => {
    const c = centroid(ids)
    let best = 0
    groups.forEach((g, i) => {
      const gc = centroid(g)
      const bc = centroid(groups[best])
      if (Math.hypot(gc.x - c.x, gc.y - c.y) < Math.hypot(bc.x - c.x, bc.y - c.y) - 1e-9) best = i
    })
    groups[best].push(...ids)
  })
  while (groups.length < brief.days) groups.push([])
  orderGroupsForOpenDays(groups, brief)

  // 3. Fill each day in priority order while it fits.
  const days: string[][] = groups.map(() => [])
  const overflow: string[] = []
  const tryAdd = (d: number, id: string) => {
    if (!isOpenOnDay(id, brief, d)) return false
    const order = orderDay([...days[d], id], start)
    if (!dayFits(scheduleDay(order, brief, dayPaces?.[d]))) return false
    days[d] = order
    return true
  }
  groups.forEach((g, d) => byPriority(g).forEach((id) => tryAdd(d, id) || overflow.push(id)))

  const unplaced: string[] = []
  byPriority(overflow).forEach((id) => {
    const p = requirePlace(id)
    const candidates = days
      .map((ids, d) => ({ d, km: ids.length ? Math.hypot(centroid(ids).x - p.x, centroid(ids).y - p.y) : Math.hypot(start.x - p.x, start.y - p.y) }))
      .sort((a, b) => a.km - b.km || a.d - b.d)
    // Only spill into days whose area is reasonably close; otherwise leave it unscheduled.
    if (!candidates.filter(({ km }) => km <= OVERFLOW_MAX_KM).some(({ d }) => tryAdd(d, id))) unplaced.push(id)
  })
  return { days, unplaced }
}

/**
 * Day groups are otherwise placed in a fixed order; when a group holds a place
 * with limited opening days (e.g. a weekend market), reorder the groups so that
 * place lands on a day it's open. The first ordering that suits the most such
 * places wins, so groups without restrictions keep their order.
 */
function orderGroupsForOpenDays(groups: string[][], brief: TripBrief) {
  if (!groups.some((g) => g.some((id) => requirePlace(id).openDays))) return
  const permutations = (n: number): number[][] =>
    n === 0 ? [[]] : permutations(n - 1).flatMap((p) => Array.from({ length: n }, (_, i) => [...p.slice(0, i), n - 1, ...p.slice(i)]))
  const perms = permutations(groups.length).sort((a, b) => a.join().localeCompare(b.join()))
  const score = (perm: number[]) =>
    perm.reduce((s, gi, d) => s + groups[gi].filter((id) => requirePlace(id).openDays && isOpenOnDay(id, brief, d)).length, 0)
  let best = perms[0]
  perms.forEach((p) => {
    if (score(p) > score(best)) best = p
  })
  const copy = groups.map((g) => g)
  best.forEach((gi, d) => (groups[d] = copy[gi]))
}

// ── Generation ─────────────────────────────────────────────────

export type PlanResult =
  | { ok: true; itinerary: Itinerary }
  | { ok: false; reason: 'unsupported-destination' | 'unsupported-duration' | 'no-places' }
  | { ok: false; reason: 'must-visit-conflict'; unplaced: string[]; neededMins: number; availableMins: number; packedResolves: boolean }

export function availableMins(brief: TripBrief) {
  const r = PACE_RULES[brief.pace]
  return (r.end - r.start - ASSUMPTIONS.lunchMins - r.restMins) * brief.days
}

export function checkBrief(brief: TripBrief): PlanResult | null {
  if (brief.destinationId !== SUPPORTED_DESTINATION) return { ok: false, reason: 'unsupported-destination' }
  if (brief.days !== SUPPORTED_DAYS) return { ok: false, reason: 'unsupported-duration' }
  return null
}

export function generateItinerary(trip: Pick<Trip, 'brief' | 'placeIds' | 'mustVisit'>, now = new Date().toISOString()): PlanResult {
  const blocked = checkBrief(trip.brief)
  if (blocked) return blocked
  if (trip.placeIds.length === 0) return { ok: false, reason: 'no-places' }

  // Places closed on every trip date (e.g. a weekend-only market on weekday dates) never go on a day.
  const closed = trip.placeIds.filter((id) => isClosedAllTrip(id, trip.brief))
  const plannable = trip.placeIds.filter((id) => !closed.includes(id))
  const must = trip.mustVisit.filter((id) => plannable.includes(id))
  const mustOnly = assignToDays(must, must, trip.brief)
  if (mustOnly.unplaced.length) {
    const packed = assignToDays(must, must, { ...trip.brief, pace: 'packed' })
    return {
      ok: false,
      reason: 'must-visit-conflict',
      unplaced: mustOnly.unplaced,
      neededMins: must.reduce((s, id) => s + requirePlace(id).visitMins, 0),
      availableMins: availableMins(trip.brief),
      packedResolves: trip.brief.pace !== 'packed' && packed.unplaced.length === 0,
    }
  }
  const { days, unplaced } = assignToDays(plannable, must, trip.brief)
  return {
    ok: true,
    itinerary: { days: days.map((placeIds) => ({ placeIds })), unscheduled: [...closed, ...unplaced], generatedAt: now, edits: [] },
  }
}

// ── Trip summary ───────────────────────────────────────────────

export interface TripSummary {
  days: DaySchedule[]
  cost: CostBreakdown
  walkMins: number
  walkKm: number
  carMins: number
  stopCount: number
  budget: number | null
  overBudgetBy: number
}

export function summarize(itinerary: Itinerary, brief: TripBrief): TripSummary {
  const days = itinerary.days.map((d: DayPlan) => scheduleDay(d.placeIds, brief, d.pace))
  const cost = days.reduce<CostBreakdown>(
    (acc, d) => ({
      activities: acc.activities + d.cost.activities,
      food: acc.food + d.cost.food,
      transport: acc.transport + d.cost.transport,
      total: acc.total + d.cost.total,
      unpriced: acc.unpriced + d.cost.unpriced,
    }),
    { activities: 0, food: 0, transport: 0, total: 0, unpriced: 0 },
  )
  const budget = brief.budgetPerPerson
  return {
    days,
    cost,
    walkMins: days.reduce((s, d) => s + d.walkMins, 0),
    walkKm: Math.round(days.reduce((s, d) => s + d.walkKm, 0) * 10) / 10,
    carMins: days.reduce((s, d) => s + d.carMins, 0),
    stopCount: days.reduce((s, d) => s + d.stopCount, 0),
    budget,
    overBudgetBy: budget ? Math.max(0, cost.total - budget) : 0,
  }
}

export function dayOfPlace(itinerary: Itinerary, placeId: string): number {
  return itinerary.days.findIndex((d) => d.placeIds.includes(placeId))
}
