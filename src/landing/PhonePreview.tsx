/*
 * Static, faithful previews of three Roam screens (Discover, a day's itinerary, the day map)
 * inside an iPhone 13 frame (notch, no Dynamic Island). Each is a picture of the app, so it is
 * inert and announced as one image.
 */
import { BatteryFull, Bookmark, CarTaxiFront, ChevronLeft, Footprints, List, Map as MapIcon, Signal, Sparkles, Star, Wallet, Wifi } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '../components/ui'
import { SchematicMap } from '../components/itinerary'
import { CATEGORY_LABEL, getDestination } from '../data/catalog'
import { requirePlace } from '../data/places'
import type { TimelineItem } from '../domain/planner'
import { asset } from '../lib/asset'
import { formatClock, formatDuration, formatTHB } from '../lib/format'
import { SAMPLE_DATES, SAMPLE_NAME, SAMPLE_PARTY, SAMPLE_PLAN, scheduleFor } from './sample'

const day1 = scheduleFor(SAMPLE_PLAN, 0)
const stops = day1.items.filter((i): i is Extract<TimelineItem, { kind: 'stop' }> => i.kind === 'stop')
const bangkok = getDestination('bangkok')!
/** The same three photos as the app's Discover hero collage. */
const COLLAGE = ['wat-arun-river', 'chinatown-lantern', 'talat-noi-art'].map((n) => asset(`/images/bangkok/${n}.jpg`))
const SAVED = ['grand-palace', 'wat-pho', 'pak-khlong-talat'].map((id) => requirePlace(id))

export type PhoneScreen = 'discover' | 'itinerary' | 'map'

const LABELS: Record<PhoneScreen, string> = {
  discover: `Roam app preview: the Discover screen, with a featured city and ${SAVED.length} saved places.`,
  itinerary: `Roam app preview: day 1 of “${SAMPLE_NAME}”, a ${SAMPLE_PLAN.brief.days}-day Bangkok sample trip, with ${stops.length} stops starting at ${requirePlace(stops[0].placeId).name}.`,
  map: `Roam app preview: the map view of day 1 of the Bangkok sample, with walking and ride times.`,
}

export function PhonePreview({ screen = 'itinerary', className }: { screen?: PhoneScreen; className?: string }) {
  return (
    <div className={cx('lp-phone', className)} role="img" aria-label={LABELS[screen]}>
      <div className="lp-phone-screen" inert>
        <StatusBar light={screen === 'discover'} />
        {screen === 'discover' ? <DiscoverScreen /> : screen === 'map' ? <MapScreen /> : <ItineraryScreen />}
        <span className="lp-phone-home" aria-hidden />
      </div>
    </div>
  )
}

function StatusBar({ light }: { light?: boolean }) {
  return (
    <div className={cx('lp-phone-status', light && 'is-light')} aria-hidden>
      <span>9:41</span>
      <span className="lp-phone-notch" />
      <span className="flex items-center gap-1">
        <Signal size={12} /> <Wifi size={12} /> <BatteryFull size={17} />
      </span>
    </div>
  )
}

function TripHeader({ sub }: { sub: ReactNode }) {
  return (
    <div className="rounded-b-[22px] bg-primary px-4 pt-1.5 pb-4 text-ink-inverse">
      <div className="flex items-center gap-1 text-[11px] font-semibold opacity-90">
        <ChevronLeft size={14} /> Trip
      </div>
      <p className="mt-1.5 text-[17px] leading-tight font-extrabold tracking-[-0.02em]">{SAMPLE_NAME}</p>
      <p className="mt-0.5 text-[11px] text-[#eef1ff]">{sub}</p>
    </div>
  )
}

function DayChips() {
  return (
    <div className="flex gap-1.5">
      {SAMPLE_PLAN.itinerary.days.map((_, d) => (
        <span
          key={d}
          className={d === 0 ? 'rounded-chip bg-ink px-3 py-1 text-[11px] font-bold text-lime' : 'rounded-chip border border-line bg-surface px-3 py-1 text-[11px] font-semibold text-ink-muted'}
        >
          Day {d + 1}
        </span>
      ))}
    </div>
  )
}

function DayMap() {
  return (
    <SchematicMap
      stops={stops.map((s) => ({ placeId: s.placeId, order: s.order }))}
      schedule={day1}
      brief={SAMPLE_PLAN.brief}
      selectedId={stops[1].placeId}
      onSelect={() => {}}
      label="Illustrative map"
    />
  )
}

function ItineraryScreen() {
  return (
    <>
      <TripHeader sub={`${SAMPLE_DATES} · ${SAMPLE_PARTY}`} />
      <div className="px-4 pt-3"><DayChips /></div>
      <div className="lp-phone-map px-3 pt-2.5"><DayMap /></div>
      <ol className="flex flex-col gap-1.5 px-3 pt-2.5">
        {stops.slice(0, 3).map((s) => {
          const p = requirePlace(s.placeId)
          return (
            <li key={s.placeId} className="flex items-center gap-2.5 rounded-[14px] bg-surface p-2 shadow-card">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-extrabold text-ink-inverse">{s.order}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-bold">{p.name}</span>
                <span className="block text-[10.5px] text-ink-muted">
                  {formatClock(s.start)} · ~{formatDuration(p.visitMins)} · {p.costPerPerson ? `~${formatTHB(p.costPerPerson)}` : 'free entry'}
                </span>
              </span>
              {p.image && <img src={p.image} alt="" className="size-9 shrink-0 rounded-[9px] object-cover" />}
            </li>
          )
        })}
      </ol>
      <div className="lp-phone-action">
        <span className="flex w-full items-center justify-center gap-1.5 rounded-chip bg-ink py-2.5 text-[12px] font-bold text-ink-inverse">
          <Sparkles size={13} /> Adjust plan
        </span>
      </div>
    </>
  )
}

function DiscoverScreen() {
  return (
    <div className="flex flex-col gap-3 px-3.5">
      <div className="flex items-center justify-between pt-1">
        <span className="inline-flex items-center gap-1.5 text-[15px] font-extrabold tracking-tight">
          <span className="flex size-5 items-center justify-center rounded-[7px] bg-primary text-ink-inverse">
            <svg width="10" height="9" viewBox="0 0 14 12" fill="none"><path d="M1.5 10.5 7 1.5l5.5 9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          Roam
        </span>
        <span className="relative inline-flex size-7 items-center justify-center">
          <Bookmark size={15} />
          <span className="absolute -top-0.5 -right-1 min-w-[15px] rounded-chip bg-lime px-1 text-center text-[9px] leading-[15px] font-bold">{SAVED.length + 3}</span>
        </span>
      </div>
      <div className="relative overflow-hidden rounded-[18px] bg-primary px-3.5 pt-3.5 pb-3 text-ink-inverse">
        <p className="text-[8.5px] font-bold tracking-[0.08em] text-lime">A LITTLE WANDER. A REAL PLAN.</p>
        <p className="mt-1 max-w-[12ch] text-[19px] leading-[1.08] font-extrabold tracking-[-0.03em]">Your next trip starts here.</p>
        <p className="mt-1 text-[10.5px] text-[#eef1ff]">Turn your saved places into a plan.</p>
        <div className="mt-2.5 grid grid-cols-3 gap-1">
          {COLLAGE.map((src) => <img key={src} src={src} alt="" className="h-14 w-full rounded-[9px] object-cover" />)}
        </div>
      </div>
      <div className="relative h-[150px] overflow-hidden rounded-[18px] bg-ink text-ink-inverse">
        <img src={bangkok.image} alt="" className="absolute inset-0 size-full object-cover opacity-80" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent px-3 pt-8 pb-2.5">
          <p className="text-[8.5px] font-semibold tracking-wide text-lime uppercase">Featured city</p>
          <p className="text-[17px] leading-tight font-extrabold">{bangkok.name}</p>
          <p className="text-[10px] opacity-90">{bangkok.region}</p>
        </div>
      </div>
      <div>
        <p className="text-[12.5px] font-bold">Your saved places</p>
        <ul className="mt-1.5 flex flex-col gap-1.5">
          {SAVED.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-[12px] bg-surface p-1.5 shadow-card">
              <img src={p.image} alt="" className="size-8 shrink-0 rounded-[8px] object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11.5px] font-bold">{p.name}</span>
                <span className="block text-[9.5px] text-ink-muted">{CATEGORY_LABEL[p.category]}</span>
              </span>
              {SAMPLE_PLAN.mustVisit.includes(p.id) && <Star size={12} className="mr-1 shrink-0 fill-accent text-accent" />}
            </li>
          ))}
        </ul>
      </div>
      <div className="lp-phone-action">
        <span className="flex w-full items-center justify-center gap-1.5 rounded-chip bg-primary py-2.5 text-[12px] font-bold text-ink-inverse">
          Build a trip from saved places
        </span>
      </div>
    </div>
  )
}

function MapScreen() {
  return (
    <>
      <TripHeader sub="Day 1 · map view" />
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <DayChips />
        <span className="inline-flex rounded-chip bg-surface-sunken p-0.5 text-[10px] font-bold">
          <span className="inline-flex items-center gap-1 rounded-chip bg-surface px-2 py-1 shadow-card"><MapIcon size={11} /> Map</span>
          <span className="inline-flex items-center gap-1 px-2 py-1 text-ink-muted"><List size={11} /> List</span>
        </span>
      </div>
      <div className="lp-phone-map lp-phone-map-tall px-3 pt-2.5"><DayMap /></div>
      <div className="mx-3 mt-2.5 rounded-[14px] bg-surface p-2.5 shadow-card">
        <p className="text-[12px] font-bold">Day 1 at a glance</p>
        <dl className="mt-1.5 grid grid-cols-3 gap-1 text-[10px]">
          <div><dt className="flex items-center gap-1 text-ink-muted"><Footprints size={11} /> Walk</dt><dd className="font-extrabold">{formatDuration(day1.walkMins)}</dd></div>
          <div><dt className="flex items-center gap-1 text-ink-muted"><CarTaxiFront size={11} /> Rides</dt><dd className="font-extrabold">{formatDuration(day1.carMins)}</dd></div>
          <div><dt className="flex items-center gap-1 text-ink-muted"><Wallet size={11} /> Est.</dt><dd className="font-extrabold">~{formatTHB(day1.cost.total)}</dd></div>
        </dl>
      </div>
    </>
  )
}
