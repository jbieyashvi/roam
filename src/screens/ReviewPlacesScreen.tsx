import { Link2, Plus, RefreshCw, Search, SlidersHorizontal, Sparkles, Star, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BottomSheet } from '../components/BottomSheet'
import { PlaceCard, PlaceImage } from '../components/cards'
import { TopBar } from '../components/controls'
import { ActionBar, Banner, Button, Card, Chip, EmptyState, Field, inputClass, Segmented, Spinner } from '../components/ui'
import { CATEGORY_LABEL, DEMO_LINKS, getHotel, getDestination } from '../data/catalog'
import { getPlace, PLACES, requirePlace } from '../data/places'
import { availableMins, generateItinerary, PACE_RULES } from '../domain/planner'
import type { Category, Place, Trip } from '../domain/types'
import { formatDateRange, formatDuration, formatTHB, plural } from '../lib/format'
import { navigate, setQuery, useRoute } from '../lib/router'
import { useTrip } from '../state/hooks'
import { useStore, useToast } from '../state/store'
import { MissingTrip } from './sample'

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Summary of the brief so travellers can see what the plan must fit. */
export function ConstraintSummary({ trip, editHref }: { trip: Trip; editHref: string }) {
  const b = trip.brief
  const must = trip.mustVisit.filter((id) => trip.placeIds.includes(id))
  const mustMins = must.reduce((s, id) => s + requirePlace(id).visitMins, 0)
  const avail = availableMins(b)
  return (
    <Card className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="text-small">
          <p className="font-semibold">
            {getDestination(b.destinationId)?.name} · {plural(b.days, 'day')} · {plural(b.travellers, 'traveller')}
          </p>
          <p className="text-ink-muted">{formatDateRange(b.startDate, b.days)}</p>
          <p className="text-ink-muted">
            {b.budgetPerPerson ? `${formatTHB(b.budgetPerPerson)} pp budget` : 'No budget set'} · {PACE_RULES[b.pace].label} pace ·{' '}
            {b.travelMode === 'walk-car' ? 'Walk + taxi' : 'Taxi-first'}
          </p>
          <p className="text-ink-muted">From {getHotel(b.startLocationId).name}</p>
        </div>
        <a href={`#${editHref}`} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-control px-2 text-small font-semibold text-primary-ink hover:bg-primary-soft">
          <SlidersHorizontal size={15} aria-hidden /> Edit
        </a>
      </div>
      {must.length > 0 && (
        <p className={`mt-2 border-t border-line pt-2 text-small ${mustMins > avail ? 'font-semibold text-danger' : 'text-ink-muted'}`}>
          Must-visits need ~{formatDuration(mustMins)} of about {formatDuration(avail)} sightseeing time ({PACE_RULES[b.pace].label.toLowerCase()} pace).
        </p>
      )}
    </Card>
  )
}

// ── Add places sheet ───────────────────────────────────────────

function AddPlaceSheet({
  open, onClose, trip, initialLink,
}: { open: boolean; onClose: () => void; trip: Trip; initialLink: string | null }) {
  const { dispatch } = useStore()
  const { show } = useToast()
  const [tab, setTab] = useState<'search' | 'link'>(initialLink ? 'link' : 'search')
  const [q, setQ] = useState('')
  const [link, setLink] = useState(initialLink ?? '')
  const [checked, setChecked] = useState<{ status: 'found'; place: Place } | { status: 'unsupported' } | { status: 'invalid' } | null>(null)

  const check = (value = link) => {
    const v = value.trim().replace(/\/+$/, '')
    if (!v) return setChecked({ status: 'invalid' })
    const id = DEMO_LINKS[v]
    setChecked(id ? { status: 'found', place: requirePlace(id) } : { status: 'unsupported' })
  }
  // Opening via ?link= runs the check immediately, like a share-sheet hand-off.
  const ran = useRef(false)
  useEffect(() => {
    if (open && initialLink && !ran.current) {
      ran.current = true
      setTab('link')
      setLink(initialLink)
      check(initialLink)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialLink])

  const add = (p: Place) => {
    dispatch({ type: 'addTripPlace', tripId: trip.id, placeId: p.id })
    show({ tone: 'success', message: `Added ${p.name}`, action: { label: 'Undo', onAction: () => dispatch({ type: 'removeTripPlace', tripId: trip.id, placeId: p.id }) } })
  }
  const results = PLACES.filter(
    (p) => p.destinationId === trip.brief.destinationId && (!q.trim() || `${p.name} ${p.area} ${CATEGORY_LABEL[p.category]}`.toLowerCase().includes(q.trim().toLowerCase())),
  )

  return (
    <BottomSheet open={open} onClose={onClose} title="Add a place" size="tall">
      <div className="flex flex-col gap-4">
        <Segmented
          label="Add by"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'search', label: 'Search', icon: Search },
            { value: 'link', label: 'Paste a link', icon: Link2 },
          ]}
        />
        {tab === 'search' ? (
          <>
            <Field label="Search Bangkok places" htmlFor="add-search">
              <input id="add-search" data-autofocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. wat, coffee, market" className={inputClass()} />
            </Field>
            <ul className="flex flex-col gap-2" aria-label="Search results">
              {results.length === 0 && <li className="text-small text-ink-muted">No sample places match “{q}”.</li>}
              {results.map((p) => {
                const inTrip = trip.placeIds.includes(p.id)
                return (
                  <li key={p.id} className="flex items-center gap-3 rounded-card border border-line p-2">
                    <PlaceImage src={p.image} alt="" category={p.category} className="size-12 shrink-0 rounded-[8px]" iconSize={18} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body font-semibold">{p.name}</p>
                      <p className="text-small text-ink-muted">{CATEGORY_LABEL[p.category]} · {p.area}</p>
                    </div>
                    <Button size="sm" variant={inTrip ? 'quiet' : 'secondary'} disabled={inTrip} onClick={() => add(p)} aria-label={inTrip ? `${p.name} is in this trip` : `Add ${p.name}`}>
                      {inTrip ? 'Added' : 'Add'}
                    </Button>
                  </li>
                )
              })}
            </ul>
          </>
        ) : (
          <>
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                check()
              }}
            >
              <Field label="Shared link" htmlFor="add-link" helper="Roam recognises a few demo links. It doesn't read Instagram, TikTok or blog content.">
                <input
                  id="add-link"
                  data-autofocus
                  type="url"
                  inputMode="url"
                  value={link}
                  onChange={(e) => {
                    setLink(e.target.value)
                    setChecked(null)
                  }}
                  placeholder="https://"
                  className={inputClass(checked?.status === 'invalid')}
                />
              </Field>
              <Button type="submit" variant="secondary">Check link</Button>
            </form>
            <div>
              <p className="text-micro font-semibold text-ink-subtle uppercase">Try a demo link</p>
              <ul className="mt-1 flex flex-col">
                {Object.keys(DEMO_LINKS).map((url) => (
                  <li key={url}>
                    <button
                      type="button"
                      onClick={() => {
                        setLink(url)
                        check(url)
                      }}
                      className="min-h-11 w-full truncate rounded-control px-2 text-left text-small text-primary-ink hover:bg-primary-soft"
                    >
                      {url.replace('https://', '')}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div aria-live="polite">
              {checked?.status === 'invalid' && <p className="text-small text-danger" role="alert">Paste a link first.</p>}
              {checked?.status === 'unsupported' && (
                <Banner
                  tone="warning"
                  title="We couldn't read that link"
                  action={
                    <Button size="sm" variant="secondary" icon={Search} onClick={() => setTab('search')}>
                      Search places instead
                    </Button>
                  }
                >
                  This demo only recognises its sample links, so nothing was imported. Search for the place by name to add it.
                </Banner>
              )}
              {checked?.status === 'found' && (
                <Card className="p-3">
                  <p className="text-micro font-semibold text-ink-subtle uppercase">Matched demo link</p>
                  <div className="mt-2 flex items-center gap-3">
                    <PlaceImage src={checked.place.image} alt="" category={checked.place.category} className="size-14 shrink-0 rounded-[8px]" />
                    <div className="min-w-0">
                      <p className="text-body font-semibold">{checked.place.name}</p>
                      <p className="text-small text-ink-muted">{CATEGORY_LABEL[checked.place.category]} · {checked.place.area}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-small text-ink-muted">Is this the place you meant?</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => setChecked(null)}>Not this</Button>
                    {trip.placeIds.includes(checked.place.id) ? (
                      <Button size="sm" className="flex-1" disabled>Already in trip</Button>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1"
                        icon={Plus}
                        onClick={() => {
                          add(checked.place)
                          setChecked(null)
                          setLink('')
                        }}
                      >
                        Add to trip
                      </Button>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  )
}

// ── Must-visit conflict ────────────────────────────────────────

type Conflict = { unplaced: string[]; neededMins: number; availableMins: number; packedResolves: boolean }

function ConflictSheet({ trip, conflict, onClose, onResolved }: { trip: Trip; conflict: Conflict | null; onClose: () => void; onResolved: () => void }) {
  const { dispatch } = useStore()
  const must = trip.mustVisit.filter((id) => trip.placeIds.includes(id))
  const [keep, setKeep] = useState<string[]>(must)
  useEffect(() => setKeep(must), [conflict]) // eslint-disable-line react-hooks/exhaustive-deps
  const keepMins = keep.reduce((s, id) => s + requirePlace(id).visitMins, 0)
  const fits = generateItinerary({ ...trip, mustVisit: keep }).ok || keep.length === 0
  return (
    <BottomSheet
      open={!!conflict}
      onClose={onClose}
      title="Too many must-visits to fit"
      subtitle="Choose what to relax — nothing changes until you confirm."
      size="tall"
      footer={
        <Button
          block
          disabled={!fits}
          onClick={() => {
            dispatch({ type: 'setMust', tripId: trip.id, placeIds: keep })
            onResolved()
          }}
        >
          {fits ? `Keep ${plural(keep.length, 'must-visit')} and plan` : 'Still too many — untick more'}
        </Button>
      }
    >
      {conflict && (
        <div className="flex flex-col gap-4">
          <Banner tone="warning" title={`${conflict.unplaced.length} of ${plural(must.length, 'must-visit')} won't fit`}>
            Your must-visits need about <strong>{formatDuration(conflict.neededMins)}</strong> plus travel, but a {PACE_RULES[trip.brief.pace].label.toLowerCase()}{' '}
            {trip.brief.days}-day plan has about <strong>{formatDuration(conflict.availableMins)}</strong>.
          </Banner>
          {conflict.packedResolves && (
            <Card className="p-3">
              <p className="text-body font-semibold">Relax the pace instead</p>
              <p className="text-small text-ink-muted">Switch to a packed pace (8:30 am – 9 pm, up to 8 stops) and keep every must-visit.</p>
              <Button
                className="mt-2"
                size="sm"
                variant="secondary"
                onClick={() => {
                  dispatch({ type: 'updateBrief', tripId: trip.id, patch: { pace: 'packed' } })
                  onResolved()
                }}
              >
                Switch to packed pace
              </Button>
            </Card>
          )}
          <fieldset>
            <legend className="text-body font-semibold">Or choose which must-visits to keep</legend>
            <p className="text-small text-ink-muted">Unticked places stay in the trip as flexible stops. Selected: ~{formatDuration(keepMins)}.</p>
            <ul className="mt-2 flex flex-col gap-1">
              {must.map((id) => {
                const p = requirePlace(id)
                const on = keep.includes(id)
                return (
                  <li key={id}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-1 hover:bg-surface-sunken">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => setKeep(on ? keep.filter((x) => x !== id) : [...keep, id])}
                        className="size-5 accent-[var(--color-accent)]"
                      />
                      <span className="flex-1 text-body">{p.name}</span>
                      <span className="text-small text-ink-subtle">~{formatDuration(p.visitMins)}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </fieldset>
          <p className="text-small text-ink-subtle">Longer trips aren't supported in this demo, so adding a day isn't an option here.</p>
        </div>
      )}
    </BottomSheet>
  )
}

// ── Screen ─────────────────────────────────────────────────────

export function ReviewPlacesScreen({ tripId }: { tripId: string }) {
  const trip = useTrip(tripId)
  const { state, dispatch } = useStore()
  const { show } = useToast()
  const { query } = useRoute()
  const linkParam = query.get('link')
  const [adding, setAdding] = useState(!!linkParam)
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [phase, setPhase] = useState<'idle' | 'planning' | 'failed'>('idle')
  const [conflict, setConflict] = useState<Conflict | null>(null)
  const places = useMemo(() => (trip ? trip.placeIds.map(getPlace).filter((p): p is Place => !!p) : []), [trip])
  // After resolving a conflict, re-plan once the store holds the updated trip.
  const [replan, setReplan] = useState(0)
  const createRef = useRef<() => void>(undefined)
  useEffect(() => {
    if (replan) createRef.current?.()
  }, [replan])
  if (!trip) return <MissingTrip tripId={tripId} />

  const categories = [...new Set(places.map((p) => p.category))]
  const shown = filter === 'all' ? places : places.filter((p) => p.category === filter)
  const mustCount = trip.mustVisit.filter((id) => trip.placeIds.includes(id)).length

  const create = (override?: Trip) => {
    setConflict(null)
    setPhase('planning')
    window.setTimeout(() => {
      if (state.demo.failNextPlan) {
        dispatch({ type: 'setDemoFlag', failNextPlan: false })
        setPhase('failed')
        return
      }
      const res = generateItinerary(override ?? trip)
      if (res.ok) {
        dispatch({ type: 'setItinerary', tripId, itinerary: res.itinerary })
        navigate(`/trip/${tripId}/itinerary`)
        return
      }
      setPhase('idle')
      if (res.reason === 'must-visit-conflict') setConflict(res)
      else if (res.reason === 'no-places') show({ tone: 'error', message: 'Add at least one place first' })
      else navigate(`/trip/${tripId}/brief?step=1&validate=1`)
    }, reducedMotion() ? 150 : 1100)
  }
  createRef.current = () => create()

  return (
    <div className="pb-action">
      <TopBar back={`/trip/${tripId}/brief?step=3`} title="Review places" />
      <div className="flex flex-col gap-4 px-5">
        <ConstraintSummary trip={trip} editHref={`/trip/${tripId}/brief?step=1`} />

        {phase === 'failed' && (
          <Banner
            tone="error"
            title="We couldn't create your itinerary"
            role="alert"
            action={
              <Button size="sm" icon={RefreshCw} onClick={() => create()}>
                Retry
              </Button>
            }
          >
            Something went wrong while planning. Your places and must-visits are unchanged.
          </Banner>
        )}

        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="text-heading font-semibold">{plural(places.length, 'place')}</h2>
            <p className="text-small text-ink-muted">
              {mustCount ? `${plural(mustCount, 'must-visit')} · the rest are flexible` : 'Mark the places you won’t skip as must-visit'}
            </p>
          </div>
          <Button size="sm" variant="secondary" icon={Plus} onClick={() => setAdding(true)}>
            Add
          </Button>
        </div>

        {categories.length > 1 && (
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar" role="group" aria-label="Filter by type">
            <Chip selected={filter === 'all'} onClick={() => setFilter('all')} count={places.length}>All</Chip>
            {categories.map((c) => (
              <Chip key={c} selected={filter === c} onClick={() => setFilter(c)} count={places.filter((p) => p.category === c).length}>
                {CATEGORY_LABEL[c]}
              </Chip>
            ))}
          </div>
        )}

        {places.length === 0 ? (
          <EmptyState icon={Plus} title="No places in this trip yet" action={<Button icon={Plus} onClick={() => setAdding(true)}>Add a place</Button>}>
            Search the sample Bangkok places or paste a demo link.
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-2">
            {shown.map((p) => {
              const must = trip.mustVisit.includes(p.id)
              return (
                <li key={p.id}>
                  <PlaceCard
                    place={p}
                    mustVisit={must}
                    footer={
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          aria-pressed={must}
                          onClick={() => dispatch({ type: 'toggleMust', tripId, placeId: p.id })}
                          className={`inline-flex min-h-11 items-center gap-1.5 rounded-chip px-3 text-small font-semibold ${must ? 'bg-accent-soft text-accent-ink' : 'text-ink-muted hover:bg-surface-sunken'}`}
                        >
                          <Star size={16} aria-hidden fill={must ? 'currentColor' : 'none'} />
                          Must visit <span className="sr-only">{p.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            dispatch({ type: 'removeTripPlace', tripId, placeId: p.id })
                            show({
                              tone: 'success',
                              message: `Removed ${p.name}`,
                              action: {
                                label: 'Undo',
                                onAction: () => {
                                  dispatch({ type: 'addTripPlace', tripId, placeId: p.id })
                                  if (must) dispatch({ type: 'toggleMust', tripId, placeId: p.id })
                                },
                              },
                            })
                          }}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-chip px-3 text-small font-semibold text-ink-muted hover:bg-danger-soft hover:text-danger"
                        >
                          <Trash2 size={16} aria-hidden /> Remove <span className="sr-only">{p.name}</span>
                        </button>
                      </div>
                    }
                  />
                </li>
              )
            })}
          </ul>
        )}
        <p className="text-small text-ink-subtle">Visit times and costs are sample estimates. Flights and accommodation aren't included.</p>
      </div>

      <ActionBar>
        {phase === 'planning' ? (
          <div className="flex min-h-12 items-center justify-center rounded-control bg-primary-soft text-body font-semibold text-primary-ink">
            <Spinner label="Applying planning rules to your places…" />
          </div>
        ) : (
          <Button block size="lg" icon={Sparkles} disabled={!places.length} onClick={() => create()}>
            {trip.itinerary ? 'Re-create itinerary' : 'Create itinerary'}
          </Button>
        )}
      </ActionBar>

      <AddPlaceSheet
        open={adding}
        onClose={() => {
          setAdding(false)
          if (linkParam) setQuery({ link: null })
        }}
        trip={trip}
        initialLink={linkParam}
      />
      <ConflictSheet
        trip={trip}
        conflict={conflict}
        onClose={() => setConflict(null)}
        onResolved={() => {
          setConflict(null)
          setReplan((n) => n + 1)
        }}
      />
    </div>
  )
}
