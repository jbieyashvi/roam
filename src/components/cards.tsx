import { Bookmark, BookmarkCheck, ChevronRight, Clock, Coffee, Landmark, MapPin, ShoppingBag, Star, Trees, UtensilsCrossed, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { CATEGORY_LABEL } from '../data/catalog'
import type { Category, Collection, Destination, Place } from '../domain/types'
import { formatDuration } from '../lib/format'
import { cx, Tag } from './ui'

export const CATEGORY_ICON: Record<Category, LucideIcon> = {
  architecture: Landmark,
  food: UtensilsCrossed,
  cafe: Coffee,
  market: ShoppingBag,
  park: Trees,
}

const FALLBACK_TINT: Record<Category | 'destination', string> = {
  architecture: 'bg-surface-sunken text-ink-muted',
  food: 'bg-lime-soft text-lime-ink',
  cafe: 'bg-surface-sunken text-ink-muted',
  market: 'bg-accent-soft text-accent-ink',
  park: 'bg-success-soft text-success',
  destination: 'bg-primary-soft text-primary-ink',
}

/** Photo with a reliable illustrated fallback when no image exists or it fails to load. */
export function PlaceImage({
  src, alt, category, className, iconSize = 28,
}: { src?: string; alt: string; category: Category | 'destination'; className?: string; iconSize?: number }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    const Icon = category === 'destination' ? MapPin : CATEGORY_ICON[category]
    return (
      <div role="img" aria-label={`${alt} (no photo available)`} className={cx('flex items-center justify-center', FALLBACK_TINT[category], className)}>
        <Icon size={iconSize} aria-hidden />
      </div>
    )
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={cx('object-cover', className)} />
}

export function SaveButton({ saved, onToggle, name, compact }: { saved: boolean; onToggle: () => void; name: string; compact?: boolean }) {
  const Icon = saved ? BookmarkCheck : Bookmark
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from saved` : `Save ${name}`}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className={cx(
        'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-chip text-small font-semibold transition-colors',
        compact ? 'px-0' : 'px-3',
        saved ? 'text-primary-ink' : 'text-ink-muted hover:text-ink',
      )}
    >
      <Icon size={20} aria-hidden fill={saved ? 'currentColor' : 'none'} />
      {!compact && <span>{saved ? 'Saved' : 'Save'}</span>}
    </button>
  )
}

export function CategoryTag({ category }: { category: Category }) {
  const Icon = CATEGORY_ICON[category]
  return (
    <Tag icon={Icon}>{CATEGORY_LABEL[category]}</Tag>
  )
}

export function MustVisitTag() {
  return <Tag tone="accent" icon={Star}>Must visit</Tag>
}

export function PlaceCard({
  place, saved, onToggleSave, onOpen, trailing, footer, mustVisit,
}: {
  place: Place
  saved?: boolean
  onToggleSave?: () => void
  onOpen?: () => void
  trailing?: ReactNode
  footer?: ReactNode
  mustVisit?: boolean
}) {
  const body = (
    <>
      <PlaceImage src={place.image} alt={place.name} category={place.category} className="size-20 shrink-0 rounded-[10px]" iconSize={24} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1">
          <CategoryTag category={place.category} />
          {mustVisit && <MustVisitTag />}
        </div>
        <h3 className="mt-1 text-body font-semibold leading-snug">{place.name}</h3>
        <p className="flex items-center gap-1 text-small text-ink-muted">
          <MapPin size={13} aria-hidden /> {place.area}
        </p>
        <p className="flex items-center gap-1 text-small text-ink-subtle">
          <Clock size={13} aria-hidden /> ~{formatDuration(place.visitMins)} visit <span className="sr-only">(sample estimate)</span>
        </p>
      </div>
    </>
  )
  return (
    <article className="rounded-card border border-line bg-surface p-3 shadow-card">
      <div className="flex items-start gap-3">
        {onOpen ? (
          <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-start gap-3 text-left">
            {body}
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-start gap-3">{body}</div>
        )}
        {onToggleSave && <SaveButton saved={!!saved} onToggle={onToggleSave} name={place.name} compact />}
        {trailing}
      </div>
      {footer && <div className="mt-3 border-t border-line pt-2">{footer}</div>}
    </article>
  )
}

export function DestinationCard({ destination, onOpen, meta }: { destination: Destination; onOpen: () => void; meta?: string }) {
  return (
    <button type="button" onClick={onOpen} className="group w-40 shrink-0 text-left">
      <div className="relative overflow-hidden rounded-card">
        <PlaceImage src={destination.image} alt={destination.name} category="destination" className="h-28 w-40" />
        {!destination.supported && (
          <span className="absolute top-2 left-2 rounded-chip bg-surface px-2 py-0.5 text-micro font-semibold text-ink-muted">Not in demo</span>
        )}
      </div>
      <p className="mt-2 text-body font-semibold group-hover:underline">{destination.name}</p>
      <p className="text-small text-ink-subtle">{meta ?? destination.region}</p>
    </button>
  )
}

export function CollectionCard({ collection, onOpen, savedCount }: { collection: Collection; onOpen: () => void; savedCount: number }) {
  return (
    <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 rounded-card border border-line bg-surface p-3 text-left shadow-card hover:bg-surface-sunken">
      <PlaceImage src={collection.image} alt="" category="destination" className="size-16 shrink-0 rounded-[10px]" />
      <div className="min-w-0 flex-1">
        <h3 className="text-body font-semibold">{collection.title}</h3>
        <p className="text-small text-ink-muted">{collection.blurb}</p>
        <p className="mt-0.5 text-micro text-ink-subtle">
          {collection.placeIds.length} places{savedCount ? ` · ${savedCount} saved` : ''}
        </p>
      </div>
      <ChevronRight size={18} className="shrink-0 text-ink-subtle" aria-hidden />
    </button>
  )
}
