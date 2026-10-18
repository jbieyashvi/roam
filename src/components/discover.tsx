import { ArrowRight, ArrowUpRight, Bookmark, CircleUser, MapPin } from 'lucide-react'
import type { ReactNode } from 'react'
import { CATEGORY_LABEL } from '../data/catalog'
import type { Collection, Place } from '../domain/types'
import { plural } from '../lib/format'
import { PlaceImage, SaveButton } from './cards'
import { DemoBadge } from './controls'
import { cx } from './ui'
import { asset } from '../lib/asset'

// ── Top bar ────────────────────────────────────────────────────

export function DiscoverTopBar({ savedCount }: { savedCount: number }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-2">
      <span className="inline-flex items-center gap-2 text-title font-extrabold tracking-tight">
        <span aria-hidden className="flex size-7 items-center justify-center rounded-[9px] bg-primary text-ink-inverse">
          <svg width="14" height="12" viewBox="0 0 14 12" fill="none"><path d="M1.5 10.5 7 1.5l5.5 9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        Roam
      </span>
      <div className="flex items-center gap-1">
        <DemoBadge compact />
        <a
          href="#/saved"
          aria-label={`Saved places (${savedCount})`}
          className="relative inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-surface"
        >
          <Bookmark size={20} aria-hidden />
          {savedCount > 0 && (
            <span aria-hidden className="absolute top-1 right-0.5 min-w-[18px] rounded-chip bg-lime px-1 text-center text-[11px] leading-[18px] font-bold text-ink">
              {savedCount}
            </span>
          )}
        </a>
        <a href="#/profile" aria-label="Profile and trip defaults" className="inline-flex size-11 items-center justify-center rounded-full">
          <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
            <CircleUser size={20} aria-hidden />
          </span>
        </a>
      </div>
    </div>
  )
}

// ── Hero ───────────────────────────────────────────────────────

export function HeroPanel({ title, lede, cta, secondary }: { title: string; lede: string; cta: ReactNode; secondary?: ReactNode }) {
  return (
    <section aria-labelledby="hero-title" className="discovery-hero relative overflow-hidden rounded-card bg-primary px-5 pt-6 pb-5 text-ink-inverse">
      {/* Quiet depth: one large soft disc, no glow. */}
      <span aria-hidden className="absolute -right-24 -bottom-28 size-72 rounded-full bg-primary-deep" />
      <div className="relative">
        <p className="hero-eyebrow">A LITTLE WANDER. A REAL PLAN.</p>
        <h1 id="hero-title" className="max-w-[15ch] text-display font-extrabold">{title}</h1>
        <p className="mt-2 max-w-[28ch] text-body text-ink-inverse/90">{lede}</p>
        <HeroCollage />
        <div className="mt-5 flex flex-col gap-2">
          {cta}
          {secondary}
        </div>
      </div>
    </section>
  )
}

/** One dominant photo with two smaller, slightly rotated crops overlapping it. */
function HeroCollage() {
  return (
    <div className="hero-collage relative mt-5 h-[212px]" aria-hidden>
      <img
        src={asset('/images/bangkok/wat-arun-river.jpg')}
        alt=""
        className="absolute top-0 left-0 h-[200px] w-[64%] rounded-tile object-cover object-[50%_35%] shadow-raised"
      />
      <img
        src={asset('/images/bangkok/chinatown-lantern.jpg')}
        alt=""
        className="absolute top-1 right-0 h-[104px] w-[42%] rotate-[4deg] rounded-tile border-[3px] border-ink-inverse object-cover shadow-raised"
      />
      <img
        src={asset('/images/bangkok/talat-noi-art.jpg')}
        alt=""
        className="absolute right-[6%] bottom-0 h-[96px] w-[38%] -rotate-[3deg] rounded-tile border-[3px] border-ink-inverse object-cover object-[50%_60%] shadow-raised"
      />
      <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-chip bg-ink/75 px-2.5 py-1 text-micro font-semibold text-ink-inverse">
        <MapPin size={12} /> Bangkok, Thailand
      </span>
    </div>
  )
}

// ── Featured destination ───────────────────────────────────────

export function FeaturedDestination({
  image, eyebrow, title, detail, thumbs, onExplore, exploreLabel,
}: { image: string; eyebrow: string; title: string; detail: string; thumbs: Place[]; onExplore: () => void; exploreLabel: string }) {
  return (
    <article className="relative overflow-hidden rounded-card bg-ink text-ink-inverse">
      <img src={image} alt="" className="h-[300px] w-full object-cover" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/45 to-ink/0" />
      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="text-micro font-semibold tracking-wide text-lime uppercase">{eyebrow}</p>
        <h2 className="mt-1 text-[1.625rem] leading-8 font-extrabold tracking-tight">{title}</h2>
        <p className="mt-1 text-small text-ink-inverse/85">{detail}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex -space-x-2.5" aria-hidden>
            {thumbs.slice(0, 4).map((p) => (
              <PlaceImage key={p.id} src={p.image} alt="" category={p.category} className="size-9 rounded-full border-2 border-ink" iconSize={14} />
            ))}
          </div>
          <button
            type="button"
            onClick={onExplore}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-chip bg-ink-inverse px-4 text-small font-bold text-ink hover:bg-lime"
          >
            {exploreLabel} <ArrowRight size={16} aria-hidden />
          </button>
        </div>
      </div>
    </article>
  )
}

// ── Saved inspiration ──────────────────────────────────────────

export function SavedInspiration({ places, onBuild }: { places: Place[]; onBuild: () => void }) {
  const shown = places.slice(0, 3)
  return (
    <section aria-labelledby="saved-insp" className="flex items-center gap-4 rounded-card bg-accent-soft p-4">
      <div className="relative h-[92px] w-[96px] shrink-0" aria-hidden>
        {shown.map((p, i) => (
          <PlaceImage
            key={p.id}
            src={p.image}
            alt=""
            category={p.category}
            iconSize={16}
            className={cx(
              'absolute size-[60px] rounded-[14px] border-2 border-accent-soft',
              i === 0 && 'top-0 left-0 -rotate-6',
              i === 1 && 'top-4 left-7 rotate-3',
              i === 2 && 'top-8 left-[38px] -rotate-2',
            )}
          />
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <h2 id="saved-insp" className="text-heading font-bold">
          {plural(places.length, 'place')} saved in Bangkok
        </h2>
        <p className="mt-0.5 text-small text-ink-muted">Roam turns them into a day-by-day plan.</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <button type="button" onClick={onBuild} className="inline-flex min-h-11 items-center gap-1.5 rounded-chip bg-ink px-4 text-small font-bold text-ink-inverse">
            Build a trip <ArrowRight size={15} aria-hidden />
          </button>
          <a href="#/saved" className="inline-flex min-h-11 items-center text-small font-semibold text-accent-ink underline-offset-2 hover:underline">
            View all
          </a>
        </div>
      </div>
    </section>
  )
}

// ── Rail cards (mixed sizes) ───────────────────────────────────

/** Cycles tall photo → compact photo → lavender text card for rhythm. */
export function CollectionRailCard({ collection, index, savedCount, onOpen }: { collection: Collection; index: number; savedCount: number; onOpen: () => void }) {
  const variant = index % 3
  const meta = `${collection.placeIds.length} places${savedCount ? ` · ${savedCount} saved` : ''}`
  if (variant === 2) {
    return (
      <button type="button" onClick={onOpen} className="flex h-[248px] w-[164px] shrink-0 flex-col justify-between rounded-card bg-lime p-4 text-left text-ink">
        <PlaceImage src={collection.image} alt="" category="destination" className="size-16 rounded-full border-2 border-ink/10" />
        <span>
          <span className="block text-heading leading-snug font-bold">{collection.title}</span>
          <span className="mt-1 block text-small text-ink/75">{meta}</span>
          <span className="mt-2 inline-flex size-9 items-center justify-center rounded-full bg-ink text-lime" aria-hidden>
            <ArrowUpRight size={16} />
          </span>
        </span>
      </button>
    )
  }
  const tall = variant === 0
  return (
    <button type="button" onClick={onOpen} className={cx('group relative shrink-0 overflow-hidden rounded-card text-left text-ink-inverse', tall ? 'h-[248px] w-[208px]' : 'h-[248px] w-[164px]')}>
      <PlaceImage src={collection.image} alt="" category="destination" className="absolute inset-0 size-full" />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-ink/0" />
      <span className="absolute inset-x-0 bottom-0 p-4">
        <span className={cx('block font-bold leading-snug', tall ? 'text-title' : 'text-heading')}>{collection.title}</span>
        <span className="mt-1 block text-small text-ink-inverse/85">{meta}</span>
      </span>
    </button>
  )
}

export function PlaceRailCard({ place, index, saved, onToggleSave, onOpen }: { place: Place; index: number; saved: boolean; onToggleSave: () => void; onOpen: () => void }) {
  const tall = index % 3 === 0
  return (
    <article className={cx('relative shrink-0 overflow-hidden rounded-card bg-surface shadow-card', tall ? 'w-[208px]' : 'w-[164px]')}>
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <PlaceImage src={place.image} alt="" category={place.category} className={cx('w-full', tall ? 'h-[176px]' : 'h-[132px]')} />
        <span className="block p-3 pr-12">
          <span className="block text-body leading-snug font-bold">{place.name}</span>
          <span className="mt-0.5 block text-small text-ink-subtle">{CATEGORY_LABEL[place.category]} · {place.area.split(',')[0]}</span>
        </span>
      </button>
      <span className="absolute right-1 bottom-1">
        <SaveButton saved={saved} onToggle={onToggleSave} name={place.name} compact />
      </span>
    </article>
  )
}
