/*
 * Roam marketing page, shown at the base URL (empty hash) and for in-page anchors.
 * It never reads or writes the person's saved state: CTAs are plain links into the app
 * (`#/discover`, and `#/sample`, which asks before replacing an edited sample).
 */
import {
  ArrowRight, BookOpen, Bookmark, CalendarDays, CarTaxiFront, ChevronDown, FileSpreadsheet, Footprints, Globe,
  Map as MapIcon, MapPin, Menu, Route, Ship, Smartphone, Sparkles, Star, Wallet, X, List,
} from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { SchematicMap } from '../components/itinerary'
import { CATEGORY_LABEL } from '../data/catalog'
import { creditFor } from '../data/imageCredits'
import { requirePlace } from '../data/places'
import { comparePlans, propose } from '../domain/adjust'
import type { TimelineItem } from '../domain/planner'
import { asset } from '../lib/asset'
import { formatClock, formatDuration, formatSignedDuration, formatTHB, plural } from '../lib/format'
import { AdjustDemo } from './AdjustDemo'
import { PhonePreview } from './PhonePreview'
import { Showcase } from './Showcase'
import { Band, CtaLink, Eyebrow, Reveal, SectionHead, SectionLabel, Wordmark } from './parts'
import { DAY_NOTES, SAMPLE_BUDGET, SAMPLE_DATES, SAMPLE_PARTY, SAMPLE_PLAN, scheduleFor, summaryFor } from './sample'
import '../styles/landing.css'

const APP = '#/discover'
const SAMPLE = '#/sample'

const NAV = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#demo', label: 'Sample trip' },
  { href: '#faq', label: 'FAQ' },
]

/* Sample data shared by the previews below. */
const SUMMARY = summaryFor(SAMPLE_PLAN)
const DAY1 = scheduleFor(SAMPLE_PLAN, 0)
const DAY1_STOPS = DAY1.items.filter((i): i is Extract<TimelineItem, { kind: 'stop' }> => i.kind === 'stop')
const DAY1_LEGS = DAY1.items.filter((i): i is Extract<TimelineItem, { kind: 'travel' }> => i.kind === 'travel')
/** The "Less walking" request, run once on the sample with the same rules as the app. */
const LESS_WALKING = comparePlans(SAMPLE_PLAN, propose('less-walking', SAMPLE_PLAN, 0).next)

export function LandingPage() {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prev = document.title
    document.title = 'Roam — less planning, more exploring'
    // Reveal animations only when motion is welcome; otherwise everything is simply visible.
    const ok = window.matchMedia?.('(prefers-reduced-motion: no-preference)').matches
    if (ok) root.current?.classList.add('lp-motion')
    // Refreshing on `#how-it-works` etc.: the section didn't exist when the browser looked for it.
    const id = window.location.hash.slice(1)
    if (id && !id.startsWith('/')) document.getElementById(id)?.scrollIntoView()
    return () => {
      document.title = prev
    }
  }, [])

  return (
    <div className="landing" ref={root}>
      <a href="#top" className="lp-skip">Skip to content</a>
      <Nav />
      <main id="top" tabIndex={-1}>
        <Hero />
        <Problem />
        <HowItWorks />
        <Features />
        <DemoIntro />
        <Showcase />
        <AdjustDemo />
        <GetRoam />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}

// ── Nav ────────────────────────────────────────────────────────

function Nav() {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const toggle = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggle.current?.focus()
      }
    }
    const onResize = () => window.innerWidth >= 1024 && setOpen(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  return (
    <header className="lp-nav">
      <div className="lp-frame">
        <div className="lp-grid lp-nav-grid">
          <div className="lp-cell lp-nav-logo">
            <a href="#top" className="lp-logo-link" aria-label="Roam, back to top">
              <Wordmark />
            </a>
          </div>
          <nav aria-label="Main" className="lp-cell lp-nav-links">
            {NAV.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
          </nav>
          <div className="lp-cell lp-nav-cta">
            <CtaLink href={APP} className="lp-btn-sm" icon={null}>Try Roam</CtaLink>
          </div>
          <div className="lp-cell lp-nav-menu">
            <button
              ref={toggle}
              type="button"
              className="lp-menu-btn"
              aria-expanded={open}
              aria-controls={menuId}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
              <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
            </button>
          </div>
        </div>
        <div id={menuId} className="lp-menu" hidden={!open}>
          <nav aria-label="Main, mobile">
            {NAV.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="lp-menu-link">{l.label}</a>
            ))}
            <div className="lp-menu-cta">
              <CtaLink href={APP} className="w-full">Try Roam</CtaLink>
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}

// ── Hero ───────────────────────────────────────────────────────

const HERO_SCREENS = [
  { screen: 'discover', label: 'Discover' },
  { screen: 'itinerary', label: 'Itinerary' },
  { screen: 'map', label: 'Map' },
] as const

function Hero() {
  return (
    <Band label="hero-title" className="lp-hero">
      <Reveal className="lp-cell lp-hero-copy">
        <div>
          <Eyebrow>Travel planning from your saved places</Eyebrow>
          <h1 id="hero-title" className="lp-h1">
            <span>Less planning.</span>
            <span>More exploring.</span>
          </h1>
          <p className="lp-hero-lede">
            Roam turns the places you save into a day-by-day itinerary that fits your budget, interests and pace, with nearby stops grouped so you spend less time getting around.
          </p>
          <div className="lp-cta-row">
            <CtaLink href={APP}>Try Roam</CtaLink>
            <CtaLink href="#how-it-works" tone="secondary" icon={null}>See how it works</CtaLink>
          </div>
          <p className="lp-note">Free web prototype. No account needed.</p>
        </div>
        <dl className="lp-strip lp-hero-facts" aria-label="What Roam plans around">
          <div><dt>Starts from</dt><dd>Your saved places</dd></div>
          <div><dt>Fits</dt><dd>Budget, pace, interests</dd></div>
          <div><dt>Shows</dt><dd>Map and schedule</dd></div>
        </dl>
      </Reveal>
      <Reveal className="lp-cell lp-hero-screens" delay={1}>
        <div className="lp-trio">
          {HERO_SCREENS.map((s) => <PhonePreview key={s.screen} screen={s.screen} className={`lp-trio-${s.screen}`} />)}
        </div>
        <ul className="lp-trio-labels" aria-hidden>
          {HERO_SCREENS.map((s) => <li key={s.screen}>{s.label}</li>)}
        </ul>
      </Reveal>
    </Band>
  )
}

// ── The problem ────────────────────────────────────────────────

const PAINS = [
  { icon: Bookmark, title: 'Saved posts', text: 'Reels and posts you bookmarked months ago, with no sense of where they are or how they fit together.' },
  { icon: MapPin, title: 'Map pins', text: 'A cloud of starred places with no order, no timings and no idea what’s close to what.' },
  { icon: BookOpen, title: 'Travel blogs', text: 'A dozen tabs of opening hours, tips and “best time to go”, read once and lost.' },
  { icon: FileSpreadsheet, title: 'Spreadsheets', text: 'A budget and a day-by-day plan you rebuild by hand every time something changes.' },
]

function Problem() {
  return (
    <Band id="problem" label="problem-title" className="lp-problem">
      <SectionHead
        n="01"
        label="The problem"
        id="problem-title"
        title="Your trip is scattered across a dozen tabs."
        lede="Saved posts in one app, pins in another, a blog for opening hours and a spreadsheet for the budget. Planning turns into copy and paste."
      />
      {PAINS.map((p, i) => (
        <Reveal key={p.title} className="lp-cell lp-pain" delay={(i % 3) as 0 | 1 | 2}>
          <span className="lp-icon-box"><p.icon size={20} aria-hidden /></span>
          <h3 className="lp-pain-title">{p.title}</h3>
          <p className="lp-pain-text">{p.text}</p>
        </Reveal>
      ))}
      <Reveal className="lp-cell lp-fix">
        <p className="lp-fix-text"><span className="lp-wordmark-inline">Roam</span> brings it into one place: your saved spots, your preferences and a plan you can actually follow.</p>
        <a href="#how-it-works" className="lp-fix-link">How Roam helps <ArrowRight size={16} aria-hidden /></a>
      </Reveal>
    </Band>
  )
}

// ── How Roam helps ─────────────────────────────────────────────

const costLabel = (c: number | null) => (c === null ? 'Cost unverified' : c === 0 ? 'Free entry' : `~${formatTHB(c)} pp`)

function SavedTile({ id }: { id: string }) {
  const p = requirePlace(id)
  const must = SAMPLE_PLAN.mustVisit.includes(id)
  return (
    <li className="lp-saved">
      <img src={p.image} alt="" loading="lazy" />
      <div className="lp-saved-body">
        <p className="lp-saved-name">{p.name}</p>
        <p className="lp-saved-meta">{CATEGORY_LABEL[p.category]} · {costLabel(p.costPerPerson)}</p>
        {must && <span className="lp-must"><Star size={11} aria-hidden /> Must visit</span>}
      </div>
    </li>
  )
}

function Step({ n, title, text, delay, bleed, children }: { n: string; title: string; text: string; delay?: 0 | 1 | 2; bleed?: boolean; children: ReactNode }) {
  return (
    <Reveal className="lp-cell lp-step" delay={delay}>
      <h3 className="lp-step-n"><span className="lp-step-num">{n}</span> <span aria-hidden>/</span> {title}</h3>
      <p className="lp-step-text">{text}</p>
      <div className={bleed ? 'lp-step-body lp-step-bleed' : 'lp-step-body'}>{children}</div>
    </Reveal>
  )
}

function HowItWorks() {
  return (
    <Band id="how-it-works" label="how-title" className="lp-how">
      <SectionHead
        n="02"
        label="How Roam helps"
        id="how-title"
        title="From saved places to a plan in four steps."
        lede="Shown with places from the Bangkok sample trip."
      />

      <Step n="01" title="Save places" text="Browse places to see, eat and explore, keep the ones you like, and star the few you won’t skip." bleed>
        <ul className="lp-saved-grid" aria-label="Saved places in the sample">
          {['grand-palace', 'wat-arun', 'wat-pho', 'pak-khlong-talat'].map((id) => <SavedTile key={id} id={id} />)}
        </ul>
      </Step>

      <Step n="02" title="Set your preferences" text="Tell Roam your dates, budget, pace, interests and how you like to get around." delay={1}>
        <dl className="lp-prefs">
          <div><dt><CalendarDays size={15} aria-hidden /> When</dt><dd>{SAMPLE_DATES} · {SAMPLE_PARTY}</dd></div>
          <div><dt><Wallet size={15} aria-hidden /> Budget</dt><dd>{formatTHB(SAMPLE_BUDGET)} pp</dd></div>
          <div><dt><Footprints size={15} aria-hidden /> Pace</dt><dd><span className="sr-only">Balanced</span><span className="lp-seg" aria-hidden><span>Relaxed</span><span className="is-on">Balanced</span><span>Packed</span></span></dd></div>
        </dl>
        <ul className="lp-interests" aria-label="Interests">
          {['Architecture', 'Food', 'Cafés', 'Markets'].map((i) => <li key={i}>{i}</li>)}
        </ul>
      </Step>

      <Step n="03" title="Build your itinerary" text="Roam groups nearby places into days and orders each one to keep travel short, with lunch and breaks built in." delay={2}>
        <ol className="lp-daylist">
          {SAMPLE_PLAN.itinerary.days.map((d, i) => (
            <li key={i}>
              <span className="lp-daylist-n">Day {i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{DAY_NOTES[i].title}</span>
                <span className="block text-small text-ink-muted">{plural(d.placeIds.length, 'stop')} · ~{formatTHB(scheduleFor(SAMPLE_PLAN, i).cost.total)} pp</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="lp-plan-total">
          <span>~{formatTHB(SUMMARY.cost.total)} pp</span> estimated, of a {formatTHB(SAMPLE_BUDGET)} budget
        </p>
      </Step>

      <Step n="04" title="Adjust your plan" text="Move, swap or remove stops, or ask for less walking, a lower cost or a slower day. Preview every change first.">
        <AdjustChips />
        <AdjustPeek />
      </Step>
    </Band>
  )
}

function AdjustChips() {
  return (
    <ul className="lp-mini-chips" aria-label="Example requests">
      {['Less walking', 'Lower the cost', 'More cafés', 'A slower day'].map((c, i) => <li key={c} className={i === 0 ? 'is-on' : undefined}>{c}</li>)}
    </ul>
  )
}

/** The "Less walking" request on the sample: before → after, as the app previews it. */
function AdjustPeek() {
  const d = LESS_WALKING
  return (
    <div className="lp-peek">
      <p className="lp-peek-head"><span>Less walking</span><span className="lp-tag">Simulated</span></p>
      <dl className="lp-peek-rows">
        <div><dt>Walking</dt><dd>{formatDuration(d.before.walkMins)} <ArrowRight size={12} aria-label="to" /> {formatDuration(d.after.walkMins)}</dd></div>
        <div><dt>Rides &amp; ferry</dt><dd>{formatSignedDuration(d.carMinsDelta)}</dd></div>
      </dl>
      <p className="lp-peek-foot">Preview · nothing changes until you apply it</p>
    </div>
  )
}

// ── Key features ───────────────────────────────────────────────

function Features() {
  const cost = SUMMARY.cost
  const used = Math.min(100, Math.round((cost.total / SAMPLE_BUDGET) * 100))
  return (
    <Band id="features" label="features-title" className="lp-features">
      <SectionHead
        n="03"
        label="Key features"
        id="features-title"
        title="Everything you need to go from “maybe” to mapped out."
        lede="Each of these works in the prototype today. Previews use the Bangkok sample trip."
      />

      <Feature icon={CalendarDays} title="Personalized daily plans" text="Days shaped by your interests and pace, with realistic start and finish times, not a generic top-ten list.">
        <ol className="lp-mini-list">
          {DAY1_STOPS.slice(0, 5).map((s) => (
            <li key={s.placeId}>
              <span className="lp-mini-time">{formatClock(s.start)}</span>
              <span className="lp-mini-name">{requirePlace(s.placeId).name}</span>
            </li>
          ))}
        </ol>
      </Feature>

      <Feature icon={Bookmark} title="Saved places" text="Keep every place you like in one list, and star your must-visits so they always make the plan." delay={1}>
        <ul className="lp-mini-list">
          {['wat-arun', 'jay-fai', 'gallery-drip', 'talat-noi', 'chatuchak'].map((id) => {
            const p = requirePlace(id)
            return (
              <li key={id}>
                <img src={p.image} alt="" loading="lazy" className="lp-mini-thumb" />
                <span className="lp-mini-name">{p.name}</span>
                {SAMPLE_PLAN.mustVisit.includes(id) ? <Star size={14} aria-label="Must visit" className="lp-mini-star" /> : <span className="lp-mini-meta">{CATEGORY_LABEL[p.category]}</span>}
              </li>
            )
          })}
        </ul>
      </Feature>

      <Feature icon={MapIcon} title="Map and schedule views" text="See each day on a map or as a timeline, whichever helps you picture it." delay={2}>
        <div className="lp-mini-map">
          <span className="lp-seg lp-mini-seg" aria-hidden><span className="is-on"><MapIcon size={12} /> Map</span><span><List size={12} /> List</span></span>
          <div inert aria-hidden>
            <SchematicMap
              stops={DAY1_STOPS.map((s) => ({ placeId: s.placeId, order: s.order }))}
              schedule={DAY1}
              brief={SAMPLE_PLAN.brief}
              selectedId={null}
              onSelect={() => {}}
              label="Illustrative map"
            />
          </div>
        </div>
      </Feature>

      <Feature icon={Wallet} title="Estimated budgets" tag="Sample estimate" text="See roughly what each day costs, split into entry, food and transport, against the budget you set.">
        <dl className="lp-mini-rows">
          <div><dt>Activities</dt><dd>{formatTHB(cost.activities)}</dd></div>
          <div><dt>Food</dt><dd>{formatTHB(cost.food)}</dd></div>
          <div><dt>Transport</dt><dd>{formatTHB(cost.transport)}</dd></div>
          <div className="is-total"><dt>Trip, per person</dt><dd>~{formatTHB(cost.total)}</dd></div>
        </dl>
        <div className="lp-meter" aria-hidden><span style={{ width: `${used}%` }} /></div>
        <p className="lp-mini-note">{used}% of a {formatTHB(SAMPLE_BUDGET)} budget</p>
      </Feature>

      <Feature icon={Route} title="Travel times" tag="Estimates" text="Walks, rides and ferries between stops are timed in, so the day holds together on the ground." delay={1}>
        <ul className="lp-mini-list">
          {DAY1_LEGS.slice(0, 5).map((l, i) => {
            const Icon = l.leg.mode === 'walk' ? Footprints : l.leg.mode === 'boat' ? Ship : CarTaxiFront
            return (
              <li key={i}>
                <Icon size={15} aria-hidden className="lp-mini-ico" />
                <span className="lp-mini-name">{l.leg.mode === 'walk' ? 'Walk' : l.leg.mode === 'boat' ? 'Ferry' : 'Taxi'} to {l.toLabel}</span>
                <span className="lp-mini-meta">{formatDuration(l.leg.mins)}</span>
              </li>
            )
          })}
        </ul>
      </Feature>

      <Feature icon={Sparkles} title="AI-assisted adjustments" tag="Simulated" text="Ask for less walking, a lower cost or a slower day, and see exactly what changes before you apply it." delay={2}>
        <AdjustChips />
        <AdjustPeek />
      </Feature>
    </Band>
  )
}

function Feature({
  icon: Icon, title, text, tag, delay, children,
}: { icon: typeof Star; title: string; text: string; tag?: string; delay?: 0 | 1 | 2; children: ReactNode }) {
  return (
    <Reveal className="lp-cell lp-feat" delay={delay}>
      <div className="lp-feat-head">
        <span className="lp-icon-box"><Icon size={20} aria-hidden /></span>
        {tag && <span className="lp-tag">{tag}</span>}
      </div>
      <div className="lp-feat-copy">
        <h3 className="lp-feat-title">{title}</h3>
        <p className="lp-feat-text">{text}</p>
      </div>
      <div className="lp-feat-demo">{children}</div>
    </Reveal>
  )
}

// ── Product demo (the Bangkok sample) ──────────────────────────

function DemoIntro() {
  return (
    <Band id="demo" label="demo-title" className="lp-demo-head">
      <SectionHead
        n="04"
        label="Sample trip"
        id="demo-title"
        title="See a trip come together."
        lede={<>A real plan made by Roam from the built-in <strong>Bangkok sample</strong>: {plural(SAMPLE_PLAN.brief.days, 'day')}, {plural(SUMMARY.stopCount, 'stop')}. Try it below. Prices and travel times are sample estimates.</>}
        action={<CtaLink href={SAMPLE} tone="secondary" className="lp-btn-sm">Open the sample in Roam</CtaLink>}
      />
    </Band>
  )
}

// ── Get Roam ───────────────────────────────────────────────────

function GetRoam() {
  return (
    <Band id="get-roam" label="get-title" className="lp-get">
      <Reveal className="lp-cell lp-get-copy">
        <SectionLabel n="05">Get Roam</SectionLabel>
        <h2 id="get-title" className="lp-h2">Plan in your browser today.</h2>
        <p className="lp-lede">No download or account needed. Your saved places and trips stay in this browser.</p>
      </Reveal>
      <Reveal className="lp-cell lp-get-card" delay={1}>
        <div className="lp-feat-head">
          <span className="lp-icon-box"><Globe size={20} aria-hidden /></span>
          <span className="lp-tag lp-tag-live">Available now</span>
        </div>
        <h3 className="lp-feat-title">Web app</h3>
        <p className="lp-feat-text">Works on desktop and mobile browsers.</p>
        <CtaLink href={APP} className="lp-get-btn">Try Roam</CtaLink>
      </Reveal>
      <Reveal className="lp-cell lp-get-card" delay={2}>
        <div className="lp-feat-head">
          <span className="lp-icon-box"><Smartphone size={20} aria-hidden /></span>
          <span className="lp-tag">Coming soon</span>
        </div>
        <h3 className="lp-feat-title">iPhone and Android</h3>
        <p className="lp-feat-text">Native apps aren’t available yet.</p>
        <ul className="lp-stores" aria-label="Mobile apps, coming soon">
          <li className="lp-store"><span className="lp-store-small">Coming soon to the</span> App Store</li>
          <li className="lp-store"><span className="lp-store-small">Coming soon to</span> Google Play</li>
        </ul>
      </Reveal>
    </Band>
  )
}

// ── FAQ ────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'What is Roam?',
    a: 'Roam is a travel planner that starts from the places you’ve saved. You tell it your dates, budget, pace and interests, and it turns those places into a day-by-day itinerary you can view as a map or a schedule and adjust as you go. This version is an interactive web prototype.',
  },
  {
    q: 'How does Roam build an itinerary?',
    a: 'It groups nearby places into days, orders each day to keep travel short, keeps your must-visits in, and fits places to sensible times, such as markets in the morning and street food in the evening. It adds lunch and breaks to suit your pace, then estimates costs and travel times. In this prototype, planning runs on simple rules in your browser.',
  },
  {
    q: 'Which destinations can I plan?',
    a: 'Right now, Bangkok. It has a full set of places to save and plan with. Other cities you’ll see in the app, such as Chiang Mai, Lisbon and Kyoto, are there for inspiration only and can’t be planned yet.',
  },
  {
    q: 'Is the AI real?',
    a: 'Not yet. Requests like “less walking”, “lower the cost”, “more cafés” or “a slower day” are simulated with rule-based logic, not a live AI model. You always see a before-and-after preview first, nothing changes until you apply it, and applied changes can be undone.',
  },
  {
    q: 'Are prices and travel times live?',
    a: 'No. Costs are estimates for entry, food and local transport, and travel times are approximate. Opening hours are general notes. Check current prices and hours before you go.',
  },
  {
    q: 'Does Roam book anything?',
    a: 'No. Roam doesn’t book tickets, tables, rides or hotels, and it doesn’t take payment. It’s a planning tool.',
  },
  {
    q: 'Do I need an account or an app?',
    a: 'No. Roam runs in your web browser, with no account. Saved places and trips are stored only in that browser. Native iPhone and Android apps aren’t available yet.',
  },
]

function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  const base = useId()
  return (
    <Band id="faq" label="faq-title" className="lp-faq-grid">
      <Reveal className="lp-cell lp-faq-intro">
        <SectionLabel n="06">Questions</SectionLabel>
        <h2 id="faq-title" className="lp-h2">Good to know.</h2>
        <p className="lp-lede">Roam is an early, interactive prototype. Here’s exactly what it does today, and what it doesn’t.</p>
      </Reveal>
      <div className="lp-cell lp-faq">
          {FAQS.map((f, i) => {
            const isOpen = open === i
            return (
              <div key={f.q} className="lp-faq-item">
                <h3>
                  <button
                    type="button"
                    id={`${base}-q${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`${base}-a${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="lp-faq-q"
                  >
                    {f.q}
                    <ChevronDown size={20} aria-hidden className="lp-faq-icon" />
                  </button>
                </h3>
                <div id={`${base}-a${i}`} role="region" aria-labelledby={`${base}-q${i}`} hidden={!isOpen} className="lp-faq-a">
                  <p>{f.a}</p>
                </div>
              </div>
            )
          })}
      </div>
    </Band>
  )
}

// ── Final CTA & footer ─────────────────────────────────────────

function FinalCta() {
  return (
    <Band label="final-title" className="lp-final">
      <Reveal className="lp-cell lp-final-copy">
        <h2 id="final-title" className="lp-h2 lp-final-h">Your next adventure starts here.</h2>
        <div className="lp-cta-row">
          <CtaLink href={APP} tone="lime">Try Roam</CtaLink>
          <CtaLink href={SAMPLE} tone="inverse" icon={null}>See a sample trip</CtaLink>
        </div>
      </Reveal>
      <div className="lp-cell lp-final-photo">
        <img src={asset('/images/bangkok/chinatown-lantern.jpg')} alt="Red lanterns strung above a street in Bangkok’s Chinatown" loading="lazy" />
        <p className="lp-edge-caption"><MapPin size={14} aria-hidden /> Chinatown, Bangkok</p>
      </div>
    </Band>
  )
}

const FOOTER_LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#demo', label: 'Sample trip' },
  { href: '#get-roam', label: 'Get Roam' },
  { href: '#faq', label: 'FAQ' },
]

/** Every photo on this page, including those inside the app previews, for the credits list. */
const PAGE_PHOTOS = [
  ...new Set([
    ...['wat-arun-river', 'chinatown-lantern', 'talat-noi-art', 'express-boat'].map((n) => asset(`/images/bangkok/${n}.jpg`)),
    ...['grand-palace', 'wat-arun', 'wat-pho', 'pak-khlong-talat', 'jay-fai', 'gallery-drip', 'talat-noi', 'chatuchak'].map((id) => requirePlace(id).image!),
    ...SAMPLE_PLAN.itinerary.days[0].placeIds.map((id) => requirePlace(id).image).filter((s): s is string => !!s),
  ]),
]

function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-frame">
        <div className="lp-grid lp-footer-grid">
          <div className="lp-cell lp-footer-brand">
            <Wordmark />
            <p className="mt-3 max-w-[34ch] text-body text-ink-muted">The travel planner that turns your saved places into a day-by-day trip that fits your budget, interests and pace.</p>
            <p className="lp-proto-label">Web prototype</p>
          </div>
          <nav aria-label="Page sections" className="lp-cell lp-footer-col">
            <p className="lp-footer-h">On this page</p>
            <ul>{FOOTER_LINKS.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>
          </nav>
          <nav aria-label="Open the app" className="lp-cell lp-footer-col">
            <p className="lp-footer-h">Try Roam</p>
            <ul>
              <li><a href={APP}>Open the web app</a></li>
              <li><a href={SAMPLE}>Bangkok sample trip</a></li>
            </ul>
          </nav>
          <div className="lp-cell lp-footer-base">
            <p>Prices and travel times are estimates. Adjustments are simulated. Nothing is booked.</p>
            <details className="lp-credits">
              <summary>Photo credits</summary>
              <ul>
                {PAGE_PHOTOS.map((src) => {
                  const c = creditFor(src)
                  return c ? (
                    <li key={src}>
                      <a href={c.source} target="_blank" rel="noreferrer">{src.split('/').pop()}</a>: {c.author}, {c.license}, via Wikimedia Commons
                    </li>
                  ) : null
                })}
              </ul>
            </details>
          </div>
        </div>
      </div>
    </footer>
  )
}
