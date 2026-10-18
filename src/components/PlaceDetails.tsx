import { AlertTriangle, Banknote, CalendarDays, Clock, MapPin, ShieldQuestion } from 'lucide-react'
import type { ReactNode } from 'react'
import { creditFor } from '../data/imageCredits'
import { openDaysLabel } from '../domain/planner'
import type { Place } from '../domain/types'
import { formatDuration, formatTHB } from '../lib/format'
import { CategoryTag, MustVisitTag, PlaceImage } from './cards'

/** Shared body for place sheets: photo, facts and an honest verification block. */
export function PlaceDetails({ place, mustVisit, children }: { place: Place; mustVisit?: boolean; children?: ReactNode }) {
  const shopping = place.tags.includes('shopping-excluded')
  const credit = creditFor(place.image)
  const openDays = openDaysLabel(place.id)
  return (
    <div className="flex flex-col gap-4">
      <figure className="m-0">
        <PlaceImage src={place.image} alt={place.name} category={place.category} className="aspect-[16/9] w-full rounded-card" />
        {credit && (
          <figcaption className="mt-1 truncate text-micro text-ink-subtle">
            Photo: {credit.author} ·{' '}
            <a href={credit.source} target="_blank" rel="noreferrer" className="underline">
              {credit.license}
            </a>{' '}
            via Wikimedia Commons
          </figcaption>
        )}
      </figure>
      <div>
        <div className="flex flex-wrap gap-1.5">
          <CategoryTag category={place.category} />
          {mustVisit && <MustVisitTag />}
        </div>
        <p className="mt-2 flex items-center gap-1 text-small text-ink-muted">
          <MapPin size={14} aria-hidden /> {place.area}
        </p>
        <p className="mt-2 text-body">{place.summary}</p>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-small">
        <div className="rounded-control bg-surface-sunken p-3">
          <dt className="flex items-center gap-1 text-ink-muted"><Clock size={13} aria-hidden /> Typical visit</dt>
          <dd className="mt-0.5 font-semibold">~{formatDuration(place.visitMins)}</dd>
        </div>
        <div className="rounded-control bg-surface-sunken p-3">
          <dt className="flex items-center gap-1 text-ink-muted"><Banknote size={13} aria-hidden /> Est. cost per person</dt>
          <dd className="mt-0.5 font-semibold">
            {place.costPerPerson === null ? 'Not verified' : place.costPerPerson === 0 ? (shopping ? 'Free to browse' : 'Free') : `~${formatTHB(place.costPerPerson)}`}
          </dd>
        </div>
      </dl>
      <div className="rounded-card border border-line p-3 text-small">
        <h3 className="flex items-center gap-1.5 font-semibold">
          <ShieldQuestion size={15} aria-hidden /> Hours &amp; prices
        </h3>
        {place.hoursNote === null ? (
          <p className="mt-1 flex items-start gap-1.5 text-warning">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-label="Warning" />
            Opening hours unknown in this demo. Check with the venue before you go.
          </p>
        ) : (
          <p className="mt-1 text-ink-muted">
            {place.hoursNote}. <span className="font-semibold text-ink">Not verified</span> — sample data, not live.
          </p>
        )}
        {openDays && (
          <p className="mt-1 flex items-start gap-1.5 text-ink-muted">
            <CalendarDays size={14} className="mt-0.5 shrink-0" aria-hidden />
            Sample assumption: open {openDays} only, so it is only planned on matching trip dates.
          </p>
        )}
        {place.costPerPerson === null && (
          <p className="mt-1 flex items-start gap-1.5 text-warning">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-label="Warning" />
            No cost estimate, so it isn't counted in your budget.
          </p>
        )}
        {shopping && <p className="mt-1 text-ink-muted">Shopping isn't counted in budget estimates.</p>}
        <p className="mt-1 text-ink-subtle">Verify opening hours, prices and any reservations before you travel.</p>
      </div>
      {children}
    </div>
  )
}
