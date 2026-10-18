/*
 * App state model + reducer. Pure and framework-free so it can be unit tested.
 */
import { DEFAULT_HOTEL_ID, getDestination, HOTELS, SEED_SAVED } from '../data/catalog'
import { getPlace } from '../data/places'
import type { Itinerary, Preferences, Trip, TripBrief } from '../domain/types'

/**
 * v1: Jaipur sample city. v2: Bangkok sample city — v1 trips are kept read-only
 * in `archivedTrips`, and v1 saved places are kept in `legacy` (never deleted).
 */
export const STATE_VERSION = 2

/** What was carried over from an earlier sample city's data. */
export interface LegacyData {
  savedPlaceIds: string[]
  migratedAt: string
  noticeDismissed: boolean
}

export interface AppState {
  version: number
  savedPlaceIds: string[]
  trips: Trip[]
  /** Trips from an earlier sample city. Kept as stored, shown read-only, deleted only on request. */
  archivedTrips: Trip[]
  legacy: LegacyData | null
  preferences: Preferences
  demo: { failNextPlan: boolean }
}

export const DEFAULT_PREFERENCES: Preferences = {
  interests: ['architecture', 'food', 'cafes', 'markets'],
  pace: 'balanced',
  travelMode: 'walk-car',
  travellers: 2,
}

export function initialState(): AppState {
  return {
    version: STATE_VERSION,
    savedPlaceIds: [...SEED_SAVED],
    trips: [],
    archivedTrips: [],
    legacy: null,
    preferences: { ...DEFAULT_PREFERENCES },
    demo: { failNextPlan: false },
  }
}

export function newBrief(prefs: Preferences, destinationId = 'bangkok'): TripBrief {
  return {
    destinationId,
    startDate: '',
    days: 3,
    travellers: prefs.travellers,
    startLocationId: DEFAULT_HOTEL_ID,
    budgetPerPerson: null,
    interests: [...prefs.interests],
    pace: prefs.pace,
    travelMode: prefs.travelMode,
  }
}

export function makeTrip(id: string, brief: TripBrief, placeIds: string[], now: string, name = `${getDestination(brief.destinationId)?.name ?? 'New'} trip`): Trip {
  return {
    id, name, status: 'draft', createdAt: now, updatedAt: now, brief, placeIds: unique(placeIds),
    mustVisit: [], itinerary: null, undo: null, checklist: {},
  }
}

const unique = (ids: string[]) => [...new Set(ids)]

export type Action =
  | { type: 'toggleSave'; placeId: string }
  | { type: 'setSaved'; placeIds: string[] }
  | { type: 'createTrip'; trip: Trip }
  | { type: 'updateBrief'; tripId: string; patch: Partial<TripBrief> }
  | { type: 'addTripPlace'; tripId: string; placeId: string }
  | { type: 'removeTripPlace'; tripId: string; placeId: string }
  | { type: 'toggleMust'; tripId: string; placeId: string }
  | { type: 'setMust'; tripId: string; placeIds: string[] }
  | { type: 'setItinerary'; tripId: string; itinerary: Itinerary | null }
  | { type: 'applyChange'; tripId: string; label: string; next: Partial<Pick<Trip, 'itinerary' | 'brief' | 'mustVisit' | 'placeIds'>> }
  | { type: 'undo'; tripId: string }
  | { type: 'clearUndo'; tripId: string }
  | { type: 'saveTrip'; tripId: string }
  | { type: 'renameTrip'; tripId: string; name: string }
  | { type: 'deleteTrip'; tripId: string }
  | { type: 'toggleChecklist'; tripId: string; key: string }
  | { type: 'setPreferences'; patch: Partial<Preferences> }
  | { type: 'setDemoFlag'; failNextPlan: boolean }
  | { type: 'deleteArchivedTrip'; tripId: string }
  | { type: 'dismissLegacyNotice' }
  | { type: 'replaceState'; state: AppState }
  | { type: 'reset' }

export function reducer(state: AppState, action: Action, now = new Date().toISOString()): AppState {
  const updateTrip = (tripId: string, fn: (t: Trip) => Trip): AppState => ({
    ...state,
    trips: state.trips.map((t) => (t.id === tripId ? { ...fn(t), updatedAt: now } : t)),
  })

  switch (action.type) {
    case 'toggleSave': {
      const has = state.savedPlaceIds.includes(action.placeId)
      return {
        ...state,
        savedPlaceIds: has ? state.savedPlaceIds.filter((id) => id !== action.placeId) : [...state.savedPlaceIds, action.placeId],
      }
    }
    case 'setSaved':
      return { ...state, savedPlaceIds: unique(action.placeIds) }
    case 'createTrip':
      return { ...state, trips: [action.trip, ...state.trips.filter((t) => t.id !== action.trip.id)] }
    case 'updateBrief':
      return updateTrip(action.tripId, (t) => ({ ...t, brief: { ...t.brief, ...action.patch } }))
    case 'addTripPlace':
      return updateTrip(action.tripId, (t) => ({ ...t, placeIds: unique([...t.placeIds, action.placeId]) }))
    case 'removeTripPlace':
      return updateTrip(action.tripId, (t) => ({
        ...t,
        placeIds: t.placeIds.filter((id) => id !== action.placeId),
        mustVisit: t.mustVisit.filter((id) => id !== action.placeId),
      }))
    case 'toggleMust':
      return updateTrip(action.tripId, (t) => ({
        ...t,
        mustVisit: t.mustVisit.includes(action.placeId) ? t.mustVisit.filter((id) => id !== action.placeId) : [...t.mustVisit, action.placeId],
      }))
    case 'setMust':
      return updateTrip(action.tripId, (t) => ({ ...t, mustVisit: unique(action.placeIds) }))
    case 'setItinerary':
      return updateTrip(action.tripId, (t) => ({ ...t, itinerary: action.itinerary, undo: null }))
    case 'applyChange':
      return updateTrip(action.tripId, (t) => ({
        ...t,
        ...action.next,
        undo: t.itinerary
          ? { label: action.label, itinerary: t.itinerary, mustVisit: t.mustVisit, placeIds: t.placeIds, brief: t.brief }
          : null,
      }))
    case 'undo':
      return updateTrip(action.tripId, (t) =>
        t.undo ? { ...t, itinerary: t.undo.itinerary, mustVisit: t.undo.mustVisit, placeIds: t.undo.placeIds, brief: t.undo.brief, undo: null } : t,
      )
    case 'clearUndo':
      return updateTrip(action.tripId, (t) => ({ ...t, undo: null }))
    case 'saveTrip':
      return updateTrip(action.tripId, (t) => ({ ...t, status: 'saved' }))
    case 'renameTrip':
      return updateTrip(action.tripId, (t) => ({ ...t, name: action.name.trim() || t.name }))
    case 'deleteTrip':
      return { ...state, trips: state.trips.filter((t) => t.id !== action.tripId) }
    case 'toggleChecklist':
      return updateTrip(action.tripId, (t) => ({ ...t, checklist: { ...t.checklist, [action.key]: !t.checklist[action.key] } }))
    case 'setPreferences':
      return { ...state, preferences: { ...state.preferences, ...action.patch } }
    case 'setDemoFlag':
      return { ...state, demo: { failNextPlan: action.failNextPlan } }
    case 'deleteArchivedTrip':
      return { ...state, archivedTrips: state.archivedTrips.filter((t) => t.id !== action.tripId) }
    case 'dismissLegacyNotice':
      return state.legacy ? { ...state, legacy: { ...state.legacy, noticeDismissed: true } } : state
    case 'replaceState':
      return action.state
    case 'reset':
      // Resets the demo, but keeps earlier-city trips: they're only removed one by one, on request.
      return { ...initialState(), archivedTrips: state.archivedTrips, legacy: state.legacy }
  }
}

// ── Persistence ────────────────────────────────────────────────

export const STORAGE_KEY = 'roam.prototype.v2'
/** The v1 (Jaipur) key. Read once to migrate, then left untouched as a backup. */
export const LEGACY_STORAGE_KEY = 'roam.prototype.v1'

/**
 * A trip the current catalog can plan: a known destination, a known hotel and
 * only known places. Anything else (e.g. an earlier sample city) is archived
 * rather than loaded, so stale data can't break the planner.
 */
export function isCurrentTrip(t: Trip): boolean {
  try {
    if (!t?.brief || !getDestination(t.brief.destinationId)?.supported) return false
    if (!HOTELS.some((h) => h.id === t.brief.startLocationId && h.destinationId === t.brief.destinationId)) return false
    const ids = [...t.placeIds, ...t.mustVisit, ...(t.itinerary?.days.flatMap((d) => d.placeIds) ?? []), ...(t.itinerary?.unscheduled ?? []), ...(t.undo?.itinerary.days.flatMap((d) => d.placeIds) ?? [])]
    return ids.every((id) => getPlace(id)?.destinationId === t.brief.destinationId)
  } catch {
    return false
  }
}

const isTripLike = (t: unknown): t is Trip => !!t && typeof t === 'object' && typeof (t as Trip).id === 'string' && Array.isArray((t as Trip).placeIds)

/** Upgrades a v1 (Jaipur) state: its trips are archived and its saved places kept aside. */
export function migrateV1(v1: { trips?: unknown; savedPlaceIds?: unknown; preferences?: Partial<Preferences> }, now = new Date().toISOString()): AppState {
  const trips = Array.isArray(v1.trips) ? v1.trips.filter(isTripLike) : []
  const saved = Array.isArray(v1.savedPlaceIds) ? v1.savedPlaceIds.filter((id): id is string => typeof id === 'string') : []
  return {
    ...initialState(),
    trips: trips.filter(isCurrentTrip),
    archivedTrips: trips.filter((t) => !isCurrentTrip(t)),
    legacy: { savedPlaceIds: saved, migratedAt: now, noticeDismissed: false },
    preferences: { ...DEFAULT_PREFERENCES, ...v1.preferences },
  }
}

/** Loads persisted state, migrating v1 data and setting aside anything the current catalog can't use. */
export function loadState(storage: Pick<Storage, 'getItem'> | undefined, now = new Date().toISOString()): AppState {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (!raw) {
      const v1 = storage?.getItem(LEGACY_STORAGE_KEY)
      if (!v1) return initialState()
      const parsed = JSON.parse(v1)
      return parsed && typeof parsed === 'object' ? migrateV1(parsed, now) : initialState()
    }
    const parsed = JSON.parse(raw) as AppState
    if (parsed?.version !== STATE_VERSION || !Array.isArray(parsed.trips) || !Array.isArray(parsed.savedPlaceIds)) {
      return initialState()
    }
    const trips = parsed.trips.filter(isTripLike)
    return {
      ...initialState(),
      ...parsed,
      savedPlaceIds: parsed.savedPlaceIds.filter((id) => getPlace(id)),
      trips: trips.filter(isCurrentTrip),
      archivedTrips: [...(Array.isArray(parsed.archivedTrips) ? parsed.archivedTrips.filter(isTripLike) : []), ...trips.filter((t) => !isCurrentTrip(t))],
      legacy: parsed.legacy ?? null,
      preferences: { ...DEFAULT_PREFERENCES, ...parsed.preferences },
    }
  } catch {
    return initialState()
  }
}

export function saveState(storage: Pick<Storage, 'setItem'> | undefined, state: AppState) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage full or unavailable (private mode): the demo keeps working in memory.
  }
}

// ── Selectors ──────────────────────────────────────────────────

export const findTrip = (state: AppState, id: string | undefined) => state.trips.find((t) => t.id === id)
export const findArchivedTrip = (state: AppState, id: string | undefined) => state.archivedTrips.find((t) => t.id === id)
export const latestDraft = (state: AppState) =>
  [...state.trips].filter((t) => t.status === 'draft').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]

export interface BriefErrors {
  startDate?: string
  travellers?: string
  budgetPerPerson?: string
  interests?: string
  days?: string
  destinationId?: string
}

export function validateBrief(b: TripBrief): BriefErrors {
  const e: BriefErrors = {}
  if (!b.destinationId) e.destinationId = 'Choose a destination.'
  if (!b.startDate) e.startDate = 'Choose a start date.'
  if (!Number.isInteger(b.days) || b.days < 1) e.days = 'Enter the number of days.'
  if (!Number.isInteger(b.travellers) || b.travellers < 1 || b.travellers > 8) e.travellers = 'Enter 1–8 travellers.'
  if (b.budgetPerPerson === null || !Number.isFinite(b.budgetPerPerson) || b.budgetPerPerson <= 0)
    e.budgetPerPerson = 'Enter a budget per person in THB.'
  if (!b.interests.length) e.interests = 'Pick at least one interest.'
  return e
}
