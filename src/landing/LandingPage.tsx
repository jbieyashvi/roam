/*
 * Roam marketing page, shown at the base URL (empty hash) and for in-page anchors.
 * It never reads or writes the person's saved state: CTAs are plain links into the app
 * (`#/discover`, and `#/sample`, which asks before replacing an edited sample).
 */
import { CalendarDays, ChevronDown, Coffee, Menu, Star, Wallet, X, Footprints, MapPin } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { CATEGORY_LABEL } from '../data/catalog'
import { creditFor } from '../data/imageCredits'
import { requirePlace } from '../data/places'
import { formatTHB, plural } from '../lib/format'
import { AdjustDemo } from './AdjustDemo'
import { PhonePreview } from './PhonePreview'
import { Showcase } from './Showcase'
import { Band, CtaLink, Eyebrow, Reveal, SectionHead, SectionLabel, Wordmark } from './parts'
import { DAY_NOTES, SAMPLE_BUDGET, SAMPLE_DATES, SAMPLE_PARTY, SAMPLE_PLAN, scheduleFor, summaryFor } from './sample'
import '../styles/landing.css'
import { asset } from '../lib/asset'

const APP = '#/discover'
const SAMPLE = '#/sample'

const NAV = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#explore', label: 'Explore' },
  { href: '#planner', label: 'The planner' },
]

export function LandingPage() {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prev = document.title
    document.title = 'Roam — a little wander, a real plan'
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
        <HowItWorks />
        <Showcase />
        <AdjustDemo />
        <Explore />
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
            <CtaLink href={APP} className="lp-btn-sm" icon={null}>Plan your trip</CtaLink>
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
              <CtaLink href={APP} className="w-full">Plan your trip</CtaLink>
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}

// ── Hero ───────────────────────────────────────────────────────

function Hero() {
  const summary = summaryFor(SAMPLE_PLAN)
  return (
    <Band label="hero-title" className="lp-hero">
      <Reveal className="lp-cell lp-hero-copy">
        <div>
          <Eyebrow>Trip planning from your saved places</Eyebrow>
          <h1 id="hero-title" className="lp-h1">
            <span>A little wander.</span>
            <span>A real plan.</span>
          </h1>
          <p className="lp-hero-lede">Turn your saved places into a trip that fits your budget, your pace and your curiosity.</p>
          <div className="lp-cta-row">
            <CtaLink href={APP}>Plan your trip</CtaLink>
            <CtaLink href={SAMPLE} tone="secondary" icon={null}>Explore the Bangkok demo</CtaLink>
          </div>
          <p className="lp-note">Try the sample trip. Nothing is booked.</p>
        </div>
        <dl className="lp-strip lp-hero-facts" aria-label="The Bangkok sample trip">
          <div><dt>Sample trip</dt><dd>{plural(SAMPLE_PLAN.brief.days, 'day')} in Bangkok</dd></div>
          <div><dt>Planned</dt><dd>{plural(summary.stopCount, 'stop')}</dd></div>
          <div><dt>Estimate</dt><dd>~{formatTHB(summary.cost.total)} pp</dd></div>
        </dl>
      </Reveal>
      <Reveal className="lp-cell lp-hero-phone" delay={1}>
        <PhonePreview />
      </Reveal>
      <div className="lp-cell lp-hero-photo">
        <img src={asset('/images/bangkok/wat-arun-river.jpg')} alt="Wat Arun seen from the Chao Phraya River at sunset" />
        <p className="lp-edge-caption"><MapPin size={14} aria-hidden /> Bangkok, Thailand</p>
      </div>
    </Band>
  )
}

// ── How it works ───────────────────────────────────────────────

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

function HowItWorks() {
  const cafe = requirePlace('blue-whale')
  const summary = summaryFor(SAMPLE_PLAN)
  return (
    <Band id="how-it-works" label="how-title" className="lp-how">
      <SectionHead n="01" label="How it works" id="how-title" title="All those saved places. Finally, a plan." lede="Three steps, shown with the Bangkok sample trip." />

      <Reveal className="lp-cell lp-step">
        <h3 className="lp-step-n"><span className="lp-step-num">01</span> <span aria-hidden>/</span> Save your places</h3>
        <p className="lp-step-text">Browse Bangkok’s temples, markets, food and cafés and keep the ones you like. Mark the few you won’t skip as must-visits.</p>
        <div className="lp-step-body lp-step-bleed">
          <ul className="lp-saved-grid" aria-label="Saved places in the Bangkok sample">
            {['grand-palace', 'wat-arun', 'wat-pho', 'pak-khlong-talat'].map((id) => <SavedTile key={id} id={id} />)}
          </ul>
          <p className="lp-saved-cafe">
            <Coffee size={18} aria-hidden />
            <span><strong>{cafe.name}</strong> · Café near Wat Pho · {costLabel(cafe.costPerPerson)}</span>
          </p>
        </div>
      </Reveal>

      <Reveal className="lp-cell lp-step" delay={1}>
        <h3 className="lp-step-n"><span className="lp-step-num">02</span> <span aria-hidden>/</span> Set your travel style</h3>
        <p className="lp-step-text">Dates, budget, pace, interests and how you like to get around.</p>
        <div className="lp-step-body">
          <dl className="lp-prefs">
            <div><dt><CalendarDays size={15} aria-hidden /> When</dt><dd>{SAMPLE_DATES} · {SAMPLE_PARTY}</dd></div>
            <div><dt><Wallet size={15} aria-hidden /> Budget</dt><dd>{formatTHB(SAMPLE_BUDGET)} per person</dd></div>
            <div><dt><Footprints size={15} aria-hidden /> Pace</dt><dd><span className="sr-only">Balanced</span><span className="lp-seg" aria-hidden><span>Relaxed</span><span className="is-on">Balanced</span><span>Packed</span></span></dd></div>
            <div><dt><MapPin size={15} aria-hidden /> Getting around</dt><dd>Walk, with taxis for longer hops</dd></div>
          </dl>
          <ul className="lp-interests" aria-label="Interests">
            {['Architecture', 'Food', 'Cafés', 'Markets'].map((i) => <li key={i}>{i}</li>)}
          </ul>
        </div>
      </Reveal>

      <Reveal className="lp-cell lp-step" delay={2}>
        <h3 className="lp-step-n"><span className="lp-step-num">03</span> <span aria-hidden>/</span> Build your itinerary</h3>
        <p className="lp-step-text">Nearby places share a day, in an order that keeps travel short, with lunch and breathing room built in.</p>
        <div className="lp-step-body">
          <ol className="lp-daylist">
            {SAMPLE_PLAN.itinerary.days.map((d, i) => {
              const sch = scheduleFor(SAMPLE_PLAN, i)
              return (
                <li key={i}>
                  <span className="lp-daylist-n">Day {i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{DAY_NOTES[i].title}</span>
                    <span className="block text-small text-ink-muted">{plural(d.placeIds.length, 'stop')} · ~{formatTHB(sch.cost.total)} pp</span>
                  </span>
                </li>
              )
            })}
          </ol>
          <p className="lp-plan-total">
            <span>~{formatTHB(summary.cost.total)} pp</span> estimated, of a {formatTHB(SAMPLE_BUDGET)} budget
          </p>
        </div>
      </Reveal>
    </Band>
  )
}

// ── Explore Bangkok ────────────────────────────────────────────

const STORIES = [
  { key: 'river', src: asset('/images/bangkok/express-boat.jpg'), title: 'On the river', caption: 'Chao Phraya Express boats link the piers along the old town. The cross-river ferry to Wat Arun is a short hop from Wat Pho.', alt: 'A Chao Phraya Express boat crowded with passengers on the river in Bangkok' },
  { key: 'food', src: asset('/images/bangkok/jay-fai.jpg'), title: 'Street food', caption: 'Wok cooking at Raan Jay Fai in the old town. Booking advised.', alt: 'A cook at a flaming wok at Raan Jay Fai' },
  { key: 'flowers', src: asset('/images/bangkok/marigolds.jpg'), title: 'Flower markets', caption: 'Marigold garlands at Pak Khlong Talat, best early in the day.', alt: 'Strings of orange and yellow marigold garlands at Pak Khlong Talat' },
  { key: 'cafes', src: asset('/images/bangkok/gallery-drip.jpg'), title: 'Neighbourhood cafés', caption: 'Pour-overs at Gallery Drip Coffee, a pause between galleries.', alt: 'A barista making pour-over coffee behind the counter at Gallery Drip Coffee' },
]

function Explore() {
  return (
    <Band id="explore" label="explore-title" className="lp-explore">
      <SectionHead n="04" label="Explore Bangkok" id="explore-title" title="Make room for the places you’ll remember." lede="Roam leaves space in each day for the city between the sights." />
      {STORIES.map((s, i) => {
        const credit = creditFor(s.src)
        return (
          <Reveal as="figure" key={s.key} className={`lp-story lp-story-${s.key}`} delay={(i % 2) as 0 | 1}>
            <div className="lp-story-img"><img src={s.src} alt={s.alt} loading="lazy" /></div>
            <figcaption className="lp-story-cap">
              <span className="lp-story-title">{s.title}</span>
              <span className="lp-story-caption">{s.caption}</span>
              {credit && <span className="lp-credit">Photo: {credit.author}, {credit.license}</span>}
            </figcaption>
          </Reveal>
        )
      })}
      <Reveal className="lp-cell lp-story-note" delay={1}>
        <p className="lp-h4">In the Bangkok sample</p>
        <ol className="lp-notelist">
          {DAY_NOTES.map((d, i) => (
            <li key={d.title}><span className="lp-notelist-n">Day {i + 1}</span>{d.title}</li>
          ))}
        </ol>
        <CtaLink href={SAMPLE} tone="secondary" className="lp-btn-sm">Explore the Bangkok demo</CtaLink>
      </Reveal>
    </Band>
  )
}

// ── FAQ ────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'How does Roam build a trip?',
    a: 'You start with places you’ve saved and a short brief: dates, budget, pace, interests and how you like to get around. Roam groups nearby places into days, orders each day to keep travel short, keeps markets for the morning and evening food for the evening where it can, and adds lunch and rest breaks. In this prototype, planning runs on simple rules in your browser.',
  },
  {
    q: 'Can I change the itinerary?',
    a: 'Yes. You can move or remove stops, swap a place, or ask for a change such as less walking, a lower cost, more cafés or a slower day. The suggestions are simulated with rule-based logic, not a live AI model. You see a before-and-after preview first, nothing changes until you apply it, and applied changes can be undone.',
  },
  {
    q: 'Are the prices live?',
    a: 'No. Costs are sample estimates in Thai baht for entry, food and local transport, and opening hours are general notes. Check current prices and hours before you go.',
  },
  {
    q: 'Does Roam book anything?',
    a: 'No. Roam doesn’t book tickets, tables, rides or hotels, and it doesn’t take payment. It’s a planning tool.',
  },
  {
    q: 'Can I try it without an account?',
    a: 'Yes. There are no accounts in this prototype. Saved places and trips are stored only in this browser. The Bangkok sample opens a ready-made three-day trip you can explore and change.',
  },
]

function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  const base = useId()
  return (
    <Band id="faq" label="faq-title" className="lp-faq-grid">
      <Reveal className="lp-cell lp-faq-intro">
        <SectionLabel n="05">Questions</SectionLabel>
        <h2 id="faq-title" className="lp-h2">Good to know.</h2>
        <p className="lp-lede">Roam is an interactive concept prototype. Here’s exactly what it does, and what it doesn’t.</p>
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
        <h2 id="final-title" className="lp-h2 lp-final-h">Your next trip starts with a few saved places.</h2>
        <div className="lp-cta-row">
          <CtaLink href={APP} tone="lime">Plan your trip</CtaLink>
          <CtaLink href={SAMPLE} tone="inverse" icon={null}>Try the Bangkok sample</CtaLink>
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
  { href: '#planner', label: 'The planner' },
  { href: '#adjust', label: 'Adjust a plan' },
  { href: '#explore', label: 'Explore Bangkok' },
  { href: '#faq', label: 'FAQ' },
]

const PAGE_PHOTOS = [
  ...new Set([
    asset('/images/bangkok/wat-arun-river.jpg'),
    ...['grand-palace', 'wat-arun', 'wat-pho', 'pak-khlong-talat'].map((id) => requirePlace(id).image!),
    ...SAMPLE_PLAN.itinerary.days[0].placeIds.map((id) => requirePlace(id).image).filter((s): s is string => !!s),
    ...STORIES.map((s) => s.src), asset('/images/bangkok/chinatown-lantern.jpg'),
  ]),
]

function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-frame">
        <div className="lp-grid lp-footer-grid">
          <div className="lp-cell lp-footer-brand">
            <Wordmark />
            <p className="mt-3 max-w-[34ch] text-body text-ink-muted">Turns the places you save into a day-by-day trip plan that fits your budget and pace.</p>
            <p className="lp-proto-label">Interactive concept prototype</p>
          </div>
          <nav aria-label="Page sections" className="lp-cell lp-footer-col">
            <p className="lp-footer-h">On this page</p>
            <ul>{FOOTER_LINKS.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>
          </nav>
          <nav aria-label="Open the app" className="lp-cell lp-footer-col">
            <p className="lp-footer-h">Try Roam</p>
            <ul>
              <li><a href={APP}>Plan your trip</a></li>
              <li><a href={SAMPLE}>Bangkok sample trip</a></li>
            </ul>
          </nav>
          <div className="lp-cell lp-footer-base">
            <p>Prices are sample estimates. Nothing is booked.</p>
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
