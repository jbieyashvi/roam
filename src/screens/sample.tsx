/*
 * The Bangkok sample trip and trips kept from the earlier sample city.
 * Loading the sample only ever replaces the sample trip itself; nothing else is touched.
 */
import { Archive, ChevronRight, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { BottomSheet, ConfirmSheet } from '../components/BottomSheet'
import { TopBar } from '../components/controls'
import { Banner, Button, Card, Section, Tag } from '../components/ui'
import { LEGACY_DEMO_TRIP_ID, LEGACY_PLACE_NAMES } from '../data/legacy'
import { getPlace } from '../data/places'
import type { Trip } from '../domain/types'
import { formatDateRange, formatTHB, plural } from '../lib/format'
import { navigate } from '../lib/router'
import { DEMO_BRIEF, DEMO_TRIP_ID, DEMO_TRIP_NAME, demoTrip } from '../state/demo'
import { findArchivedTrip, findTrip } from '../state/model'
import { useStore, useToast } from '../state/store'
import { NotFound } from './browse'

const SAMPLE_PATH = `/trip/${DEMO_TRIP_ID}/itinerary`
const SAMPLE_SUMMARY = `${DEMO_BRIEF.days} days in Bangkok for ${plural(DEMO_BRIEF.travellers, 'adult')}, ${formatTHB(DEMO_BRIEF.budgetPerPerson ?? 0)} per person`

/** A sample trip the person hasn't changed since it was loaded. */
const isUntouched = (t: Trip) => t.updatedAt === t.createdAt

/**
 * "Load Bangkok sample": opens the sample straight away when there is nothing to replace,
 * otherwise asks first and explains exactly what is replaced.
 */
export function useLoadSample() {
  const { state, dispatch } = useStore()
  const { show } = useToast()
  const [asking, setAsking] = useState(false)
  const existing = findTrip(state, DEMO_TRIP_ID)

  const load = () => {
    dispatch({ type: 'createTrip', trip: demoTrip(new Date().toISOString()) })
    setAsking(false)
    navigate(SAMPLE_PATH)
    show({ tone: 'success', message: existing ? 'Bangkok sample reloaded' : 'Bangkok sample loaded', path: SAMPLE_PATH })
  }
  const request = () => (existing ? setAsking(true) : load())

  const sheet = (
    <BottomSheet
      open={asking}
      onClose={() => setAsking(false)}
      title="Replace the Bangkok sample?"
      footer={
        <div className="flex flex-col gap-2">
          <Button block onClick={load}>Replace with a fresh sample</Button>
          <Button block variant="secondary" onClick={() => { setAsking(false); navigate(SAMPLE_PATH) }}>Open my current sample</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-2 text-body text-ink-muted">
        <p>
          This replaces <strong className="text-ink">only “{existing?.name ?? DEMO_TRIP_NAME}”</strong> with the original sample: {SAMPLE_SUMMARY}.
          Any edits, applied changes or saved status on that sample trip are lost.
        </p>
        <p>Your other trips, saved places, trip defaults and any trips from the earlier sample city stay exactly as they are.</p>
      </div>
    </BottomSheet>
  )
  return { request, sheet, hasSample: !!existing }
}

/** A button that loads (or offers to replace) the Bangkok sample. */
export function LoadSampleButton({ variant = 'secondary', size, block }: { variant?: 'primary' | 'secondary' | 'ghost'; size?: 'sm' | 'lg'; block?: boolean }) {
  const { request, sheet } = useLoadSample()
  return (
    <>
      <Button variant={variant} size={size} block={block} icon={Sparkles} onClick={request}>Load Bangkok sample</Button>
      {sheet}
    </>
  )
}

/** `#/sample` — a direct, setup-free link to the sample trip. */
export function SampleScreen() {
  const { state, dispatch } = useStore()
  const existing = findTrip(state, DEMO_TRIP_ID)
  const { request, sheet } = useLoadSample()
  const handled = useRef(false)

  // No sample yet, or an unchanged one: just open it.
  useEffect(() => {
    if (handled.current) return
    if (!existing) {
      handled.current = true
      dispatch({ type: 'createTrip', trip: demoTrip(new Date().toISOString()) })
      navigate(SAMPLE_PATH, { replace: true })
    } else if (isUntouched(existing)) {
      handled.current = true
      navigate(SAMPLE_PATH, { replace: true })
    }
  }, [existing, dispatch])

  if (!existing || isUntouched(existing)) return null
  return (
    <div className="pb-8">
      <TopBar back="/trips" title="Bangkok sample" />
      <div className="flex flex-col gap-3 px-5 pt-2">
        <p className="text-body text-ink-muted">
          You’ve already changed the sample trip “{existing.name}”. Open it as it is, or replace it with a fresh copy ({SAMPLE_SUMMARY}).
        </p>
        <Button block onClick={() => navigate(SAMPLE_PATH, { replace: true })}>Open my current sample</Button>
        <Button block variant="secondary" onClick={request}>Replace with a fresh sample…</Button>
      </div>
      {sheet}
    </div>
  )
}

/** Shown on any trip route whose trip isn't in the current trips. */
export function MissingTrip({ tripId }: { tripId: string }) {
  const { state } = useStore()
  const archived = findArchivedTrip(state, tripId)
  if (archived) return <ArchivedTripScreen trip={archived} />
  if (tripId !== DEMO_TRIP_ID && tripId !== LEGACY_DEMO_TRIP_ID) return <NotFound />
  return (
    <div className="px-5 pt-10">
      <h1 className="sr-only">Sample trip</h1>
      <Banner tone="info" title="The sample trip isn’t loaded" action={<><LoadSampleButton variant="primary" size="sm" /><Button size="sm" variant="ghost" onClick={() => navigate('/discover')}>Go to Discover</Button></>}>
        Trips are stored only in this browser. Load the Bangkok sample ({SAMPLE_SUMMARY}) to continue.
      </Banner>
    </div>
  )
}

const archivedPlaceName = (id: string) => LEGACY_PLACE_NAMES[id] ?? getPlace(id)?.name ?? id

/** Read-only view of a trip from the earlier sample city. */
export function ArchivedTripScreen({ trip }: { trip: Trip }) {
  const { dispatch } = useStore()
  const { show } = useToast()
  const [deleting, setDeleting] = useState(false)
  const days = trip.itinerary?.days ?? []
  return (
    <div className="pb-8">
      <TopBar back="/trips" title="Archived trip" />
      <div className="flex flex-col gap-5 px-5 pt-2">
        <div>
          <Tag tone="neutral">Read-only</Tag>
          <h1 className="mt-2 text-title font-bold">{trip.name}</h1>
          {trip.brief?.startDate && <p className="text-small text-ink-muted">{formatDateRange(trip.brief.startDate, trip.brief.days)}</p>}
        </div>
        <Banner tone="info" title="Kept from the earlier sample city">
          Roam’s sample city is now Bangkok, so this trip can’t be planned or edited. It’s kept here, unchanged, until you delete it.
        </Banner>
        {days.length > 0 ? (
          days.map((d, i) => (
            <Section key={i} title={`Day ${i + 1}`} id={`archived-day-${i}`}>
              <ul className="flex flex-col gap-1 text-body">
                {d.placeIds.length ? d.placeIds.map((id) => <li key={id}>{archivedPlaceName(id)}</li>) : <li className="text-ink-muted">Nothing planned</li>}
              </ul>
            </Section>
          ))
        ) : (
          <Section title="Places" id="archived-places">
            <ul className="flex flex-col gap-1 text-body">
              {trip.placeIds.map((id) => <li key={id}>{archivedPlaceName(id)}</li>)}
            </ul>
          </Section>
        )}
        <div className="flex flex-col gap-2">
          <LoadSampleButton variant="primary" block />
          <Button block variant="ghost" icon={Trash2} onClick={() => setDeleting(true)}>Delete this archived trip</Button>
        </div>
      </div>
      <ConfirmSheet
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Delete this archived trip?"
        confirmLabel="Delete trip"
        destructive
        onConfirm={() => {
          dispatch({ type: 'deleteArchivedTrip', tripId: trip.id })
          show({ tone: 'success', message: `Deleted “${trip.name}”` })
          navigate('/trips', { replace: true })
        }}
      >
        “{trip.name}” will be removed from this browser. Nothing else changes.
      </ConfirmSheet>
    </div>
  )
}

/** "Earlier sample city" list for My trips. */
export function ArchivedTrips() {
  const { state } = useStore()
  if (!state.archivedTrips.length) return null
  return (
    <Section title="Earlier sample city" id="archived-trips">
      <p className="-mt-2 text-small text-ink-muted">Read-only. Kept from before Roam’s sample city became Bangkok.</p>
      <ul className="flex flex-col gap-2">
        {state.archivedTrips.map((t) => (
          <li key={t.id}>
            <Card className="p-0">
              <button type="button" onClick={() => navigate(`/trip/${t.id}`)} className="flex min-h-14 w-full items-center gap-3 rounded-card p-3 text-left hover:bg-surface-sunken">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-surface-sunken text-ink-muted"><Archive size={18} aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold">{t.name}</span>
                  <span className="block text-small text-ink-muted">Archived · {plural(t.placeIds?.length ?? 0, 'place')}</span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-ink-subtle" aria-hidden />
              </button>
            </Card>
          </li>
        ))}
      </ul>
    </Section>
  )
}

/** One-time notice after upgrading from the earlier sample city. */
export function LegacyNotice({ onTrips = false }: { onTrips?: boolean }) {
  const { state, dispatch } = useStore()
  const legacy = state.legacy
  if (!legacy || legacy.noticeDismissed) return null
  const trips = state.archivedTrips.length
  const saved = legacy.savedPlaceIds.length
  return (
    <Banner
      tone="info"
      role="status"
      title="Roam’s sample city is now Bangkok"
      action={
        <>
          {trips > 0 && !onTrips && <Button size="sm" variant="secondary" onClick={() => navigate('/trips')}>See my trips</Button>}
          <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'dismissLegacyNotice' })}>Got it</Button>
        </>
      }
    >
      Nothing was deleted.{' '}
      {trips > 0 ? `Your ${plural(trips, 'earlier trip')} ${trips === 1 ? 'is' : 'are'} kept read-only in My trips. ` : ''}
      {saved > 0 ? `${plural(saved, 'earlier saved place')} ${saved === 1 ? 'is' : 'are'} kept aside, and your saved list now starts from Bangkok picks.` : ''}
    </Banner>
  )
}
