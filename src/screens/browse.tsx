import { ArrowRight, Bookmark, Compass, MapPinOff, Search, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BottomSheet } from '../components/BottomSheet'
import { DestinationCard, PlaceCard, PlaceImage, SaveButton } from '../components/cards'
import { DemoBadge, TopBar } from '../components/controls'
import { CollectionRailCard, DiscoverTopBar, FeaturedDestination, HeroPanel, PlaceRailCard, SavedInspiration } from '../components/discover'
import { PlaceDetails } from '../components/PlaceDetails'
import { ActionBar, Banner, Button, Chip, EmptyState, Section } from '../components/ui'
import { CATEGORY_LABEL, COLLECTIONS, DESTINATIONS, getCollection, getDestination, INTERESTS } from '../data/catalog'
import { getPlace, PLACES } from '../data/places'
import { collectionFor, DISCOVER_FILTERS, placesFor, withPhotosFirst, type DiscoverFilter } from '../domain/discover'
import type { Category, Place } from '../domain/types'
import { formatDateRange, plural } from '../lib/format'
import { navigate } from '../lib/router'
import { tripHome, useStartTrip } from '../state/hooks'
import { latestDraft } from '../state/model'
import { SUPPORTED_DESTINATION } from '../domain/planner'
import { LegacyNotice, useLoadSample } from './sample'
import { useStore, useToast } from '../state/store'
import { asset } from '../lib/asset'

function useSaveToggle() {
  const { state, dispatch } = useStore()
  const { show } = useToast()
  return (place: Place) => {
    const was = state.savedPlaceIds.includes(place.id)
    dispatch({ type: 'toggleSave', placeId: place.id })
    show({
      tone: 'success',
      message: was ? `Removed ${place.name} from saved` : `Saved ${place.name}`,
      action: was ? { label: 'Undo', onAction: () => dispatch({ type: 'toggleSave', placeId: place.id }) } : undefined,
    })
  }
}

/** Read-only place sheet used while browsing. */
export function BrowsePlaceSheet({ placeId, onClose }: { placeId: string | null; onClose: () => void }) {
  const { state } = useStore()
  const toggle = useSaveToggle()
  const place = placeId ? getPlace(placeId) : undefined
  return (
    <BottomSheet
      open={!!place}
      onClose={onClose}
      title={place?.name ?? ''}
      size="tall"
      footer={
        place && (
          <Button block variant={state.savedPlaceIds.includes(place.id) ? 'secondary' : 'primary'} icon={Bookmark} onClick={() => toggle(place)}>
            {state.savedPlaceIds.includes(place.id) ? 'Saved — tap to remove' : 'Save place'}
          </Button>
        )
      }
    >
      {place && <PlaceDetails place={place} />}
    </BottomSheet>
  )
}

// ── Discover ───────────────────────────────────────────────────

const FILTER_IMAGE: Record<DiscoverFilter, string> = {
  all: asset('/images/bangkok/wat-pho-buddha.jpg'),
  architecture: asset('/images/bangkok/wat-phra-kaew.jpg'),
  food: asset('/images/bangkok/yaowarat-juice.jpg'),
  cafes: asset('/images/bangkok/gallery-drip.jpg'),
  outdoors: asset('/images/bangkok/lumphini-lake.jpg'),
}

export function DiscoverScreen() {
  const { state } = useStore()
  const startTrip = useStartTrip()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<DiscoverFilter>('all')
  const [unsupported, setUnsupported] = useState<string | null>(null)
  const [openPlace, setOpenPlace] = useState<string | null>(null)
  const toggle = useSaveToggle()
  const draft = latestDraft(state)
  const q = query.trim().toLowerCase()
  const destinations = DESTINATIONS.filter((d) => d.name.toLowerCase().includes(q) || d.region.toLowerCase().includes(q))
  const placeMatches = q.length >= 2 ? PLACES.filter((p) => p.name.toLowerCase().includes(q) || p.area.toLowerCase().includes(q)).slice(0, 6) : []
  const saved = state.savedPlaceIds.map(getPlace).filter((p): p is Place => !!p && p.destinationId === SUPPORTED_DESTINATION)
  const unsupportedDest = unsupported ? getDestination(unsupported) : undefined

  const bangkok = getDestination(SUPPORTED_DESTINATION)!
  const filtered = withPhotosFirst(placesFor(SUPPORTED_DESTINATION, filter))
  const sample = useLoadSample()
  const filterLabel = DISCOVER_FILTERS.find((f) => f.id === filter)!.label
  const featuredCollection = collectionFor(filter)
  const savedIds = state.savedPlaceIds

  const plan = () => (draft ? navigate(tripHome(draft)) : startTrip(saved.map((p) => p.id)))

  return (
    <div className="pb-nav">
      <header className="safe-top px-5 pt-2">
        <DiscoverTopBar savedCount={saved.length} />
      </header>

      <div className="mt-3 flex flex-col gap-7 px-5">
        <LegacyNotice />
        <HeroPanel
          title="Your next trip starts here."
          lede="Turn your saved places into a plan."
          cta={
            <Button variant="lime" size="lg" block iconRight={ArrowRight} onClick={plan}>
              {draft ? 'Resume my trip' : 'Plan my trip'}
            </Button>
          }
          secondary={
            draft ? (
              <p className="flex flex-wrap items-center justify-center gap-x-2 text-center text-small text-ink-inverse/90">
                <span>
                  {draft.name} · {draft.brief.startDate ? formatDateRange(draft.brief.startDate, draft.brief.days) : 'dates not set'}
                </span>
                <button type="button" onClick={() => startTrip(saved.map((p) => p.id))} className="inline-flex min-h-11 items-center font-semibold text-ink-inverse underline underline-offset-2">
                  Start a new trip
                </button>
              </p>
            ) : (
              <p className="text-center text-small text-ink-inverse/85">
                {saved.length ? `Starts from your ${plural(saved.length, 'saved place')}` : 'Pick places as you go'}
                {' · '}
                <button type="button" onClick={() => (sample.hasSample ? navigate('/trip/demo-bangkok/itinerary') : sample.request())} className="inline-flex min-h-11 items-center font-semibold text-ink-inverse underline underline-offset-2">
                  {sample.hasSample ? 'Open the Bangkok sample' : 'Load Bangkok sample'}
                </button>
              </p>
            )
          }
        />

        <div role="search" className="relative">
          <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
          <label htmlFor="discover-search" className="sr-only">Search destinations and places</label>
          <input
            id="discover-search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setUnsupported(null)
            }}
            placeholder="Search places or cities"
            className="min-h-12 w-full rounded-chip border border-line bg-surface pr-4 pl-11 text-body text-ink shadow-card placeholder:text-ink-subtle"
          />
        </div>

        {q ? (
          <div className="flex flex-col gap-6" aria-live="polite">
            {unsupportedDest && (
              <Banner tone="info" title={`${unsupportedDest.name} isn't in this demo yet`} role="status" action={
                <Button size="sm" variant="secondary" onClick={() => navigate('/destination/bangkok')}>Explore Bangkok</Button>
              }>
                {unsupportedDest.unsupportedNote ?? 'Inspiration only — planning isn’t available for this destination in the demo.'} Only Bangkok has sample places to plan with.
              </Banner>
            )}
            {destinations.length > 0 && (
              <Section title="Destinations" id="dest-heading">
                <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 no-scrollbar" role="list">
                  {destinations.map((d) => (
                    <div role="listitem" key={d.id}>
                      <DestinationCard destination={d} onOpen={() => (d.supported ? navigate(`/destination/${d.id}`) : setUnsupported(d.id))} />
                    </div>
                  ))}
                </div>
              </Section>
            )}
            {placeMatches.length > 0 && (
              <Section title="Places" id="places-heading">
                <div className="flex flex-col gap-2">
                  {placeMatches.map((p) => (
                    <PlaceCard key={p.id} place={p} saved={savedIds.includes(p.id)} onToggleSave={() => toggle(p)} onOpen={() => setOpenPlace(p.id)} />
                  ))}
                </div>
              </Section>
            )}
            {!destinations.length && !placeMatches.length && (
              <EmptyState icon={MapPinOff} title={`No matches for “${query.trim()}”`} action={<Button variant="secondary" onClick={() => setQuery('')}>Clear search</Button>}>
                This demo has sample places for Bangkok only. Try “Wat” or “coffee”.
              </EmptyState>
            )}
          </div>
        ) : (
          <>
            <div className="-mx-5 -mt-2 flex gap-2 overflow-x-auto px-5 py-0.5 no-scrollbar" role="group" aria-label="Filter by interest">
              {DISCOVER_FILTERS.map((f) => (
                <Chip key={f.id} selected={filter === f.id} onClick={() => setFilter(f.id)}>
                  {f.label}
                </Chip>
              ))}
            </div>

            <FeaturedDestination
              image={FILTER_IMAGE[filter]}
              eyebrow={filter === 'all' ? 'Featured city' : `${filterLabel} in Bangkok`}
              title={filter === 'all' ? bangkok.name : featuredCollection?.title ?? bangkok.name}
              detail={
                filter === 'all'
                  ? `${bangkok.region} · ${plural(filtered.length, 'sample place')}`
                  : `${plural(filtered.length, 'sample place')} match ${filterLabel.toLowerCase()}`
              }
              thumbs={filtered.filter((p) => p.image)}
              exploreLabel="Explore Bangkok"
              onExplore={() => navigate(featuredCollection ? `/collection/${featuredCollection.id}` : '/destination/bangkok')}
            />

            {saved.length ? (
              <SavedInspiration places={saved} onBuild={() => startTrip(saved.map((p) => p.id))} />
            ) : (
              <EmptyState icon={Bookmark} title="Nothing saved yet" action={<Button variant="secondary" onClick={() => navigate('/destination/bangkok')}>Browse Bangkok</Button>}>
                Save places you like, then turn them into a trip.
              </EmptyState>
            )}

            <section aria-labelledby="rail-heading" className="flex flex-col gap-3">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <h2 id="rail-heading" className="text-title font-bold">{filter === 'all' ? 'Bangkok collections' : `${filterLabel} to save`}</h2>
                  <p className="text-small text-ink-subtle">{filter === 'all' ? 'Curated sets of sample places' : 'Tap the bookmark to add to your saved places'}</p>
                </div>
                <a href="#/destination/bangkok" className="inline-flex min-h-11 shrink-0 items-center text-small font-semibold text-primary-ink">See all</a>
              </div>
              <div className="-mx-5 flex items-start gap-3 overflow-x-auto px-5 pb-2 no-scrollbar" role="list">
                {filter === 'all'
                  ? COLLECTIONS.map((c, i) => (
                      <div role="listitem" key={c.id}>
                        <CollectionRailCard
                          collection={c}
                          index={i}
                          savedCount={c.placeIds.filter((id) => savedIds.includes(id)).length}
                          onOpen={() => navigate(`/collection/${c.id}`)}
                        />
                      </div>
                    ))
                  : filtered.map((p, i) => (
                      <div role="listitem" key={p.id}>
                        <PlaceRailCard place={p} index={i} saved={savedIds.includes(p.id)} onToggleSave={() => toggle(p)} onOpen={() => setOpenPlace(p.id)} />
                      </div>
                    ))}
              </div>
            </section>
          </>
        )}
      </div>
      <BrowsePlaceSheet placeId={openPlace} onClose={() => setOpenPlace(null)} />
      {sample.sheet}
    </div>
  )
}

// ── Destination & collection ───────────────────────────────────

export function CollectionScreen({ kind, id }: { kind: 'destination' | 'collection'; id: string }) {
  const { state } = useStore()
  const toggle = useSaveToggle()
  const startTrip = useStartTrip()
  const collection = kind === 'collection' ? getCollection(id) : undefined
  const destination = getDestination(collection?.destinationId ?? id)
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [openPlace, setOpenPlace] = useState<string | null>(null)

  const places = useMemo(() => {
    if (collection) return collection.placeIds.map(getPlace).filter((p): p is Place => !!p)
    return PLACES.filter((p) => p.destinationId === id)
  }, [collection, id])

  if (!destination || (kind === 'collection' && !collection)) {
    return <NotFound />
  }
  if (!destination.supported) {
    return (
      <div className="pb-nav">
        <TopBar back="/discover" title={destination.name} />
        <div className="px-5 pt-4">
          <EmptyState icon={MapPinOff} title={`${destination.name} isn't in this demo`} action={<Button onClick={() => navigate('/destination/bangkok')}>Explore Bangkok</Button>}>
            {destination.unsupportedNote ?? 'Inspiration only — planning isn’t available for this destination in the demo.'} Roam’s prototype only has sample places for Bangkok.
          </EmptyState>
        </div>
      </div>
    )
  }

  const categories = [...new Set(places.map((p) => p.category))]
  const shown = filter === 'all' ? places : places.filter((p) => p.category === filter)
  const savedHere = state.savedPlaceIds.filter((sid) => getPlace(sid)?.destinationId === destination.id)

  return (
    <div className="pb-nav-action">
      <TopBar back="/discover" title={collection ? collection.title : destination.name} />
      <div className="px-5">
        <PlaceImage src={collection?.image ?? destination.image} alt={collection?.title ?? destination.name} category="destination" className="mt-2 aspect-[16/9] w-full rounded-card" />
        <p className="mt-3 text-body text-ink-muted">{collection ? collection.blurb : destination.intro}</p>
        <p className="mt-1 text-small text-ink-subtle">{destination.region} · {plural(places.length, 'place')}</p>

        {categories.length > 1 && (
          <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar" role="group" aria-label="Filter by type">
            <Chip selected={filter === 'all'} onClick={() => setFilter('all')} count={places.length}>All</Chip>
            {categories.map((c) => (
              <Chip key={c} selected={filter === c} onClick={() => setFilter(c)} count={places.filter((p) => p.category === c).length}>
                {CATEGORY_LABEL[c]}
              </Chip>
            ))}
          </div>
        )}

        <ul className="mt-4 flex flex-col gap-2">
          {shown.map((p) => (
            <li key={p.id}>
              <PlaceCard place={p} saved={state.savedPlaceIds.includes(p.id)} onToggleSave={() => toggle(p)} onOpen={() => setOpenPlace(p.id)} />
            </li>
          ))}
        </ul>
      </div>
      <ActionBar aboveNav>
        <Button block icon={Sparkles} disabled={!savedHere.length} onClick={() => startTrip(savedHere, destination.id)}>
          {savedHere.length ? `Plan with ${plural(savedHere.length, 'saved place')}` : 'Save places to start planning'}
        </Button>
      </ActionBar>
      <BrowsePlaceSheet placeId={openPlace} onClose={() => setOpenPlace(null)} />
    </div>
  )
}

// ── Saved ──────────────────────────────────────────────────────

export function SavedScreen() {
  const { state } = useStore()
  const toggle = useSaveToggle()
  const startTrip = useStartTrip()
  const [openPlace, setOpenPlace] = useState<string | null>(null)
  const saved = state.savedPlaceIds.map(getPlace).filter((p): p is Place => !!p)
  const groups = [...INTERESTS, { id: 'park', label: 'Green spaces', category: 'park' as const }]
    .map((i) => ({ ...i, places: saved.filter((p) => p.category === i.category) }))
    .filter((g) => g.places.length)

  return (
    <div className={saved.length ? 'pb-nav-action' : 'pb-nav'}>
      <TopBar title="Saved" large subtitle={saved.length ? `${plural(saved.length, 'place')} in Bangkok` : undefined} actions={<DemoBadge />} />
      <div className="mt-4 flex flex-col gap-6 px-5">
        <div className="saved-editorial"><span className="chapter-label">YOUR PERSONAL ATLAS</span><h2>Good finds.<br/>Great possibilities.</h2><p>Keep the places. Find your own way.</p><img src={asset('/images/bangkok/tuk-tuk.jpg')} alt="" /></div>
        {saved.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="Your saved collection is empty"
            action={<Button icon={Compass} onClick={() => navigate('/destination/bangkok')}>Browse Bangkok places</Button>}
          >
            Tap the bookmark on any place to keep it here. Saved places become the starting point for a trip.
          </EmptyState>
        ) : (
          groups.map((g) => (
            <Section key={g.id} title={g.label} id={`saved-${g.id}`}>
              <ul className="flex flex-col gap-2">
                {g.places.map((p) => (
                  <li key={p.id}>
                    <PlaceCard place={p} onOpen={() => setOpenPlace(p.id)} trailing={<SaveButton saved onToggle={() => toggle(p)} name={p.name} compact />} />
                  </li>
                ))}
              </ul>
            </Section>
          ))
        )}
      </div>
      {saved.length > 0 && (
        <ActionBar aboveNav>
          <Button block icon={Sparkles} onClick={() => startTrip(state.savedPlaceIds)}>
            Plan a trip with {plural(saved.length, 'place')}
          </Button>
        </ActionBar>
      )}
      <BrowsePlaceSheet placeId={openPlace} onClose={() => setOpenPlace(null)} />
    </div>
  )
}

export function NotFound() {
  return (
    <div className="px-5 pt-10">
      <EmptyState icon={MapPinOff} title="Page not found" headingLevel={1} action={<Button onClick={() => navigate('/discover')}>Go to Discover</Button>}>
        This link doesn't match anything in the demo.
      </EmptyState>
    </div>
  )
}
