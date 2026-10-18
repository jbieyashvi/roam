import { getPlace } from '../data/places'
import { SUPPORTED_DESTINATION } from '../domain/planner'
import type { Trip } from '../domain/types'
import { navigate } from '../lib/router'
import { findTrip, makeTrip, newBrief } from './model'
import type { PlanState } from '../domain/adjust'
import { useStore, useToast } from './store'

export function useTrip(id: string | undefined) {
  const { state } = useStore()
  return findTrip(state, id)
}

/** Creates a draft trip from the given places and opens its brief. */
export function useStartTrip() {
  const { state, dispatch } = useStore()
  return (placeIds: string[], destinationId = SUPPORTED_DESTINATION) => {
    const id = `trip-${Date.now().toString(36)}`
    const ids = placeIds.filter((pid) => getPlace(pid)?.destinationId === destinationId)
    dispatch({ type: 'createTrip', trip: makeTrip(id, newBrief(state.preferences, destinationId), ids, new Date().toISOString()) })
    navigate(`/trip/${id}/brief`)
  }
}

/** Where "resume" should land for a trip. */
export function tripHome(trip: Trip) {
  if (trip.status === 'saved') return `/trip/${trip.id}`
  if (trip.itinerary) return `/trip/${trip.id}/itinerary`
  return `/trip/${trip.id}/brief`
}

/**
 * Applies a plan change with an undo snapshot and an Undo toast.
 * Pass `toastPath` when the change is applied just before navigating there.
 */
export function useApplyChange(tripId: string) {
  const { dispatch } = useStore()
  const { show } = useToast()
  return (label: string, next: Partial<PlanState>, toastPath?: string) => {
    dispatch({ type: 'applyChange', tripId, label, next })
    show({
      tone: 'success',
      message: label,
      path: toastPath,
      action: {
        label: 'Undo',
        onAction: () => {
          dispatch({ type: 'undo', tripId })
          show({ tone: 'info', message: 'Change undone' })
        },
      },
    })
  }
}
