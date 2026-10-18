import { CalendarDays, CarTaxiFront, Check, Footprints, Pencil, Star } from 'lucide-react'
import { useMemo } from 'react'
import { TopBar } from '../components/controls'
import { CostSummary } from '../components/itinerary'
import { ActionBar, Banner, Button, Card, Section, Tag } from '../components/ui'
import { getHotel } from '../data/catalog'
import { requirePlace } from '../data/places'
import { PACE_RULES, summarize } from '../domain/planner'
import type { Trip } from '../domain/types'
import { addDays, formatClock, formatDate, formatDateRange, formatDuration, formatTHB, plural } from '../lib/format'
import { navigate } from '../lib/router'
import { useTrip } from '../state/hooks'
import { useStore } from '../state/store'
import { MissingTrip } from './sample'
import { asset } from '../lib/asset'

/** Pre-trip checks. Nothing here is booked by Roam — these are reminders only. */
function checklistFor(trip: Trip) {
  const it = trip.itinerary!
  const scheduled = it.days.flatMap((d) => d.placeIds).map(requirePlace)
  const unknownHours = scheduled.filter((p) => p.hoursNote === null)
  const unpriced = scheduled.filter((p) => p.costPerPerson === null)
  return [
    { key: 'hours', label: 'Check opening hours for each stop', detail: unknownHours.length ? `Hours unknown for ${unknownHours.map((p) => p.name).join(', ')}.` : 'Sample hours are not live.' },
    { key: 'tickets', label: 'Check ticket prices and how to buy them', detail: unpriced.length ? `No estimate for ${unpriced.map((p) => p.name).join(', ')}.` : 'Prices shown are sample estimates.' },
    { key: 'transport', label: 'Plan how you’ll book cars between areas', detail: 'Not booked — Roam doesn’t connect to any ride service.' },
    { key: 'meals', label: 'Decide whether any meals need a reservation', detail: 'Not booked — no reservations are made in this demo.' },
    { key: 'stay', label: 'Confirm where you’re staying', detail: `${getHotel(trip.brief.startLocationId).name} is a fictional sample hotel.` },
  ]
}

export function TripOverviewScreen({ tripId }: { tripId: string }) {
  const trip = useTrip(tripId)
  const { dispatch } = useStore()
  const summary = useMemo(() => (trip?.itinerary ? summarize(trip.itinerary, trip.brief) : null), [trip])
  if (!trip) return <MissingTrip tripId={tripId} />
  if (!trip.itinerary || !summary) {
    return (
      <div className="px-5 pt-10">
        <Banner tone="info" title="This trip isn't planned yet" action={<Button onClick={() => navigate(`/trip/${tripId}/brief`)}>Continue planning</Button>}>
          Finish the trip details and review places to create an itinerary.
        </Banner>
      </div>
    )
  }
  const it = trip.itinerary
  const checklist = checklistFor(trip)
  const done = checklist.filter((c) => trip.checklist[c.key]).length

  return (
    <div className="pb-action">
      <TopBar back="/trips" title="Trip overview" />
      <div className="flex flex-col gap-8 px-5 pt-2">
        <div className="overview-editorial"><span className="chapter-label">YOUR NEXT CHAPTER</span><h2>The plan is<br/>just the beginning.</h2><img src={asset('/images/bangkok/river-skyline.jpg')} alt="" /></div>
        <div>
          <Tag tone={trip.status === 'saved' ? 'success' : 'neutral'}>{trip.status === 'saved' ? 'Saved' : 'Draft'}</Tag>
          <h2 className="mt-2 text-title font-bold">{trip.name}</h2>
          <p className="mt-1 text-small text-ink-muted">
            {formatDateRange(trip.brief.startDate, trip.brief.days)} · {plural(trip.brief.travellers, 'traveller')} · {PACE_RULES[trip.brief.pace].label} pace
          </p>
          <p className="mt-1 text-small text-ink-muted">
            {plural(summary.stopCount, 'stop')} · walk ~{formatDuration(summary.walkMins)} · taxi/ferry ~{formatDuration(summary.carMins)}
          </p>
        </div>

        <Section title="Day by day" id="days">
          <ul className="flex flex-col gap-3">
            {summary.days.map((d, i) => (
              <li key={i}>
                <Card className="p-0">
                  <button
                    type="button"
                    onClick={() => navigate(`/trip/${tripId}/itinerary?day=${i + 1}`)}
                    className="flex w-full flex-col gap-2 rounded-card p-4 text-left hover:bg-surface-sunken"
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-heading font-semibold">
                        Day {i + 1}
                        {trip.brief.startDate && <span className="ml-2 text-small font-medium text-ink-muted">{formatDate(addDays(trip.brief.startDate, i))}</span>}
                      </span>
                      <span className="text-small text-ink-muted">{formatClock(d.start)}–{formatClock(d.end)}</span>
                    </span>
                    <span className="text-small">
                      {it.days[i].placeIds.length ? it.days[i].placeIds.map((id) => requirePlace(id).name).join(' → ') : 'Nothing planned'}
                    </span>
                    <span className="flex flex-wrap gap-x-3 gap-y-1 text-small text-ink-muted">
                      <span className="inline-flex items-center gap-1"><CalendarDays size={14} aria-hidden />{plural(d.stopCount, 'stop')}</span>
                      <span className="inline-flex items-center gap-1"><Footprints size={14} aria-hidden />~{formatDuration(d.walkMins)}</span>
                      <span className="inline-flex items-center gap-1"><CarTaxiFront size={14} aria-label="Taxi and ferry" />~{formatDuration(d.carMins)}</span>
                      <span>~{formatTHB(d.cost.total)} pp</span>
                    </span>
                    {d.overTime && <span className="text-small font-semibold text-warning">Runs past the pace’s finish time</span>}
                  </button>
                </Card>
              </li>
            ))}
          </ul>
          {it.unscheduled.length > 0 && (
            <p className="text-small text-ink-muted">
              Not in the plan: {it.unscheduled.map((id) => requirePlace(id).name).join(', ')}.
            </p>
          )}
        </Section>

        <CostSummary title="Budget estimate" cost={summary.cost} budget={summary.budget} />

        <Section title="Must-visits" id="must">
          {trip.mustVisit.length ? (
            <ul className="flex flex-col gap-1.5">
              {trip.mustVisit.map((id) => {
                const day = it.days.findIndex((d) => d.placeIds.includes(id))
                return (
                  <li key={id} className="flex items-center gap-2 text-body">
                    <Star size={16} className="shrink-0 text-accent-ink" fill="currentColor" aria-hidden />
                    <span className="flex-1">{requirePlace(id).name}</span>
                    <span className="text-small text-ink-muted">{day >= 0 ? `Day ${day + 1}` : 'Not in the plan'}</span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-small text-ink-muted">No must-visits marked.</p>
          )}
        </Section>

        <Section title={`Before you go · ${done}/${checklist.length}`} id="checklist">
          <p className="-mt-2 text-small text-ink-muted">Reminders only. Roam hasn’t booked or reserved anything.</p>
          <ul className="flex flex-col gap-2">
            {checklist.map((c) => {
              const on = !!trip.checklist[c.key]
              return (
                <li key={c.key}>
                  <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-card border border-line bg-surface p-3">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => dispatch({ type: 'toggleChecklist', tripId, key: c.key })}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden
                      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[6px] border-2 peer-focus-visible:shadow-[var(--focus-ring)] ${on ? 'border-primary bg-primary text-ink-inverse' : 'border-line-strong'}`}
                    >
                      {on && <Check size={14} strokeWidth={3} />}
                    </span>
                    <span className="flex-1">
                      <span className={`block text-body font-semibold ${on ? 'text-ink-muted line-through' : ''}`}>{c.label}</span>
                      <span className="block text-small text-ink-muted">{c.detail}</span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </Section>

        <p className="text-small text-ink-subtle">Sample estimates only. Verify opening hours, prices and reservations before you travel.</p>
      </div>

      <ActionBar>
        <Button block size="lg" icon={Pencil} onClick={() => navigate(`/trip/${tripId}/itinerary`)}>
          Continue editing
        </Button>
      </ActionBar>
    </div>
  )
}
