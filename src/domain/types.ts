// Business data types. Presentation components consume these but never define them.

/** 'park' (green space) has no matching trip interest; parks are planned as optional open-air stops. */
export type Category = 'architecture' | 'food' | 'cafe' | 'market' | 'park'
export type Interest = 'architecture' | 'food' | 'cafes' | 'markets'
export type Pace = 'relaxed' | 'balanced' | 'packed'
/** walk-car: walk nearby, car for longer hops. car-first: car for anything but very short hops. */
export type TravelMode = 'walk-car' | 'car-first'
/** Schematic Bangkok planning areas (not administrative districts). */
export type Zone = 'rattanakosin' | 'old-town' | 'chinatown' | 'pathum-wan' | 'chatuchak' | 'dusit'
export type BestTime = 'morning' | 'midday' | 'afternoon' | 'evening' | 'any'

export interface Place {
  id: string
  destinationId: string
  name: string
  category: Category
  area: string
  zone: Zone
  /** Schematic position in km from a reference point near Wang Burapha, Bangkok (x east, y north). Illustrative only. */
  x: number
  y: number
  summary: string
  /** Sample visit duration in minutes. */
  visitMins: number
  /** Sample cost per person in THB; null means we have no estimate. */
  costPerPerson: number | null
  /** Sample opening-hours note; null means unknown. Never live data. */
  hoursNote: string | null
  bestTime: BestTime
  /**
   * Days of the week the place is usually open (0 = Sunday … 6 = Saturday), when
   * that matters for planning — e.g. a weekend-only market. Omitted = any day.
   * Sample data: always check before visiting.
   */
  openDays?: number[]
  /** Set for stops on the Thonburi (west) bank, reached by a cross-river ferry. */
  riverSide?: 'thonburi'
  /** Local photo path; its credit lives in data/imageCredits.ts. */
  image?: string
  /** Free-form descriptors (e.g. "photogenic", "shopping-excluded"). */
  tags: string[]
}

export interface Destination {
  id: string
  name: string
  region: string
  supported: boolean
  intro: string
  image?: string
  /** Shown on inspiration cards for destinations the demo can't plan. */
  unsupportedNote?: string
}

export interface Collection {
  id: string
  destinationId: string
  title: string
  blurb: string
  interest: Interest | null
  placeIds: string[]
  image?: string
}

export interface Hotel {
  id: string
  destinationId: string
  name: string
  area: string
  x: number
  y: number
  fictional: true
}

export interface TripBrief {
  destinationId: string
  startDate: string // ISO yyyy-mm-dd
  days: number
  travellers: number
  startLocationId: string
  /** THB per person for activities, food and local transport across the whole trip. */
  budgetPerPerson: number | null
  interests: Interest[]
  pace: Pace
  travelMode: TravelMode
}

export interface DayPlan {
  placeIds: string[]
  /** Optional per-day pace override (e.g. after "make the day more relaxed"). */
  pace?: Pace
}

export interface Itinerary {
  days: DayPlan[]
  /** Selected places that did not fit. They stay in the trip, not on a day. */
  unscheduled: string[]
  generatedAt: string
  /** Short log of edits applied on top of the generated plan. */
  edits: string[]
}

export type TripStatus = 'draft' | 'saved'

export interface UndoSnapshot {
  label: string
  itinerary: Itinerary
  mustVisit: string[]
  placeIds: string[]
  brief: TripBrief
}

export interface Trip {
  id: string
  name: string
  status: TripStatus
  createdAt: string
  updatedAt: string
  brief: TripBrief
  /** Places the traveller selected for this trip. */
  placeIds: string[]
  mustVisit: string[]
  itinerary: Itinerary | null
  undo: UndoSnapshot | null
  checklist: Record<string, boolean>
  /** Set on the seeded sample trip, so an outdated copy can be recognised. */
  sampleVersion?: number
}

export interface Preferences {
  interests: Interest[]
  pace: Pace
  travelMode: TravelMode
  travellers: number
}
