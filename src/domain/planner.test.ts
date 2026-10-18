import { describe, expect, it } from 'vitest'
import { requirePlace } from '../data/places'
import { DEMO_BRIEF, DEMO_MUST, DEMO_PLACES, demoTrip } from '../state/demo'
import { comparePlans, isNoChange, matchRequest, moveToDay, propose, removeFromDay, swapAlternatives, swapPlace } from './adjust'
import { closedReason, generateItinerary, legBetween, PACE_RULES, scheduleDay, summarize } from './planner'
import type { Itinerary, Trip } from './types'

const NOW = '2026-10-17T00:00:00.000Z'
const tripInput = { brief: DEMO_BRIEF, placeIds: DEMO_PLACES, mustVisit: DEMO_MUST }

function planOrThrow(input: Pick<Trip, 'brief' | 'placeIds' | 'mustVisit'> = tripInput): Itinerary {
  const r = generateItinerary(input, NOW)
  if (!r.ok) throw new Error(`plan failed: ${r.reason}`)
  return r.itinerary
}

describe('legBetween', () => {
  it('walks short hops and drives long ones in walk-car mode', () => {
    expect(legBetween({ x: 0, y: 0 }, { x: 0.5, y: 0 }, 'walk-car', 2).mode).toBe('walk')
    const car = legBetween({ x: 0, y: 0 }, { x: 5, y: 0 }, 'walk-car', 2)
    expect(car.mode).toBe('car')
    expect(car.cost).toBeGreaterThan(0)
  })
  it('car-first only walks very short hops', () => {
    expect(legBetween({ x: 0, y: 0 }, { x: 0.5, y: 0 }, 'car-first', 2).mode).toBe('car')
    expect(legBetween({ x: 0, y: 0 }, { x: 0.2, y: 0 }, 'car-first', 2).mode).toBe('walk')
  })
})

describe('generateItinerary', () => {
  it('is deterministic', () => {
    expect(planOrThrow()).toEqual(planOrThrow())
  })

  it('schedules every must-visit and never duplicates a place', () => {
    const it = planOrThrow()
    const scheduled = it.days.flatMap((d) => d.placeIds)
    DEMO_MUST.forEach((id) => expect(scheduled).toContain(id))
    expect(new Set(scheduled).size).toBe(scheduled.length)
    // Every selected place is either scheduled or listed as not scheduled.
    expect([...scheduled, ...it.unscheduled].sort()).toEqual([...DEMO_PLACES].sort())
  })

  it('produces non-overlapping timelines within the pace window', () => {
    const it = planOrThrow()
    it.days.forEach((d) => {
      const s = scheduleDay(d.placeIds, DEMO_BRIEF)
      expect(s.overTime).toBe(false)
      expect(s.stopCount).toBeLessThanOrEqual(PACE_RULES.balanced.maxStops)
      let clock = s.start
      for (const item of s.items) {
        const start = item.start
        expect(start).toBeGreaterThanOrEqual(clock)
        clock = item.kind === 'travel' ? item.start + item.leg.mins + item.bufferMins : item.end
      }
    })
  })

  it('keeps nearby places together (Rattanakosin and Chinatown stops share a day)', () => {
    const it = planOrThrow()
    const dayOf = (id: string) => it.days.findIndex((d) => d.placeIds.includes(id))
    expect(dayOf('wat-pho')).toBe(dayOf('grand-palace'))
    expect(dayOf('wat-arun')).toBe(dayOf('grand-palace'))
    expect(dayOf('hong-sieng-kong')).toBe(dayOf('talat-noi'))
    expect(dayOf('wat-traimit')).toBe(dayOf('talat-noi'))
  })

  it('only plans Bangkok places', () => {
    const it = planOrThrow()
    ;[...it.days.flatMap((d) => d.placeIds), ...it.unscheduled].forEach((id) => expect(requirePlace(id).destinationId).toBe('bangkok'))
  })

  it('crosses the river to Wat Arun by ferry', () => {
    const it = planOrThrow()
    const day = it.days.find((d) => d.placeIds.includes('wat-arun'))!
    const s = scheduleDay(day.placeIds, DEMO_BRIEF)
    const toArun = s.items.find((i) => i.kind === 'travel' && i.toLabel === requirePlace('wat-arun').name)
    expect(toArun?.kind === 'travel' && toArun.leg.mode).toBe('boat')
  })

  it('plans the weekend-only Chatuchak market on a weekend day only', () => {
    const it = planOrThrow() // Fri 20 – Sun 22 Nov 2026
    const dayIndex = it.days.findIndex((d) => d.placeIds.includes('chatuchak'))
    expect(dayIndex).toBeGreaterThan(0)
    const weekday = new Date(`${DEMO_BRIEF.startDate}T12:00:00Z`)
    weekday.setUTCDate(weekday.getUTCDate() + dayIndex)
    expect([0, 6]).toContain(weekday.getUTCDay())
  })

  it('leaves Chatuchak out, with a reason, when the trip has no weekend day', () => {
    const brief = { ...DEMO_BRIEF, startDate: '2026-11-16' } // Mon – Wed
    const r = generateItinerary({ brief, placeIds: DEMO_PLACES, mustVisit: DEMO_MUST })
    if (!r.ok) throw new Error(r.reason)
    expect(r.itinerary.days.some((d) => d.placeIds.includes('chatuchak'))).toBe(false)
    expect(r.itinerary.unscheduled).toContain('chatuchak')
    expect(closedReason('chatuchak', brief)).toMatch(/weekends/)
    expect(closedReason('wat-pho', brief)).toBeNull()
  })

  it('never overlaps time slots', () => {
    const it = planOrThrow()
    it.days.forEach((d) => {
      const s = scheduleDay(d.placeIds, DEMO_BRIEF)
      const slots = s.items.filter((i) => i.kind !== 'travel') as { start: number; end: number }[]
      slots.forEach((a, i) => i > 0 && expect(a.start).toBeGreaterThanOrEqual(slots[i - 1].end))
    })
  })

  it('includes a lunch break or meal stop on each full day', () => {
    const it = planOrThrow()
    it.days.forEach((d) => {
      const s = scheduleDay(d.placeIds, DEMO_BRIEF)
      const hasLunch = s.items.some((i) => i.kind === 'meal' || (i.kind === 'stop' && i.isMeal))
      if (s.end > 14 * 60) expect(hasLunch).toBe(true)
    })
  })

  it('rejects unsupported durations and destinations honestly', () => {
    expect(generateItinerary({ ...tripInput, brief: { ...DEMO_BRIEF, days: 5 } })).toMatchObject({ ok: false, reason: 'unsupported-duration' })
    expect(generateItinerary({ ...tripInput, brief: { ...DEMO_BRIEF, destinationId: 'kyoto' } })).toMatchObject({ ok: false, reason: 'unsupported-destination' })
    expect(generateItinerary({ ...tripInput, placeIds: [] })).toMatchObject({ ok: false, reason: 'no-places' })
  })

  it('reports a must-visit conflict when must-visits exceed the time available', () => {
    const r = generateItinerary({ brief: { ...DEMO_BRIEF, pace: 'relaxed' }, placeIds: DEMO_PLACES, mustVisit: DEMO_PLACES })
    expect(r.ok).toBe(false)
    if (!r.ok && r.reason === 'must-visit-conflict') {
      expect(r.unplaced.length).toBeGreaterThan(0)
      expect(r.neededMins).toBeGreaterThan(0)
    } else throw new Error('expected conflict')
  })

  it('never starts an evening place before late afternoon, taking lunch and free time first', () => {
    const s = scheduleDay(['wat-saket', 'thipsamai', 'jay-fai'], DEMO_BRIEF)
    const stops = s.items.filter((x) => x.kind === 'stop')
    stops.filter((x) => requirePlace(x.placeId).bestTime === 'evening').forEach((x) => expect(x.start).toBeGreaterThanOrEqual(16 * 60))
    const kinds = s.items.map((x) => (x.kind === 'rest' && x.waitFor ? 'wait' : x.kind))
    expect(kinds.indexOf('meal')).toBeLessThan(kinds.lastIndexOf('wait'))
    expect(kinds.indexOf('wait')).toBeGreaterThan(-1)
  })

  it('keeps evening places in the evening on generated plans', () => {
    const monWed = demoTrip(NOW, { brief: { ...DEMO_BRIEF, startDate: '2026-11-23' }, itinerary: null })
    for (const trip of [demoTrip(NOW), monWed]) {
      trip.itinerary!.days.forEach((d) =>
        scheduleDay(d.placeIds, trip.brief, d.pace).items.forEach((x) => {
          if (x.kind === 'stop' && requirePlace(x.placeId).bestTime === 'evening') expect(x.start).toBeGreaterThanOrEqual(16 * 60)
        }),
      )
    }
  })
})

describe('summarize', () => {
  it('derives totals from the displayed day schedules', () => {
    const it = planOrThrow()
    const s = summarize(it, DEMO_BRIEF)
    const sumDays = s.days.reduce((a, d) => a + d.cost.total, 0)
    expect(s.cost.total).toBe(sumDays)
    expect(s.cost.total).toBe(s.cost.activities + s.cost.food + s.cost.transport)
    // Activities equal the sum of priced non-food stops actually scheduled.
    const expectedActivities = it.days
      .flatMap((d) => d.placeIds)
      .map(requirePlace)
      .filter((p) => p.category !== 'food' && p.category !== 'cafe')
      .reduce((a, p) => a + (p.costPerPerson ?? 0), 0)
    expect(s.cost.activities).toBe(expectedActivities)
  })

  it('counts unpriced stops instead of inventing a cost', () => {
    const s = scheduleDay(['loha-prasat'], DEMO_BRIEF)
    expect(s.cost.unpriced).toBe(1)
    expect(s.cost.activities).toBe(0)
  })

  it('updates the budget gap after edits', () => {
    const it = planOrThrow()
    const brief = { ...DEMO_BRIEF, budgetPerPerson: 1000 }
    const before = summarize(it, brief)
    expect(before.overBudgetBy).toBe(before.cost.total - 1000)
    const removed = removeFromDay(it, it.days[0].placeIds.find((id) => !DEMO_MUST.includes(id))!)
    expect(summarize(removed, brief).cost.total).toBeLessThanOrEqual(before.cost.total)
  })
})

describe('edits', () => {
  it('moves a stop to another day without losing it', () => {
    const it = planOrThrow()
    const id = it.days[0].placeIds[0]
    const moved = moveToDay(it, id, 2, DEMO_BRIEF)
    expect(moved.days[0].placeIds).not.toContain(id)
    expect(moved.days[2].placeIds).toContain(id)
    expect(it.days[0].placeIds).toContain(id) // original untouched
  })

  it('swaps a stop and offers only places not already scheduled', () => {
    const it = planOrThrow()
    const target = it.days[0].placeIds[0]
    const alts = swapAlternatives(it, target)
    const scheduled = new Set(it.days.flatMap((d) => d.placeIds))
    alts.forEach((p) => expect(scheduled.has(p.id)).toBe(false))
    const swapped = swapPlace(it, target, alts[0].id)
    expect(swapped.days[0].placeIds).toContain(alts[0].id)
    expect(swapped.unscheduled).toContain(target)
  })
})

describe('adjustments', () => {
  const state = () => ({ ...tripInput, itinerary: planOrThrow() })
  const scheduled = (it: Itinerary) => it.days.flatMap((d) => d.placeIds)

  it.each(['less-walking', 'lower-cost', 'more-cafes', 'relax-day'] as const)('%s never removes a must-visit', (kind) => {
    const p = propose(kind, state(), 0)
    DEMO_MUST.forEach((id) => expect(scheduled(p.next.itinerary)).toContain(id))
  })

  it('less walking reduces walking time and switches the mode', () => {
    const s = state()
    const p = propose('less-walking', s, 0)
    const d = comparePlans(s, p.next)
    expect(p.next.brief.travelMode).toBe('car-first')
    expect(d.walkMinsDelta).toBeLessThan(0)
    expect(d.costDelta).toBeGreaterThanOrEqual(0)
  })

  it('lower cost reduces the estimated total', () => {
    const s = state()
    const p = propose('lower-cost', s, 0)
    expect(p.noChangeReason).toBeUndefined()
    expect(comparePlans(s, p.next).costDelta).toBeLessThan(0)
  })

  it('more cafés adds at least one café', () => {
    const s = state()
    const p = propose('more-cafes', s, 0)
    const d = comparePlans(s, p.next)
    if (p.noChangeReason) return
    expect(d.added.some((a) => requirePlace(a.placeId).category === 'cafe')).toBe(true)
  })

  it('relax day keeps the day within relaxed hours', () => {
    const s = state()
    const p = propose('relax-day', s, 1)
    const day = p.next.itinerary.days[1]
    expect(day.pace).toBe('relaxed')
    const sched = scheduleDay(day.placeIds, s.brief, 'relaxed')
    expect(sched.overTime || sched.overStops).toBe(false)
  })

  it('reports no change when a rule has nothing to do', () => {
    const s = state()
    const once = propose('less-walking', s, 0)
    const twice = propose('less-walking', once.next, 0)
    expect(twice.noChangeReason).toBeTruthy()
    expect(isNoChange(comparePlans(once.next, twice.next))).toBe(true)
  })
})

describe('matchRequest', () => {
  it('maps supported phrasings', () => {
    expect(matchRequest('Can we walk less?')).toBe('less-walking')
    expect(matchRequest('make it cheaper')).toBe('lower-cost')
    expect(matchRequest('more coffee please')).toBe('more-cafes')
    expect(matchRequest("we're tired, slower day")).toBe('relax-day')
  })
  it('returns null for unsupported requests', () => {
    expect(matchRequest('Book us a hot-air balloon ride at sunrise')).toBeNull()
    expect(matchRequest('')).toBeNull()
  })
})

describe('demo fixture', () => {
  it('generates the curated Bangkok trip', () => {
    const t = demoTrip(NOW)
    expect(t.itinerary?.days).toHaveLength(3)
    t.itinerary!.days.forEach((d) => expect(d.placeIds.length).toBeGreaterThan(0))
  })
})
