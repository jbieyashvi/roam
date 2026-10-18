import { beforeEach, describe, expect, it } from 'vitest'
import { generateItinerary } from '../domain/planner'
import { propose } from '../domain/adjust'
import { demoTrip, buildScenario, SCENARIOS } from './demo'
import { initialState, LEGACY_STORAGE_KEY, loadState, makeTrip, newBrief, reducer, saveState, STORAGE_KEY, validateBrief, type AppState } from './model'

const NOW = '2026-10-17T00:00:00.000Z'

describe('reducer', () => {
  it('toggles saved places', () => {
    let s = initialState()
    const had = s.savedPlaceIds.includes('wat-saket')
    s = reducer(s, { type: 'toggleSave', placeId: 'wat-saket' }, NOW)
    expect(s.savedPlaceIds.includes('wat-saket')).toBe(!had)
    s = reducer(s, { type: 'toggleSave', placeId: 'wat-saket' }, NOW)
    expect(s.savedPlaceIds.includes('wat-saket')).toBe(had)
  })

  it('removing a trip place also clears its must-visit flag', () => {
    let s: AppState = { ...initialState(), trips: [demoTrip(NOW)] }
    s = reducer(s, { type: 'removeTripPlace', tripId: 'demo-bangkok', placeId: 'blue-whale' }, NOW)
    expect(s.trips[0].placeIds).not.toContain('blue-whale')
    expect(s.trips[0].mustVisit).not.toContain('blue-whale')
  })

  it('applies a change with an undo snapshot, and undo restores it exactly', () => {
    const trip = demoTrip(NOW)
    let s: AppState = { ...initialState(), trips: [trip] }
    const p = propose('less-walking', { ...trip, itinerary: trip.itinerary! }, 0)
    s = reducer(s, { type: 'applyChange', tripId: trip.id, label: p.title, next: { itinerary: p.next.itinerary, brief: p.next.brief } }, NOW)
    expect(s.trips[0].brief.travelMode).toBe('car-first')
    expect(s.trips[0].undo?.label).toBe('Less walking')
    s = reducer(s, { type: 'undo', tripId: trip.id }, NOW)
    expect(s.trips[0].brief).toEqual(trip.brief)
    expect(s.trips[0].itinerary).toEqual(trip.itinerary)
    expect(s.trips[0].undo).toBeNull()
  })

  it('saves, renames and deletes trips', () => {
    let s: AppState = { ...initialState(), trips: [demoTrip(NOW)] }
    s = reducer(s, { type: 'saveTrip', tripId: 'demo-bangkok' }, NOW)
    expect(s.trips[0].status).toBe('saved')
    s = reducer(s, { type: 'renameTrip', tripId: 'demo-bangkok', name: '  Riverside weekend  ' }, NOW)
    expect(s.trips[0].name).toBe('Riverside weekend')
    s = reducer(s, { type: 'renameTrip', tripId: 'demo-bangkok', name: '   ' }, NOW)
    expect(s.trips[0].name).toBe('Riverside weekend')
    s = reducer(s, { type: 'deleteTrip', tripId: 'demo-bangkok' }, NOW)
    expect(s.trips).toHaveLength(0)
  })
})

describe('validateBrief', () => {
  it('flags missing required fields', () => {
    const e = validateBrief({ ...newBrief(initialState().preferences), interests: [] })
    expect(Object.keys(e).sort()).toEqual(['budgetPerPerson', 'interests', 'startDate'])
  })
  it('passes a complete brief', () => {
    expect(validateBrief(demoTrip(NOW).brief)).toEqual({})
  })
})

describe('persistence', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips state through localStorage', () => {
    const trip = makeTrip('t1', { ...demoTrip(NOW).brief }, ['wat-pho', 'wat-arun'], NOW)
    const r = generateItinerary(trip, NOW)
    if (r.ok) trip.itinerary = r.itinerary
    const s: AppState = { ...initialState(), trips: [trip], savedPlaceIds: ['sarnies'] }
    saveState(localStorage, s)
    expect(loadState(localStorage)).toEqual(s)
  })

  it('falls back to the initial state on corrupt or old data', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadState(localStorage)).toEqual(initialState())
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 0 }))
    expect(loadState(localStorage)).toEqual(initialState())
  })

  it('drops saved ids that no longer exist in the catalogue', () => {
    saveState(localStorage, { ...initialState(), savedPlaceIds: ['sarnies', 'nope'] })
    expect(loadState(localStorage).savedPlaceIds).toEqual(['sarnies'])
  })
})

describe('v1 (earlier sample city) migration', () => {
  beforeEach(() => localStorage.clear())
  const v1Trip = { id: 'demo-jaipur', name: 'Three days in Jaipur', status: 'saved', placeIds: ['hawa-mahal', 'amer-fort'], mustVisit: ['amer-fort'], brief: { destinationId: 'jaipur', startLocationId: 'old-city-hotel', days: 3, travellers: 2, startDate: '2026-11-20' }, itinerary: null, undo: null, createdAt: NOW, updatedAt: NOW }
  const v1 = JSON.stringify({ version: 1, trips: [v1Trip], savedPlaceIds: ['hawa-mahal', 'tapri'], preferences: { pace: 'relaxed' } })

  it('archives v1 trips instead of deleting them, and keeps the v1 key as a backup', () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, v1)
    const s = loadState(localStorage, NOW)
    expect(s.trips).toHaveLength(0)
    expect(s.archivedTrips.map((t) => t.id)).toEqual(['demo-jaipur'])
    expect(s.legacy).toMatchObject({ savedPlaceIds: ['hawa-mahal', 'tapri'], noticeDismissed: false })
    expect(s.preferences.pace).toBe('relaxed')
    saveState(localStorage, s)
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBe(v1)
    expect(loadState(localStorage, NOW).archivedTrips).toHaveLength(1)
  })

  it('keeps current trips and saved places when the sample is replaced', () => {
    const mine = { ...demoTrip(NOW), id: 'my-trip', name: 'Our own plan' }
    let s: AppState = { ...initialState(), trips: [mine, demoTrip(NOW, { name: 'Edited sample' })], savedPlaceIds: ['sarnies'], archivedTrips: [v1Trip as never] }
    s = reducer(s, { type: 'createTrip', trip: demoTrip(NOW) }, NOW)
    expect(s.trips.map((t) => t.name).sort()).toEqual(['A little Bangkok escape', 'Our own plan'])
    expect(s.savedPlaceIds).toEqual(['sarnies'])
    expect(s.archivedTrips).toHaveLength(1)
  })

  it('reset keeps archived trips', () => {
    const s = reducer({ ...initialState(), archivedTrips: [v1Trip as never] }, { type: 'reset' }, NOW)
    expect(s.archivedTrips).toHaveLength(1)
  })
})

describe('demo scenarios', () => {
  it.each(SCENARIOS.map((s) => s.id))('%s builds a valid state and route', (id) => {
    const { state, route } = buildScenario(id, NOW)
    expect(route.startsWith('/')).toBe(true)
    expect(Array.isArray(state.trips)).toBe(true)
  })
})
