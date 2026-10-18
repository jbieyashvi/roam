/*
 * Part of the sample-trip demo: the real Bangkok sample itinerary with day and map/list controls.
 * Purely local view state; the person's own trips are never read or changed.
 */
import { Clock, Footprints, CarTaxiFront, List, Map as MapIcon, Wallet } from 'lucide-react'
import { useState } from 'react'
import { DayTimeline, SchematicMap } from '../components/itinerary'
import { requirePlace } from '../data/places'
import type { TimelineItem } from '../domain/planner'
import { addDays, formatClock, formatDate, formatDuration, formatTHB } from '../lib/format'
import { DAY_NOTES, SAMPLE_HOTEL, SAMPLE_PLAN, scheduleFor } from './sample'
import { Band, Reveal, SectionLabel } from './parts'

const DAYS = SAMPLE_PLAN.itinerary.days.map((_, i) => {
  const schedule = scheduleFor(SAMPLE_PLAN, i)
  const stops = schedule.items.filter((x): x is Extract<TimelineItem, { kind: 'stop' }> => x.kind === 'stop')
  return { schedule, stops, date: formatDate(addDays(SAMPLE_PLAN.brief.startDate, i), { weekday: 'short', day: 'numeric', month: 'short' }) }
})

export function Showcase() {
  const [day, setDay] = useState(0)
  const [view, setView] = useState<'map' | 'list'>('map')
  const [selected, setSelected] = useState<string | null>(null)
  const { schedule, stops } = DAYS[day]
  const note = DAY_NOTES[day]

  const pickDay = (i: number) => {
    setDay(i)
    setSelected(null)
  }

  return (
    <Band id="planner" label="planner-title" className="lp-showcase">
      <Reveal className="lp-cell lp-showcase-copy">
        <div>
          <SectionLabel n="A">Sample · Itinerary</SectionLabel>
          <h3 id="planner-title" className="lp-h2 lp-h2-sub">Your trip, mapped out.</h3>
          <p className="lp-lede">Every stop in order, with travel, timings and rough costs. Pick a day, then switch between map and list.</p>
          <div className="lp-why" aria-live="polite">
            <p className="lp-h4">Day {day + 1} · sample estimates</p>
            <p className="lp-why-title">{note.title}</p>
            <details className="lp-details">
              <summary>View details</summary>
              <p>{note.why}</p>
              <p className="lp-fineprint">Prices are in THB per person. Travel times are approximate; opening hours and prices aren’t live.</p>
            </details>
          </div>
        </div>
        <dl className="lp-strip lp-stats" aria-label={`Day ${day + 1} at a glance`}>
          <div>
            <dt><Clock size={15} aria-hidden /> Day</dt>
            <dd>{formatClock(schedule.start)} – {formatClock(schedule.end)}</dd>
          </div>
          <div>
            <dt><Footprints size={15} aria-hidden /> Walking</dt>
            <dd>{formatDuration(schedule.walkMins)}</dd>
          </div>
          <div>
            <dt><CarTaxiFront size={15} aria-hidden /> Rides &amp; ferry</dt>
            <dd>{formatDuration(schedule.carMins)}</dd>
          </div>
          <div>
            <dt><Wallet size={15} aria-hidden /> Est. cost</dt>
            <dd>~{formatTHB(schedule.cost.total)} pp</dd>
          </div>
        </dl>
      </Reveal>

      <Reveal className="lp-cell lp-showcase-panel" delay={1}>
        <div className="lp-controls">
          <div role="group" aria-label="Choose a day" className="lp-daypicker">
            {DAYS.map((d, i) => (
              <button key={i} type="button" aria-pressed={day === i} onClick={() => pickDay(i)} className="lp-day">
                <span className="font-extrabold">Day {i + 1}</span>
                <span className="lp-day-date">{d.date}</span>
              </button>
            ))}
          </div>
          <div role="group" aria-label="View" className="lp-toggle">
            <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}>
              <MapIcon size={16} aria-hidden /> Map
            </button>
            <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>
              <List size={16} aria-hidden /> List
            </button>
          </div>
        </div>

        {view === 'map' ? (
          <div className="lp-mapview">
            <SchematicMap
              key={day}
              stops={stops.map((s) => ({ placeId: s.placeId, order: s.order }))}
              schedule={schedule}
              brief={SAMPLE_PLAN.brief}
              selectedId={selected}
              onSelect={(id) => setSelected((cur) => (cur === id ? null : id))}
              label={`Day ${day + 1} · illustrative map, not to scale`}
            />
            <ol className="lp-stoplist" aria-label={`Day ${day + 1} stops`}>
              {stops.map((s, i) => {
                const p = requirePlace(s.placeId)
                const next = schedule.items.slice(schedule.items.indexOf(s) + 1).find((x) => x.kind === 'travel' || x.kind === 'stop')
                const leg = next?.kind === 'travel' && i < stops.length - 1 ? next.leg : null
                return (
                  <li key={s.placeId}>
                    <button type="button" aria-pressed={selected === s.placeId} onClick={() => setSelected((cur) => (cur === s.placeId ? null : s.placeId))} className="lp-stop">
                      <span className="lp-stop-n" aria-hidden>{s.order}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">
                          <span className="sr-only">Stop {s.order}: </span>
                          {p.name}
                        </span>
                        <span className="block text-small text-ink-muted">
                          {formatClock(s.start)} · ~{formatDuration(p.visitMins)} · {p.costPerPerson === null ? 'cost unverified' : p.costPerPerson === 0 ? 'free entry' : `~${formatTHB(p.costPerPerson)} pp`}
                        </span>
                      </span>
                    </button>
                    {leg && (
                      <p className="lp-leg">
                        {leg.mode === 'walk' ? <Footprints size={13} aria-hidden /> : <CarTaxiFront size={13} aria-hidden />}
                        {leg.mode === 'walk' ? 'Walk' : leg.mode === 'boat' ? 'Ferry across the river' : 'Taxi or ride-hail'} ~{formatDuration(leg.mins)}
                      </p>
                    )}
                  </li>
                )
              })}
            </ol>
          </div>
        ) : (
          <div className="lp-listview">
            <DayTimeline
              schedule={schedule}
              mustVisit={SAMPLE_PLAN.mustVisit}
              selectedId={selected}
              onOpen={(id) => setSelected((cur) => (cur === id ? null : id))}
              hotelName={SAMPLE_HOTEL.name}
            />
          </div>
        )}
      </Reveal>
    </Band>
  )
}
