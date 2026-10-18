/*
 * Curated demo fixture + reproducible states for the discreet demo menu.
 */
import { generateItinerary } from '../domain/planner'
import type { Trip, TripBrief } from '../domain/types'
import { DEFAULT_PREFERENCES, initialState, makeTrip, type AppState } from './model'

export const DEMO_TRIP_ID = 'demo-bangkok'
export const DEMO_TRIP_NAME = 'A little Bangkok escape'
/** Bumped whenever the sample trip's content changes; stored on the trip as `sampleVersion`. */
export const SAMPLE_VERSION = 2

/** Fri 20 – Sun 22 Nov 2026, so the weekend-only Chatuchak market can be planned. */
export const DEMO_BRIEF: TripBrief = {
  destinationId: 'bangkok',
  startDate: '2026-11-20',
  days: 3,
  travellers: 2,
  startLocationId: 'lantern-yard',
  budgetPerPerson: 9000,
  interests: ['architecture', 'food', 'cafes', 'markets'],
  pace: 'balanced',
  travelMode: 'walk-car',
}

export const DEMO_PLACES = [
  'grand-palace', 'wat-pho', 'wat-arun', 'pak-khlong-talat', 'blue-whale', 'wat-saket',
  'jay-fai', 'wat-traimit', 'talat-noi', 'hong-sieng-kong', 'song-wat', 'yaowarat',
  'nai-ek', 'jim-thompson', 'bacc', 'lumphini', 'chatuchak',
]
export const DEMO_MUST = ['grand-palace', 'wat-pho', 'wat-arun']

export function demoTrip(now: string, overrides: Partial<Trip> = {}, withItinerary = true): Trip {
  const base = makeTrip(DEMO_TRIP_ID, { ...DEMO_BRIEF }, DEMO_PLACES, now, DEMO_TRIP_NAME)
  const trip: Trip = { ...base, mustVisit: [...DEMO_MUST], sampleVersion: SAMPLE_VERSION, ...overrides }
  if (withItinerary && trip.itinerary === null) {
    const res = generateItinerary(trip, now)
    if (res.ok) trip.itinerary = res.itinerary
  }
  return trip
}

export type DemoScenario =
  | 'fresh'
  | 'empty-saved'
  | 'ready-itinerary'
  | 'missing-info'
  | 'unsupported-link'
  | 'too-many-must'
  | 'unknown-hours'
  | 'planning-failure'
  | 'unsupported-request'
  | 'change-preview'
  | 'applied-undo'
  | 'budget-conflict'
  | 'must-visit-conflict'

export const SCENARIOS: { id: DemoScenario; label: string; detail: string }[] = [
  { id: 'fresh', label: 'Fresh start', detail: 'Seeded saved places, no trips' },
  { id: 'empty-saved', label: 'Empty saved collection', detail: 'No saved places' },
  { id: 'ready-itinerary', label: 'Generated itinerary', detail: 'Jump to the Bangkok plan' },
  { id: 'missing-info', label: 'Missing trip information', detail: 'Brief with required fields empty' },
  { id: 'unsupported-link', label: 'Unsupported shared link', detail: 'Review places with an unknown link' },
  { id: 'too-many-must', label: 'Too many must-visits', detail: 'Conflict when creating itinerary' },
  { id: 'unknown-hours', label: 'Unknown hours / unverified cost', detail: 'Opens Loha Prasat details' },
  { id: 'planning-failure', label: 'Planning failure + Retry', detail: 'Next “Create itinerary” fails once' },
  { id: 'unsupported-request', label: 'Unsupported assistant request', detail: 'Adjust plan with an unknown request' },
  { id: 'change-preview', label: 'Change preview', detail: 'Lower-cost proposal ready to review' },
  { id: 'applied-undo', label: 'Applied change with Undo', detail: 'A change just applied' },
  { id: 'budget-conflict', label: 'Change that breaks the budget', detail: '“Less walking” with a ฿3,100 budget' },
  { id: 'must-visit-conflict', label: 'Must-visits vs. budget', detail: 'Over a ฿2,000 budget; must-visits carry the cost' },
]

/** Returns the state to load and the route to open for a scenario. */
export function buildScenario(id: DemoScenario, now = new Date().toISOString()): { state: AppState; route: string } {
  const base = initialState()
  const withTrip = (trip: Trip): AppState => ({ ...base, trips: [trip] })
  const t = `/trip/${DEMO_TRIP_ID}`
  switch (id) {
    case 'fresh':
      return { state: base, route: '/discover' }
    case 'empty-saved':
      return { state: { ...base, savedPlaceIds: [] }, route: '/saved' }
    case 'ready-itinerary':
      return { state: withTrip(demoTrip(now)), route: `${t}/itinerary` }
    case 'missing-info': {
      const trip = demoTrip(now, { itinerary: null }, false)
      trip.brief = { ...trip.brief, startDate: '', budgetPerPerson: null, interests: [] }
      return { state: withTrip(trip), route: `${t}/brief?step=1&validate=1` }
    }
    case 'unsupported-link':
      return {
        state: withTrip(demoTrip(now, { itinerary: null }, false)),
        route: `${t}/places?link=${encodeURIComponent('https://www.tiktok.com/@traveller/video/7310000000')}`,
      }
    case 'too-many-must': {
      const trip = demoTrip(now, { itinerary: null }, false)
      trip.mustVisit = [...trip.placeIds]
      trip.brief = { ...trip.brief, pace: 'relaxed' }
      return { state: withTrip(trip), route: `${t}/places` }
    }
    case 'unknown-hours': {
      const trip = demoTrip(now, { placeIds: [...DEMO_PLACES, 'loha-prasat'], itinerary: null })
      return { state: withTrip(trip), route: `${t}/itinerary?stop=loha-prasat` }
    }
    case 'planning-failure':
      return {
        state: { ...withTrip(demoTrip(now, { itinerary: null }, false)), demo: { failNextPlan: true } },
        route: `${t}/places`,
      }
    case 'unsupported-request':
      return {
        state: withTrip(demoTrip(now)),
        route: `${t}/adjust?day=1&request=${encodeURIComponent('Book us a dinner cruise with a show')}`,
      }
    case 'change-preview':
      return { state: withTrip(demoTrip(now)), route: `${t}/adjust?day=1&request=lower-cost` }
    case 'applied-undo':
      return { state: withTrip(demoTrip(now)), route: `${t}/adjust?day=3&request=more-cafes&autoApply=1` }
    case 'budget-conflict':
      // The sample plan is estimated at about ฿3,000 pp; switching to rides tips it over ฿3,100.
      return { state: withTrip(demoTrip(now, { brief: { ...DEMO_BRIEF, budgetPerPerson: 3100 } })), route: `${t}/adjust?day=1&request=less-walking` }
    case 'must-visit-conflict':
      return { state: withTrip(demoTrip(now, { brief: { ...DEMO_BRIEF, budgetPerPerson: 2000 } })), route: `${t}/itinerary` }
  }
}

export { DEFAULT_PREFERENCES }
