/*
 * A static, faithful preview of the sample itinerary screen inside an iPhone 13 frame
 * (notch, no Dynamic Island). It is a picture of the app, so it is inert and announced as one image.
 */
import { BatteryFull, ChevronLeft, Signal, Sparkles, Wifi } from 'lucide-react'
import { requirePlace } from '../data/places'
import { SchematicMap } from '../components/itinerary'
import type { TimelineItem } from '../domain/planner'
import { formatClock, formatDuration, formatTHB } from '../lib/format'
import { SAMPLE_DATES, SAMPLE_NAME, SAMPLE_PARTY, SAMPLE_PLAN, scheduleFor } from './sample'

const day1 = scheduleFor(SAMPLE_PLAN, 0)
const stops = day1.items.filter((i): i is Extract<TimelineItem, { kind: 'stop' }> => i.kind === 'stop')

export function PhonePreview() {
  return (
    <div
      className="lp-phone"
      role="img"
      aria-label={`Roam app preview: day 1 of “${SAMPLE_NAME}”, a ${SAMPLE_PLAN.brief.days}-day Bangkok sample trip, with a map of ${stops.length} stops starting at ${requirePlace(stops[0].placeId).name}.`}
    >
      <div className="lp-phone-screen" inert>
        <div className="lp-phone-status" aria-hidden>
          <span>9:41</span>
          <span className="lp-phone-notch" />
          <span className="flex items-center gap-1">
            <Signal size={12} /> <Wifi size={12} /> <BatteryFull size={17} />
          </span>
        </div>
        <div className="rounded-b-[22px] bg-primary px-4 pt-1.5 pb-4 text-ink-inverse">
          <div className="flex items-center gap-1 text-[11px] font-semibold opacity-90">
            <ChevronLeft size={14} /> Trip
          </div>
          <p className="mt-1.5 text-[17px] leading-tight font-extrabold tracking-[-0.02em]">{SAMPLE_NAME}</p>
          <p className="mt-0.5 text-[11px] text-[#eef1ff]">{SAMPLE_DATES} · {SAMPLE_PARTY}</p>
        </div>
        <div className="flex gap-1.5 px-4 pt-3">
          {[0, 1, 2].map((d) => (
            <span
              key={d}
              className={d === 0 ? 'rounded-chip bg-ink px-3 py-1 text-[11px] font-bold text-lime' : 'rounded-chip border border-line bg-surface px-3 py-1 text-[11px] font-semibold text-ink-muted'}
            >
              Day {d + 1}
            </span>
          ))}
        </div>
        <div className="lp-phone-map px-3 pt-2.5">
          <SchematicMap
            stops={stops.map((s) => ({ placeId: s.placeId, order: s.order }))}
            schedule={day1}
            brief={SAMPLE_PLAN.brief}
            selectedId={stops[1].placeId}
            onSelect={() => {}}
            label="Illustrative map"
          />
        </div>
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
        <span className="lp-phone-home" aria-hidden />
      </div>
    </div>
  )
}
