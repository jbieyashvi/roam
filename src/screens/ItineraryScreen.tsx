import { ArrowLeftRight, CalendarPlus, Check, Banknote, HelpCircle, List, Map as MapIcon, RotateCcw, Route, Save, SlidersHorizontal, Star, Trash2, Undo2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { BottomSheet, ConfirmSheet } from '../components/BottomSheet'
import { PlaceImage } from '../components/cards'
import { BudgetField, DaySelector, TopBar } from '../components/controls'
import { ChangeComparison, CostSummary, DayTimeline, SchematicMap } from '../components/itinerary'
import { PlaceDetails } from '../components/PlaceDetails'
import { ActionBar, Banner, Button, Card, cx, Fieldset, RadioCards, Segmented } from '../components/ui'
import { CATEGORY_LABEL, getHotel } from '../data/catalog'
import { requirePlace } from '../data/places'
import { comparePlans, isCompactDay, moveToDay, removeFromDay, swapAlternatives, swapPlace, type PlanDiff, type PlanState } from '../domain/adjust'
import { ASSUMPTIONS, closedReason, dayOfPlace, generateItinerary, isOpenOnDay, openDaysLabel, PACE_RULES, summarize } from '../domain/planner'
import type { Pace, TravelMode, Trip } from '../domain/types'
import { addDays, formatClock, formatDate, formatDateRange, formatDuration, formatTHB, plural } from '../lib/format'
import { navigate, setQuery, useRoute } from '../lib/router'
import { useApplyChange, useTrip } from '../state/hooks'
import { useStore, useToast } from '../state/store'
import { MODE_OPTIONS, PACE_OPTIONS } from './account'
import { MissingTrip } from './sample'

export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
export const planState = (t: Trip): PlanState => ({ brief: t.brief, placeIds: t.placeIds, mustVisit: t.mustVisit, itinerary: t.itinerary! })

// ── Place sheet: details, must-visit, move, swap, remove ───────

function PlaceSheet({ trip, placeId, onClose }: { trip: Trip; placeId: string | null; onClose: () => void }) {
  const { dispatch } = useStore()
  const apply = useApplyChange(trip.id)
  const [swapping, setSwapping] = useState(false)
  const [swapWith, setSwapWith] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  useEffect(() => {
    setSwapping(false)
    setSwapWith(null)
  }, [placeId])
  // The preview renders below the details; bring it into view and announce it.
  useEffect(() => {
    if (swapWith) {
      const h = document.getElementById('swap-preview')
      h?.scrollIntoView({ block: 'start' })
      h?.focus({ preventScroll: true })
    }
  }, [swapWith])
  const place = placeId ? requirePlace(placeId) : null
  const it = trip.itinerary!
  const day = placeId ? dayOfPlace(it, placeId) : -1
  const must = !!placeId && trip.mustVisit.includes(placeId)
  const alternatives = useMemo(() => (placeId && day >= 0 ? swapAlternatives(it, placeId, 4, trip.brief) : []), [it, placeId, day, trip.brief])
  const swapNext = (newId: string): PlanState => ({
    ...planState(trip),
    itinerary: swapPlace(it, placeId!, newId),
    placeIds: [...new Set([...trip.placeIds, newId])],
  })
  const swapDiff: PlanDiff | null = swapWith && placeId && day >= 0 ? comparePlans(planState(trip), swapNext(swapWith)) : null

  const remove = () => {
    apply(`Removed ${place!.name} from the plan`, {
      itinerary: removeFromDay(it, place!.id),
      mustVisit: trip.mustVisit.filter((id) => id !== place!.id),
    })
    onClose()
  }

  return (
    <>
      <BottomSheet
        open={!!place && !confirmRemove}
        onClose={onClose}
        title={place?.name ?? ''}
        subtitle={place && (day >= 0 ? `Day ${day + 1} · ${formatDate(addDays(trip.brief.startDate, day))}` : 'Not in the plan')}
        size="tall"
        footer={
          swapWith && swapDiff ? (
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setSwapWith(null)}>Cancel</Button>
              <Button
                className="flex-1"
                icon={Check}
                onClick={() => {
                  const next = swapNext(swapWith)
                  apply(`Swapped ${place!.name} for ${requirePlace(swapWith).name}`, next)
                  setSwapWith(null)
                  onClose()
                }}
              >
                Confirm swap
              </Button>
            </div>
          ) : undefined
        }
      >
        {place && (
          <PlaceDetails place={place} mustVisit={must}>
            {swapWith && swapDiff ? (
              <section aria-labelledby="swap-preview" className="flex flex-col gap-3">
                <h3 id="swap-preview" tabIndex={-1} className="text-heading font-semibold">Preview: swap for {requirePlace(swapWith).name}</h3>
                <ChangeComparison diff={swapDiff} />
                <p className="text-small text-ink-muted">{place.name} moves to “Not in the plan”, so you can add it back later.</p>
              </section>
            ) : (
              <div className="flex flex-col gap-4">
                <button
                  type="button"
                  aria-pressed={must}
                  onClick={() => dispatch({ type: 'toggleMust', tripId: trip.id, placeId: place.id })}
                  className={`flex min-h-12 items-center gap-3 rounded-control border px-3 text-left ${must ? 'border-accent bg-accent-soft' : 'border-line-strong'}`}
                >
                  <Star size={18} aria-hidden fill={must ? 'currentColor' : 'none'} className={must ? 'text-accent-ink' : 'text-ink-muted'} />
                  <span className="flex-1">
                    <span className="block text-body font-semibold">Must visit</span>
                    <span className="block text-small text-ink-muted">Adjustments never drop must-visits.</span>
                  </span>
                  <span className="text-small font-semibold">{must ? 'On' : 'Off'}</span>
                </button>

                <div>
                  <h3 className="text-small font-semibold">{day >= 0 ? 'Move to another day' : 'Add to a day'}</h3>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {it.days.map((_, i) => (
                      <Button
                        key={i}
                        size="sm"
                        variant={i === day ? 'quiet' : 'secondary'}
                        disabled={i === day || !isOpenOnDay(place.id, trip.brief, i)}
                        icon={day >= 0 ? undefined : CalendarPlus}
                        onClick={() => {
                          apply(day >= 0 ? `Moved ${place.name} to Day ${i + 1}` : `Added ${place.name} to Day ${i + 1}`, { itinerary: moveToDay(it, place.id, i, trip.brief) })
                          onClose()
                        }}
                      >
                        Day {i + 1}
                        {i === day && <span className="sr-only"> (current)</span>}
                        {i !== day && !isOpenOnDay(place.id, trip.brief, i) && <span className="sr-only"> (usually closed that day)</span>}
                      </Button>
                    ))}
                  </div>
                  {openDaysLabel(place.id) && (
                    <p className="mt-2 text-small text-ink-muted">
                      {closedReason(place.id, trip.brief) ?? `Usually open ${openDaysLabel(place.id)} only (sample) — days it’s closed are unavailable.`}
                    </p>
                  )}
                </div>

                {day >= 0 && (
                  <div>
                    {must ? (
                      <p className="text-small text-ink-muted">Must-visits can't be swapped. Turn off “Must visit” to swap or remove it.</p>
                    ) : !swapping ? (
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" className="flex-1" icon={ArrowLeftRight} onClick={() => setSwapping(true)} disabled={!alternatives.length}>
                          Swap
                        </Button>
                        <Button variant="secondary" size="sm" className="flex-1 text-danger" icon={Trash2} onClick={remove}>
                          Remove from plan
                        </Button>
                      </div>
                    ) : (
                      <fieldset>
                        <legend className="text-small font-semibold">Swap for a similar place</legend>
                        <p className="text-small text-ink-muted">Same kind of place first, then the closest.</p>
                        <ul className="mt-2 flex flex-col gap-2">
                          {alternatives.map((a) => (
                            <li key={a.id}>
                              <button type="button" onClick={() => setSwapWith(a.id)} className="flex w-full items-center gap-3 rounded-card border border-line p-2 text-left hover:bg-surface-sunken">
                                <PlaceImage src={a.image} alt="" category={a.category} className="size-12 shrink-0 rounded-[8px]" iconSize={18} />
                                <span className="min-w-0 flex-1">
                                  <span className="block text-body font-semibold">{a.name}</span>
                                  <span className="block text-small text-ink-muted">
                                    {CATEGORY_LABEL[a.category]} · ~{formatDuration(a.visitMins)} · {a.costPerPerson === null ? 'cost unverified' : a.costPerPerson === 0 ? 'free' : `~${formatTHB(a.costPerPerson)}`}
                                  </span>
                                </span>
                                <span className="text-small font-semibold text-primary-ink">Preview</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                        <Button variant="ghost" size="sm" className="mt-1" onClick={() => setSwapping(false)}>Cancel swap</Button>
                      </fieldset>
                    )}
                    {must && (
                      <Button variant="secondary" size="sm" className="mt-2 text-danger" icon={Trash2} onClick={() => setConfirmRemove(true)}>
                        Remove from plan
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </PlaceDetails>
        )}
      </BottomSheet>
      <ConfirmSheet
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title={`Remove ${place?.name ?? ''}?`}
        confirmLabel="Remove must-visit"
        destructive
        onConfirm={() => {
          setConfirmRemove(false)
          remove()
        }}
      >
        It's marked as a must-visit. It will move to “Not in the plan” and stop being a must-visit. You can undo this.
      </ConfirmSheet>
    </>
  )
}

// ── Trip preferences (pace / getting around) ──────────────────

// ── Budget sheet: changes the comparison only, not the plan ────

export function BudgetSheet({ trip, open, onClose }: { trip: Trip; open: boolean; onClose: () => void }) {
  const { dispatch } = useStore()
  const { show } = useToast()
  const [value, setValue] = useState<number | null>(trip.brief.budgetPerPerson)
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    if (open) {
      setValue(trip.brief.budgetPerPerson)
      setTouched(false)
    }
  }, [open, trip.brief.budgetPerPerson])
  const error = touched && !(value && value > 0) ? 'Enter a budget per person in THB.' : undefined
  const save = () => {
    if (!(value && value > 0)) {
      setTouched(true)
      document.getElementById('plan-budget')?.focus()
      return
    }
    dispatch({ type: 'updateBrief', tripId: trip.id, patch: { budgetPerPerson: value } })
    show({ tone: 'success', message: `Budget set to ${formatTHB(value)} per person` })
    onClose()
  }
  return (
    <BottomSheet open={open} onClose={onClose} title="Edit budget" footer={<Button block onClick={save}>Save budget</Button>}>
      <div className="flex flex-col gap-3">
        <BudgetField id="plan-budget" value={value} onChange={setValue} error={error} />
        <p className="text-small text-ink-muted">Your stops stay the same. Roam only compares the plan’s estimate with the new budget.</p>
      </div>
    </BottomSheet>
  )
}

function PreferencesSheet({ trip, open, onClose }: { trip: Trip; open: boolean; onClose: () => void }) {
  const apply = useApplyChange(trip.id)
  const [pace, setPace] = useState<Pace>(trip.brief.pace)
  const [mode, setMode] = useState<TravelMode>(trip.brief.travelMode)
  useEffect(() => {
    if (open) {
      setPace(trip.brief.pace)
      setMode(trip.brief.travelMode)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const changed = pace !== trip.brief.pace || mode !== trip.brief.travelMode
  type Preview = { error: string } | { next: PlanState; diff: PlanDiff } | null
  const preview = useMemo<Preview>(() => {
    if (!changed) return null
    const brief = { ...trip.brief, pace, travelMode: mode }
    const res = generateItinerary({ ...trip, brief })
    if (!res.ok) return { error: res.reason === 'must-visit-conflict' ? `Your must-visits don't fit at a ${PACE_RULES[pace].label.toLowerCase()} pace.` : 'This combination can’t be planned.' }
    const next: PlanState = { ...planState(trip), brief, itinerary: res.itinerary }
    return { next, diff: comparePlans(planState(trip), next) }
  }, [changed, pace, mode, trip])

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Trip preferences"
      subtitle="Changing these re-plans every day. Preview first."
      size="tall"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1"
            disabled={!preview || 'error' in preview}
            onClick={() => {
              if (preview && 'next' in preview) {
                apply('Re-planned with new preferences', preview.next)
                onClose()
              }
            }}
          >
            Apply &amp; re-plan
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <Fieldset legend="Pace">
          <RadioCards name="trip-pace" value={pace} onChange={setPace} options={PACE_OPTIONS} />
        </Fieldset>
        <Fieldset legend="Getting around">
          <RadioCards name="trip-mode" value={mode} onChange={setMode} options={MODE_OPTIONS} />
        </Fieldset>
        <div aria-live="polite">
          {preview && 'error' in preview && <Banner tone="warning" title="Can't re-plan with these settings">{preview.error}</Banner>}
          {preview && 'diff' in preview && (
            <Card className="p-3">
              <p className="mb-2 text-small font-semibold">Preview</p>
              <ChangeComparison diff={preview.diff} />
              <p className="mt-2 text-small text-ink-subtle">Re-planning resets manual moves and swaps. You can undo.</p>
            </Card>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}

// ── Why this plan ──────────────────────────────────────────────

function WhySheet({ trip, open, onClose }: { trip: Trip; open: boolean; onClose: () => void }) {
  const r = PACE_RULES[trip.brief.pace]
  const hotel = getHotel(trip.brief.startLocationId)
  return (
    <BottomSheet open={open} onClose={onClose} title="Why this plan?" size="tall">
      <div className="flex flex-col gap-4 text-small text-ink-muted">
        <p className="text-body text-ink">Roam built this with fixed, explainable rules — not live data or an AI model.</p>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li><strong className="text-ink">Grouped by area.</strong> Places close together share a day (e.g. the Grand Palace, Wat Pho and Wat Arun around Rattanakosin), so you aren’t crossing the city repeatedly.</li>
          <li><strong className="text-ink">Must-visits first.</strong> They’re placed before flexible stops and never dropped by adjustments.</li>
          <li><strong className="text-ink">Time of day.</strong> Busy sights early, a food stop around lunchtime, evening-friendly places (like Yaowarat street food) last.</li>
          <li><strong className="text-ink">Opening days.</strong> Places with sample weekend-only days, like Chatuchak, are only planned on a Saturday or Sunday of your trip.</li>
          <li><strong className="text-ink">{r.label} pace.</strong> Days run {formatClock(r.start)} – {formatClock(r.end)} with up to {r.maxStops} stops{r.bufferMins ? `, ${r.bufferMins} min buffer between stops` : ''}{r.restMins ? ` and ${r.restMins} min of downtime after lunch` : ''}.</li>
          <li><strong className="text-ink">Getting around.</strong> Walk up to ~{ASSUMPTIONS.walkLimitKm[trip.brief.travelMode]} km, otherwise a taxi or ride-hail at ~{ASSUMPTIONS.carKmh} km/h in traffic plus {ASSUMPTIONS.carOverheadMins} min for pickup. Crossing to Wat Arun uses the cross-river ferry (~{ASSUMPTIONS.ferryMins} min with waiting).</li>
          <li><strong className="text-ink">Interests.</strong> When a day is full, places matching your interests win.</li>
        </ul>
        <Card className="p-3">
          <p className="font-semibold text-ink">Sample assumptions</p>
          <ul className="mt-1 flex flex-col gap-0.5">
            <li>Each day starts and ends at {hotel.name} (fictional).</li>
            <li>Taxi or ride-hail fare ~{formatTHB(ASSUMPTIONS.carBaseFare)} + {formatTHB(ASSUMPTIONS.carPerKm)}/km, split between {plural(trip.brief.travellers, 'traveller')}.</li>
            <li>Cross-river ferry ~{formatTHB(ASSUMPTIONS.ferryCost)} pp each way.</li>
            <li>Lunch break ~{ASSUMPTIONS.lunchMins} min, ~{formatTHB(ASSUMPTIONS.lunchCost)} pp if no food stop is planned.</li>
            <li>Street distance ≈ straight line × {ASSUMPTIONS.routeFactor}. The map is schematic, not to scale.</li>
            <li>Dinner after the day ends isn’t planned or counted in the budget.</li>
          </ul>
        </Card>
        <p>Prices (in THB), durations, hours and travel times are estimates. Verify opening hours, prices and reservations before you travel. Nothing is booked.</p>
      </div>
    </BottomSheet>
  )
}

// ── Screen ─────────────────────────────────────────────────────

export function ItineraryScreen({ tripId }: { tripId: string }) {
  const trip = useTrip(tripId)
  const { dispatch } = useStore()
  const { show, dismiss } = useToast()
  const { query } = useRoute()
  // Announcing the undo also replaces any earlier "Undo" toast, which would otherwise go stale.
  const undoLast = () => {
    dispatch({ type: 'undo', tripId })
    show({ tone: 'info', message: 'Change undone' })
  }
  const stopParam = query.get('stop')
  const adjustParam = query.get('adjust')
  const listView = query.get('view') === 'list'
  const [selected, setSelected] = useState<string | null>(stopParam)
  const [prefsOpen, setPrefsOpen] = useState(false)
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [whyOpen, setWhyOpen] = useState(false)
  const summary = useMemo(() => (trip?.itinerary ? summarize(trip.itinerary, trip.brief) : null), [trip])

  const dayFromStop = trip?.itinerary && stopParam ? dayOfPlace(trip.itinerary, stopParam) : -1
  const dayParam = Number(query.get('day'))
  const dayIndex = dayFromStop >= 0 ? dayFromStop : dayParam >= 1 && dayParam <= 3 ? dayParam - 1 : 0

  // Older links opened Adjust as a sheet (`?adjust=`); it is now its own screen.
  useEffect(() => {
    if (!adjustParam) return
    const q = new URLSearchParams({ day: String(dayIndex + 1), request: adjustParam })
    if (query.get('autoApply') === '1') q.set('autoApply', '1')
    navigate(`/trip/${tripId}/adjust?${q}`, { replace: true })
  }, [adjustParam]) // eslint-disable-line react-hooks/exhaustive-deps

  const [scrollTo, setScrollTo] = useState<{ id: string } | null>(null)
  useEffect(() => {
    if (stopParam) setSelected(stopParam)
  }, [stopParam])
  // Pin → stop sync: bring the selected stop into view once it has rendered as selected.
  useEffect(() => {
    if (scrollTo) document.getElementById(`stop-${scrollTo.id}`)?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' })
  }, [scrollTo])

  if (!trip) return <MissingTrip tripId={tripId} />
  if (!trip.itinerary || !summary) {
    return (
      <div className="px-5 pt-10">
        <Banner tone="info" title="No itinerary yet" action={<Button onClick={() => navigate(`/trip/${tripId}/places`)}>Review places</Button>}>
          Review the places for this trip, then create an itinerary.
        </Banner>
      </div>
    )
  }
  const it = trip.itinerary
  const schedule = summary.days[dayIndex]
  const hotel = getHotel(trip.brief.startLocationId)
  const dayStops = schedule.items.flatMap((i) => (i.kind === 'stop' ? [{ placeId: i.placeId, order: i.order }] : []))
  const dayDate = trip.brief.startDate ? formatDate(addDays(trip.brief.startDate, dayIndex), { weekday: 'long', day: 'numeric', month: 'short' }) : null
  const compact = isCompactDay(it.days[dayIndex].placeIds)
  const adjustHref = (request?: string) => `/trip/${tripId}/adjust?day=${dayIndex + 1}${request ? `&request=${request}` : ''}`
  const showMap = !listView && dayStops.length > 0

  const selectDay = (i: number) => {
    setSelected(null)
    setQuery({ day: String(i + 1), stop: null })
  }
  const selectPin = (id: string) => {
    setSelected(id)
    setScrollTo({ id })
  }
  const openStop = (id: string) => {
    setSelected(id)
    setQuery({ stop: id })
  }

  return (
    <div className="pb-action">
      <TopBar
        back={trip.status === 'saved' ? `/trip/${tripId}` : `/trip/${tripId}/places`}
        large
        title={trip.name}
        subtitle={`${formatDateRange(trip.brief.startDate, trip.brief.days)} · ${plural(trip.brief.travellers, 'traveller')} · ${PACE_RULES[trip.brief.pace].label} pace`}
        actions={
          <button type="button" onClick={() => setWhyOpen(true)} className="inline-flex min-h-11 items-center gap-1 rounded-chip px-3 text-small font-semibold text-primary-ink hover:bg-primary-soft">
            <HelpCircle size={16} aria-hidden /> Why this plan?
          </button>
        }
      />
      <div className="flex flex-col gap-4 px-5 pt-4">
        {trip.undo && (
          <Banner
            tone="success"
            title={`Changed: ${trip.undo.label}`}
            role="status"
            action={
              <>
                <Button size="sm" variant="secondary" icon={Undo2} onClick={undoLast}>Undo</Button>
                <Button size="sm" variant="ghost" onClick={() => { dispatch({ type: 'clearUndo', tripId }); dismiss() }}>Dismiss</Button>
              </>
            }
          />
        )}
        {summary.overBudgetBy > 0 && (
          <Banner tone="warning" title={`About ${formatTHB(summary.overBudgetBy)} over your budget`} action={<Button size="sm" variant="secondary" onClick={() => navigate(adjustHref('lower-cost'))}>Lower the cost</Button>}>
            Estimated {formatTHB(summary.cost.total)} pp against {formatTHB(summary.budget!)}.
          </Banner>
        )}

        <DaySelector
          controls="day-panel"
          value={dayIndex}
          onChange={selectDay}
          days={it.days.map((d, i) => ({ label: `Day ${i + 1}`, sub: trip.brief.startDate ? formatDate(addDays(trip.brief.startDate, i), { weekday: 'short', day: 'numeric' }) : plural(d.placeIds.length, 'stop') }))}
        />

        <section id="day-panel" role="tabpanel" aria-labelledby={`day-tab-${dayIndex}`} className="flex flex-col">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-small font-semibold text-ink-muted">
              {plural(schedule.stopCount, 'stop')} · back ~{formatClock(schedule.end)}
            </p>
            <Segmented
              label="Show the day as"
              value={listView ? 'list' : 'map'}
              onChange={(v) => setQuery({ view: v === 'list' ? 'list' : null })}
              options={[{ value: 'map', label: 'Map', icon: MapIcon }, { value: 'list', label: 'List', icon: List }]}
            />
          </div>

          {showMap && (
            <div id="day-map">
              <SchematicMap
                stops={dayStops}
                schedule={schedule}
                brief={trip.brief}
                selectedId={selected}
                onSelect={selectPin}
                bottomInset={7}
                label="Illustrative map · not to scale"
              />
            </div>
          )}

          <div className={cx('relative rounded-sheet bg-surface px-3 pt-5 pb-3 shadow-raised', showMap && '-mt-7')}>
            <div className="px-2">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-title font-extrabold">
                  Day {dayIndex + 1}
                  {dayDate && <span className="ml-1.5 text-body font-semibold text-ink-muted">{dayDate}</span>}
                </h2>
                <p className="shrink-0 text-heading font-extrabold tabular-nums">~{formatTHB(schedule.cost.total)}<span className="text-small font-medium text-ink-muted"> pp</span></p>
              </div>
              <p className="mt-0.5 text-small text-ink-muted">
                {it.days[dayIndex].pace ? `${PACE_RULES[it.days[dayIndex].pace!].label} day · ` : ''}walk ~{formatDuration(schedule.walkMins)} · taxi/ferry ~{formatDuration(schedule.carMins)} · estimates
              </p>
              {compact && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-chip bg-lime-soft px-2.5 py-1 text-small font-semibold text-lime-ink">
                  <Route size={14} aria-hidden /> Grouped nearby stops to reduce backtracking.
                </p>
              )}
              {schedule.overTime && (
                <div className="mt-3">
                  <Banner tone="warning" title="This day runs late" action={<Button size="sm" variant="secondary" onClick={() => navigate(adjustHref('relax-day'))}>A slower day</Button>}>
                    It ends around {formatDuration(schedule.end - schedule.rules.end)} after the {schedule.rules.label.toLowerCase()} pace’s finish time.
                  </Banner>
                </div>
              )}
            </div>
            <div className="mt-3">
              {dayStops.length === 0 ? (
                <div className="px-2 pb-2">
                  <Banner tone="info" title="Nothing planned for this day">Add a place from “Not in the plan” or another day.</Banner>
                </div>
              ) : (
                <DayTimeline schedule={schedule} mustVisit={trip.mustVisit} selectedId={selected} onOpen={openStop} hotelName={hotel.name} />
              )}
            </div>
          </div>
        </section>

        {it.unscheduled.length > 0 && (
          <section aria-labelledby="unscheduled-h" className="flex flex-col gap-2 pt-2">
            <h2 id="unscheduled-h" className="text-title font-bold">Not in the plan <span className="text-ink-subtle">({it.unscheduled.length})</span></h2>
            <p className="text-small text-ink-muted">These didn’t fit or were set aside. They stay saved — tap one to add it to a day.</p>
            <ul className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5 no-scrollbar">
              {it.unscheduled.map((id) => {
                const p = requirePlace(id)
                return (
                  <li key={id} className="w-[148px] shrink-0">
                    <button type="button" onClick={() => openStop(id)} className="flex w-full flex-col gap-2 rounded-tile text-left">
                      <span className="relative">
                        <PlaceImage src={p.image} alt="" category={p.category} className="h-[96px] w-full rounded-tile" iconSize={22} />
                        <span className="absolute right-1.5 bottom-1.5 flex size-8 items-center justify-center rounded-full bg-surface text-primary-ink shadow-card" aria-hidden>
                          <CalendarPlus size={15} />
                        </span>
                      </span>
                      <span>
                        <span className="block text-small leading-snug font-bold">{p.name}</span>
                        <span className="block text-micro text-ink-subtle">{CATEGORY_LABEL[p.category]} · ~{formatDuration(p.visitMins)}</span>
                        {closedReason(id, trip.brief) && <span className="mt-0.5 block text-micro text-warning">{closedReason(id, trip.brief)}</span>}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        <CostSummary
          title="Trip estimate"
          cost={summary.cost}
          budget={summary.budget}
          perDay={summary.days.map((d) => d.cost.total)}
          actions={
            <>
              <Button size="sm" variant="ghost" icon={Banknote} onClick={() => setBudgetOpen(true)}>Edit budget</Button>
              <Button size="sm" variant="ghost" icon={SlidersHorizontal} onClick={() => setPrefsOpen(true)}>Pace &amp; getting around</Button>
              {trip.undo && <Button size="sm" variant="ghost" icon={RotateCcw} onClick={undoLast}>Undo last change</Button>}
            </>
          }
        />
        <p className="text-small text-ink-subtle">Sample estimates only. Verify opening hours, prices and reservations before you travel. Nothing is booked.</p>
      </div>

      <ActionBar>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="lg"
            className="flex-1"
            icon={trip.status === 'saved' ? Check : Save}
            onClick={() => {
              dispatch({ type: 'saveTrip', tripId })
              show({ tone: 'success', message: 'Trip saved to My trips' })
              navigate(`/trip/${tripId}`)
            }}
          >
            {trip.status === 'saved' ? 'Done' : 'Save trip'}
          </Button>
          <Button size="lg" className="flex-[1.3]" icon={SlidersHorizontal} onClick={() => navigate(adjustHref())}>
            Adjust plan
          </Button>
        </div>
      </ActionBar>

      <PlaceSheet trip={trip} placeId={stopParam && (dayOfPlace(it, stopParam) >= 0 || it.unscheduled.includes(stopParam)) ? stopParam : null} onClose={() => setQuery({ stop: null })} />
      <PreferencesSheet trip={trip} open={prefsOpen} onClose={() => setPrefsOpen(false)} />
      <BudgetSheet trip={trip} open={budgetOpen} onClose={() => setBudgetOpen(false)} />
      <WhySheet trip={trip} open={whyOpen} onClose={() => setWhyOpen(false)} />
    </div>
  )
}
