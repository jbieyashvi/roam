import { describe, expect, it } from 'vitest'
import { demoTrip } from '../state/demo'
import { comparePlans, findConflicts, isCompactDay, parseRequest, propose, type PlanState } from './adjust'

const NOW = '2026-10-17T00:00:00.000Z'
const stateOf = (budget?: number): PlanState => {
  const t = demoTrip(NOW)
  return { brief: { ...t.brief, budgetPerPerson: budget ?? t.brief.budgetPerPerson }, placeIds: t.placeIds, mustVisit: t.mustVisit, itinerary: t.itinerary! }
}

describe('parseRequest', () => {
  it('reads the adjustment and day from "Make day 2 more relaxed"', () => {
    expect(parseRequest('Make day 2 more relaxed')).toEqual({ kind: 'relax-day', dayIndex: 1 })
  })
  it('understands ordinal days and ignores days outside the trip', () => {
    expect(parseRequest('a slower second day')).toEqual({ kind: 'relax-day', dayIndex: 1 })
    expect(parseRequest('relax day 7')).toEqual({ kind: 'relax-day' })
  })
  it('returns no kind for unsupported requests', () => {
    expect(parseRequest('Book a hot-air balloon').kind).toBeNull()
  })
})

describe('relaxing day 2', () => {
  it('keeps every must-visit and only sets aside flexible stops', () => {
    const s = stateOf()
    const p = propose('relax-day', s, 1)
    const diff = comparePlans(s, p.next)
    expect(p.next.itinerary.days[1].pace).toBe('relaxed')
    for (const id of s.mustVisit) expect(p.next.itinerary.days.some((d) => d.placeIds.includes(id))).toBe(true)
    expect(diff.removed.every((r) => !s.mustVisit.includes(r.placeId))).toBe(true)
    expect(findConflicts(p, diff, s, 1)).toEqual([])
  })
})

describe('findConflicts', () => {
  it('flags a change that would push the plan over budget', () => {
    // The sample plan is ~฿3,000 pp; taking rides adds ~฿190 pp, over a ฿3,100 budget.
    const s = stateOf(3100)
    const p = propose('less-walking', s, 0)
    const diff = comparePlans(s, p.next)
    expect(diff.before.overBudgetBy).toBe(0)
    const c = findConflicts(p, diff, s, 0)
    expect(c).toHaveLength(1)
    expect(c[0].kind).toBe('budget')
  })
  it('explains when must-visits keep a cost cut above the budget', () => {
    const s = stateOf(2000)
    const p = propose('lower-cost', s, 0)
    const c = findConflicts(p, comparePlans(s, p.next), s, 0)
    expect(c[0]?.kind).toBe('must-visit')
    expect(c[0]?.detail).toMatch(/must-visits/)
  })
})

describe('isCompactDay', () => {
  it('is true only for days whose stops share one district', () => {
    const it = stateOf().itinerary
    expect(isCompactDay(it.days[0].placeIds)).toBe(true) // Rattanakosin
    expect(isCompactDay(it.days[2].placeIds)).toBe(false) // Chatuchak + Pathum Wan
  })
})
