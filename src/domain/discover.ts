/*
 * Discover filters. Pure data helpers — the screen only renders what these return.
 */
import { COLLECTIONS } from '../data/catalog'
import { PLACES } from '../data/places'
import type { Collection, Place } from './types'

export type DiscoverFilter = 'all' | 'architecture' | 'food' | 'cafes' | 'outdoors'

export const DISCOVER_FILTERS: { id: DiscoverFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'food', label: 'Food' },
  { id: 'cafes', label: 'Cafés' },
  { id: 'outdoors', label: 'Outdoors' },
]

/** Parks, and places tagged as open-air, green, riverside or with views, count as "Outdoors". */
const OUTDOOR_TAGS = ['outdoor', 'green', 'riverside', 'views', 'walking']
export const isOutdoors = (p: Place) => p.category === 'park' || p.tags.some((t) => OUTDOOR_TAGS.includes(t))

export function matchesFilter(p: Place, f: DiscoverFilter) {
  switch (f) {
    case 'all':
      return true
    case 'architecture':
      return p.category === 'architecture'
    case 'food':
      return p.category === 'food'
    case 'cafes':
      return p.category === 'cafe'
    case 'outdoors':
      return isOutdoors(p)
  }
}

export const placesFor = (destinationId: string, f: DiscoverFilter) =>
  PLACES.filter((p) => p.destinationId === destinationId && matchesFilter(p, f))

/** The collection that best represents a filter (used for "Explore" links). */
const FILTER_COLLECTION: Record<DiscoverFilter, string | null> = {
  all: null,
  architecture: 'bangkok-temples',
  food: 'bangkok-food',
  cafes: 'bangkok-cafes',
  outdoors: 'bangkok-green',
}
export const collectionFor = (f: DiscoverFilter): Collection | undefined =>
  COLLECTIONS.find((c) => c.id === FILTER_COLLECTION[f])

/** Places with photos first so photo-led cards stay photo-led; stable order otherwise. */
export const withPhotosFirst = (ps: Place[]) => [...ps.filter((p) => p.image), ...ps.filter((p) => !p.image)]
