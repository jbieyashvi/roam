import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BudgetField, TopBar } from '../components/controls'
import { ActionBar, Banner, Button, Chip, Field, Fieldset, inputClass, RadioCards } from '../components/ui'
import { DESTINATIONS, HOTELS, INTERESTS } from '../data/catalog'
import { SUPPORTED_DAYS, SUPPORTED_DESTINATION } from '../domain/planner'
import type { Interest, TripBrief } from '../domain/types'
import { todayISO } from '../lib/format'
import { navigate, setQuery, useRoute } from '../lib/router'
import { useTrip } from '../state/hooks'
import { validateBrief, type BriefErrors } from '../state/model'
import { useStore } from '../state/store'
import { MODE_OPTIONS, PACE_OPTIONS, Stepper } from './account'
import { MissingTrip } from './sample'

const STEPS = ['Where & when', 'Budget & base', 'Your style'] as const
const STEP_FIELDS: (keyof BriefErrors)[][] = [['destinationId', 'startDate', 'days', 'travellers'], ['budgetPerPerson'], ['interests']]

/** Validation for one step, including the demo's honest scope limits. */
function stepErrors(brief: TripBrief, step: number): BriefErrors {
  const all = validateBrief(brief)
  if (brief.destinationId && brief.destinationId !== SUPPORTED_DESTINATION) all.destinationId = 'Only Bangkok has sample data in this demo.'
  if (!all.days && brief.days !== SUPPORTED_DAYS) all.days = `This demo plans ${SUPPORTED_DAYS}-day trips only.`
  const out: BriefErrors = {}
  STEP_FIELDS[step].forEach((k) => {
    if (all[k]) out[k] = all[k]
  })
  return out
}

export function TripBriefScreen({ tripId }: { tripId: string }) {
  const trip = useTrip(tripId)
  const { dispatch } = useStore()
  const { query } = useRoute()
  const step = Math.min(3, Math.max(1, Number(query.get('step')) || 1)) - 1
  const [touched, setTouched] = useState<boolean[]>(() => [query.get('validate') === '1', query.get('validate') === '1', query.get('validate') === '1'])
  const [focusRequest, setFocusRequest] = useState(0)
  // After a failed Continue, move focus to the first invalid field once errors have rendered.
  useEffect(() => {
    if (focusRequest) document.querySelector<HTMLElement>('[aria-invalid="true"], fieldset:has([role="alert"]) button')?.focus()
  }, [focusRequest])
  if (!trip) return <MissingTrip tripId={tripId} />
  const brief = trip.brief
  const update = (patch: Partial<TripBrief>) => dispatch({ type: 'updateBrief', tripId, patch })
  const errors = touched[step] ? stepErrors(brief, step) : {}

  const next = () => {
    const errs = stepErrors(brief, step)
    if (Object.keys(errs).length) {
      setTouched((t) => t.map((v, i) => (i === step ? true : v)))
      setFocusRequest((n) => n + 1)
      return
    }
    if (step < 2) setQuery({ step: String(step + 2), validate: null })
    else navigate(`/trip/${tripId}/places`)
    window.scrollTo(0, 0)
  }
  const back = () => (step > 0 ? setQuery({ step: String(step), validate: null }) : navigate(trip.placeIds.length ? '/saved' : '/discover'))

  return (
    <div className="pb-action">
      <TopBar back={back} title="Trip details" />
      <div className="px-5">
        <div className="brief-editorial"><span className="chapter-label">BEFORE THE ADVENTURE</span><h2>Big ideas.<br/>Little details.</h2><p>A few preferences. A trip that fits.</p></div>
        <div className="mt-1 flex items-center justify-between text-small">
          <p className="font-semibold">
            Step {step + 1} of 3 · <span className="text-ink-muted">{STEPS[step]}</span>
          </p>
        </div>
        <div className="mt-2 flex gap-1.5" role="progressbar" aria-label="Trip details progress" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step + 1}>
          {STEPS.map((s, i) => (
            <span key={s} className={`h-1.5 flex-1 rounded-chip ${i <= step ? 'bg-primary' : 'bg-line'}`} />
          ))}
        </div>

        {Object.keys(errors).length > 0 && (
          <div className="mt-4">
            <Banner tone="error" title="A few details are missing" role="alert">
              Fill in the highlighted fields to continue.
            </Banner>
          </div>
        )}

        <form
          className="mt-5 flex flex-col gap-6"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            next()
          }}
        >
          {step === 0 && (
            <>
              <Field label="Destination" htmlFor="dest" error={errors.destinationId}>
                <select id="dest" value={brief.destinationId} onChange={(e) => update({ destinationId: e.target.value })} className={inputClass(!!errors.destinationId)} aria-invalid={!!errors.destinationId}>
                  {DESTINATIONS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                      {d.supported ? '' : ' (not in demo)'}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Start date" htmlFor="start" error={errors.startDate} helper="Dates are used to label days only.">
                <input
                  id="start"
                  type="date"
                  min={todayISO()}
                  value={brief.startDate}
                  onChange={(e) => update({ startDate: e.target.value })}
                  className={inputClass(!!errors.startDate)}
                  aria-invalid={!!errors.startDate}
                  aria-describedby={errors.startDate ? 'start-error' : 'start-help'}
                />
              </Field>
              <Field label="Number of days" htmlFor="days" error={errors.days} helper={`This demo plans ${SUPPORTED_DAYS}-day trips.`}>
                <input
                  id="days"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={14}
                  value={Number.isFinite(brief.days) && brief.days > 0 ? brief.days : ''}
                  onChange={(e) => update({ days: e.target.value === '' ? 0 : Math.round(Number(e.target.value)) })}
                  className={inputClass(!!errors.days)}
                  aria-invalid={!!errors.days}
                  aria-describedby={errors.days ? 'days-error' : 'days-help'}
                />
              </Field>
              {brief.days > 0 && brief.days !== SUPPORTED_DAYS && (
                <Banner tone="info" title={`${brief.days}-day plans aren't supported yet`} action={<Button size="sm" variant="secondary" onClick={() => update({ days: SUPPORTED_DAYS })}>Use 3 days</Button>}>
                  The prototype's sample data and rules are tuned for a 3-day Bangkok trip.
                </Banner>
              )}
              <div>
                <Stepper id="travellers" label="Travellers" value={brief.travellers} min={1} max={8} onChange={(v) => update({ travellers: v })} />
                <p className="mt-1 text-small text-ink-subtle">Taxi and ride-hail fares are split between travellers.</p>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <BudgetField id="budget" value={brief.budgetPerPerson} onChange={(v) => update({ budgetPerPerson: v })} error={errors.budgetPerPerson} />
              <Fieldset legend="Where you're staying" helper="Each day starts and ends here. Both hotels are fictional.">
                <RadioCards
                  name="hotel"
                  value={brief.startLocationId}
                  onChange={(v) => update({ startLocationId: v })}
                  options={HOTELS.map((h) => ({ value: h.id, label: h.name, detail: `${h.area} · fictional` }))}
                />
              </Fieldset>
            </>
          )}

          {step === 2 && (
            <>
              <Fieldset legend="Interests" error={errors.interests} helper="Matching places are prioritised when days are full.">
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((i) => (
                    <Chip
                      key={i.id}
                      selected={brief.interests.includes(i.id)}
                      onClick={() =>
                        update({ interests: brief.interests.includes(i.id) ? brief.interests.filter((x) => x !== i.id) : ([...brief.interests, i.id] as Interest[]) })
                      }
                    >
                      {i.label}
                    </Chip>
                  ))}
                </div>
              </Fieldset>
              <Fieldset legend="Pace">
                <RadioCards name="pace" value={brief.pace} onChange={(v) => update({ pace: v })} options={PACE_OPTIONS} />
              </Fieldset>
              <Fieldset legend="Getting around">
                <RadioCards name="mode" value={brief.travelMode} onChange={(v) => update({ travelMode: v })} options={MODE_OPTIONS} />
              </Fieldset>
            </>
          )}
          <button type="submit" className="sr-only" tabIndex={-1}>Continue</button>
        </form>
      </div>
      <ActionBar>
        <Button block size="lg" iconRight={ArrowRight} onClick={next}>
          {step < 2 ? 'Continue' : 'Review places'}
        </Button>
      </ActionBar>
    </div>
  )
}
