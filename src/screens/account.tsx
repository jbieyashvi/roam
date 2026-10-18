import { ChevronRight, FlaskConical, Luggage, Minus, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { BottomSheet, ConfirmSheet } from '../components/BottomSheet'
import { PlaceImage } from '../components/cards'
import { DemoBadge, TopBar } from '../components/controls'
import { Button, Card, Chip, EmptyState, Field, Fieldset, inputClass, RadioCards, Section, Tag } from '../components/ui'
import { getDestination, INTERESTS } from '../data/catalog'
import type { Interest, Pace, TravelMode, Trip } from '../domain/types'
import { formatDateRange, plural } from '../lib/format'
import { navigate } from '../lib/router'
import { buildScenario, SCENARIOS } from '../state/demo'
import { tripHome } from '../state/hooks'
import { useStore, useToast } from '../state/store'
import { ArchivedTrips, LegacyNotice, LoadSampleButton } from './sample'

export const PACE_OPTIONS: { value: Pace; label: string; detail: string }[] = [
  { value: 'relaxed', label: 'Relaxed', detail: 'Up to 4 stops, 9:30 am – 6 pm, an hour of downtime' },
  { value: 'balanced', label: 'Balanced', detail: 'Up to 6 stops, 9 am – 7:30 pm, a short rest after lunch' },
  { value: 'packed', label: 'Packed', detail: 'Up to 8 stops, 8:30 am – 9 pm, no planned downtime' },
]

export const MODE_OPTIONS: { value: TravelMode; label: string; detail: string }[] = [
  { value: 'walk-car', label: 'Walk nearby, taxi for longer hops', detail: 'Walk up to ~1.2 km; taxi or ride-hail beyond that' },
  { value: 'car-first', label: 'Taxi for most hops', detail: 'Walk only very short distances (~400 m)' },
]

export function Stepper({ id, label, value, min, max, onChange }: { id: string; label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span id={id} className="text-small font-semibold">{label}</span>
      <div className="flex items-center gap-1" role="group" aria-labelledby={id}>
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="flex size-11 items-center justify-center rounded-full border border-line-strong bg-surface disabled:opacity-40">
          <Minus size={16} aria-hidden />
        </button>
        <output aria-live="polite" className="w-10 text-center text-heading font-semibold">{value}</output>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="flex size-11 items-center justify-center rounded-full border border-line-strong bg-surface disabled:opacity-40">
          <Plus size={16} aria-hidden />
        </button>
      </div>
    </div>
  )
}

// ── My trips ───────────────────────────────────────────────────

export function TripsScreen() {
  const { state, dispatch } = useStore()
  const { show } = useToast()
  const [renaming, setRenaming] = useState<Trip | null>(null)
  const [name, setName] = useState('')
  const [deleting, setDeleting] = useState<Trip | null>(null)
  const trips = [...state.trips].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return (
    <div className="pb-nav">
      <TopBar title="My trips" large actions={<DemoBadge />} />
      <div className="mt-4 flex flex-col gap-3 px-5">
        <LegacyNotice onTrips />
        <div className="trip-editorial"><span className="chapter-label">THE NEXT CHAPTER</span><h2>Somewhere<br/>worth going.</h2><span aria-hidden="true" className="compass-mark">↗</span><p>Your plans, all in one place.</p></div>
        {trips.length === 0 ? (
          <EmptyState icon={Luggage} title="No trips yet" action={<div className="flex flex-col items-center gap-2"><Button onClick={() => navigate('/saved')}>Start from saved places</Button><LoadSampleButton variant="ghost" /></div>}>
            Trips you plan are kept in this browser so you can come back to them. Or load the sample “A little Bangkok escape” to see a finished plan.
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {trips.map((t) => {
              const dest = getDestination(t.brief.destinationId)
              const stops = t.itinerary?.days.reduce((s, d) => s + d.placeIds.length, 0) ?? 0
              return (
                <li key={t.id}>
                  <Card className="p-0">
                    <button type="button" onClick={() => navigate(tripHome(t))} className="flex w-full items-center gap-3 rounded-t-card p-3 text-left hover:bg-surface-sunken">
                      <PlaceImage src={dest?.image} alt="" category="destination" className="size-16 shrink-0 rounded-[10px]" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <Tag tone={t.status === 'saved' ? 'success' : 'neutral'}>{t.status === 'saved' ? 'Saved' : 'Draft'}</Tag>
                        </span>
                        <span className="mt-1 block truncate text-body font-semibold">{t.name}</span>
                        <span className="block text-small text-ink-muted">
                          {formatDateRange(t.brief.startDate, t.brief.days)} · {t.itinerary ? plural(stops, 'stop') : 'Not planned yet'}
                        </span>
                      </span>
                      <ChevronRight size={18} className="shrink-0 text-ink-subtle" aria-hidden />
                    </button>
                    <div className="flex border-t border-line">
                      <button type="button" onClick={() => { setRenaming(t); setName(t.name) }} className="flex min-h-11 flex-1 items-center justify-center gap-1.5 text-small font-semibold text-ink-muted hover:bg-surface-sunken">
                        <Pencil size={15} aria-hidden /> Rename <span className="sr-only">{t.name}</span>
                      </button>
                      <button type="button" onClick={() => setDeleting(t)} className="flex min-h-11 flex-1 items-center justify-center gap-1.5 border-l border-line text-small font-semibold text-danger hover:bg-danger-soft">
                        <Trash2 size={15} aria-hidden /> Delete <span className="sr-only">{t.name}</span>
                      </button>
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
        {trips.length > 0 && (
          <div className="flex flex-col gap-1 pt-1">
            <LoadSampleButton variant="ghost" block />
            <p className="text-center text-micro text-ink-subtle">Loads “A little Bangkok escape”. Only the sample trip is replaced — your other trips stay.</p>
          </div>
        )}
        <ArchivedTrips />
      </div>

      <BottomSheet
        open={!!renaming}
        onClose={() => setRenaming(null)}
        title="Rename trip"
        footer={
          <Button
            block
            disabled={!name.trim()}
            onClick={() => {
              dispatch({ type: 'renameTrip', tripId: renaming!.id, name })
              show({ tone: 'success', message: 'Trip renamed' })
              setRenaming(null)
            }}
          >
            Save name
          </Button>
        }
      >
        <Field label="Trip name" htmlFor="trip-name" error={name.trim() ? undefined : 'Enter a name.'}>
          <input id="trip-name" data-autofocus value={name} maxLength={60} onChange={(e) => setName(e.target.value)} className={inputClass(!name.trim())} />
        </Field>
      </BottomSheet>

      <ConfirmSheet
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this trip?"
        confirmLabel="Delete trip"
        destructive
        onConfirm={() => {
          dispatch({ type: 'deleteTrip', tripId: deleting!.id })
          show({ tone: 'success', message: `Deleted “${deleting!.name}”` })
          setDeleting(null)
        }}
      >
        “{deleting?.name}” and its itinerary will be removed from this browser. Your saved places stay.
      </ConfirmSheet>
    </div>
  )
}

// ── Profile ────────────────────────────────────────────────────

export function ProfileScreen() {
  const { state, dispatch } = useStore()
  const { show } = useToast()
  const [resetting, setResetting] = useState(false)
  const prefs = state.preferences
  const toggleInterest = (id: Interest) => {
    const next = prefs.interests.includes(id) ? prefs.interests.filter((i) => i !== id) : [...prefs.interests, id]
    if (next.length) dispatch({ type: 'setPreferences', patch: { interests: next } })
    else show({ tone: 'info', message: 'Keep at least one interest' })
  }

  return (
    <div className="pb-nav">
      <TopBar title="Profile" large actions={<DemoBadge />} />
      <div className="mt-4 flex flex-col gap-8 px-5">
        <div className="profile-editorial"><span className="chapter-label">YOUR TRAVEL SIGNATURE</span><h2>A little more you.</h2><p>Set your pace. Follow your curiosity.</p></div>
        <Section title="Trip defaults" id="defaults">
          <p className="-mt-2 text-small text-ink-muted">New trips start with these. You can change them per trip.</p>
          <Card className="flex flex-col gap-5">
            <Fieldset legend="Interests">
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((i) => (
                  <Chip key={i.id} selected={prefs.interests.includes(i.id)} onClick={() => toggleInterest(i.id)}>{i.label}</Chip>
                ))}
              </div>
            </Fieldset>
            <Fieldset legend="Pace">
              <RadioCards name="pref-pace" value={prefs.pace} onChange={(v) => dispatch({ type: 'setPreferences', patch: { pace: v } })} options={PACE_OPTIONS} />
            </Fieldset>
            <Fieldset legend="Getting around">
              <RadioCards name="pref-mode" value={prefs.travelMode} onChange={(v) => dispatch({ type: 'setPreferences', patch: { travelMode: v } })} options={MODE_OPTIONS} />
            </Fieldset>
            <Stepper id="pref-travellers" label="Travellers" value={prefs.travellers} min={1} max={8} onChange={(v) => dispatch({ type: 'setPreferences', patch: { travellers: v } })} />
          </Card>
        </Section>

        <Section title="About this demo" id="about">
          <Card className="flex flex-col gap-2 text-small text-ink-muted">
            <p>
              Roam is an interactive product design prototype. Itineraries come from fixed planning rules applied to a small set of sample Bangkok places — no AI
              service, maps provider or booking system is connected.
            </p>
            <p>Place names are real; prices (in THB), visit times, hours, travel times and the map are illustrative estimates. The hotels are fictional.</p>
            <p>Everything is stored in this browser only.</p>
          </Card>
        </Section>

        <Section title="Data" id="data">
          <Card className="flex flex-col gap-1 p-2">
            <button type="button" onClick={() => setResetting(true)} className="flex min-h-12 items-center gap-3 rounded-control px-2 text-left text-body font-semibold text-danger hover:bg-danger-soft">
              <RotateCcw size={18} aria-hidden /> Reset demo data
            </button>
            <a href="#/demo" className="flex min-h-12 items-center gap-3 rounded-control px-2 text-small text-ink-subtle hover:bg-surface-sunken">
              <FlaskConical size={16} aria-hidden /> Demo states (for reviewers)
            </a>
          </Card>
        </Section>
      </div>

      <ConfirmSheet
        open={resetting}
        onClose={() => setResetting(false)}
        title="Reset demo data?"
        confirmLabel="Reset everything"
        destructive
        onConfirm={() => {
          dispatch({ type: 'reset' })
          setResetting(false)
          show({ tone: 'success', message: 'Demo data reset' })
          navigate('/discover')
        }}
      >
        This deletes all your Bangkok trips, restores the sample saved places and resets your defaults. Read-only trips from the earlier sample city are kept. It can't be undone.
      </ConfirmSheet>
    </div>
  )
}

// ── Demo states menu (kept out of the main journey) ────────────

export function DemoMenuScreen() {
  const { state: current, dispatch } = useStore()
  return (
    <div className="pb-8">
      <TopBar back="/profile" title="Demo states" />
      <div className="flex flex-col gap-3 px-5 pt-2">
        <p className="text-small text-ink-muted">
          Jump straight to a reproducible state for review. Each one <strong className="text-ink">replaces</strong> the demo data in this browser (trips kept from the earlier sample city stay).
        </p>
        <ul className="flex flex-col gap-2">
          {SCENARIOS.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  const { state, route } = buildScenario(s.id)
                  dispatch({ type: 'replaceState', state: { ...state, archivedTrips: current.archivedTrips, legacy: current.legacy } })
                  navigate(route, { replace: true })
                }}
                className="flex min-h-14 w-full items-center gap-3 rounded-card border border-line bg-surface p-3 text-left shadow-card hover:bg-surface-sunken"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-semibold">{s.label}</span>
                  <span className="block text-small text-ink-muted">{s.detail}</span>
                </span>
                <ChevronRight size={18} className="text-ink-subtle" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
