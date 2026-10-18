import { Signal, Wifi, BatteryFull } from 'lucide-react'
import { useEffect, useRef, type ReactElement } from 'react'
import { BottomNav, ToastHost, type NavId } from './components/controls'
import { isLandingPath, useRoute, type Route } from './lib/router'
import { LandingPage } from './landing/LandingPage'
import { useToast } from './state/store'
import { DemoMenuScreen, ProfileScreen, TripsScreen } from './screens/account'
import { CollectionScreen, DiscoverScreen, NotFound, SavedScreen } from './screens/browse'
import { AdjustScreen } from './screens/AdjustScreen'
import { ItineraryScreen } from './screens/ItineraryScreen'
import { ReviewPlacesScreen } from './screens/ReviewPlacesScreen'
import { TripBriefScreen } from './screens/TripBriefScreen'
import { TripOverviewScreen } from './screens/TripOverviewScreen'
import { SampleScreen } from './screens/sample'

type Offset = 'none' | 'action' | 'nav' | 'nav-action'
interface Resolved {
  screen: ReactElement
  nav: NavId | null
  /** Hide the bottom nav on focused task flows. */
  showNav: boolean
  toast: Offset
}

function resolve(parts: string[]): Resolved {
  const [a, b, c] = parts
  const tab = (screen: ReactElement, nav: NavId, toast: Offset = 'nav'): Resolved => ({ screen, nav, showNav: true, toast })
  const task = (screen: ReactElement, toast: Offset = 'action'): Resolved => ({ screen, nav: null, showNav: false, toast })
  switch (a) {
    case 'discover':
      return tab(<DiscoverScreen />, 'discover')
    case 'saved':
      return tab(<SavedScreen />, 'saved', 'nav-action')
    case 'trips':
      return tab(<TripsScreen />, 'trips')
    case 'profile':
      return tab(<ProfileScreen />, 'profile')
    case 'demo':
      return task(<DemoMenuScreen />, 'none')
    case 'sample':
      return task(<SampleScreen />, 'none')
    case 'destination':
    case 'collection':
      if (b) return tab(<CollectionScreen key={`${a}-${b}`} kind={a} id={b} />, 'discover', 'nav-action')
      break
    case 'trip':
      if (!b) break
      if (!c) return task(<TripOverviewScreen tripId={b} />)
      if (c === 'brief') return task(<TripBriefScreen key={b} tripId={b} />)
      if (c === 'places') return task(<ReviewPlacesScreen key={b} tripId={b} />)
      if (c === 'itinerary') return task(<ItineraryScreen key={b} tripId={b} />)
      if (c === 'adjust') return task(<AdjustScreen key={b} tripId={b} />)
      break
  }
  return { screen: <NotFound />, nav: null, showNav: true, toast: 'nav' }
}

export function App() {
  const route = useRoute()
  return isLandingPath(route.path) ? <LandingPage /> : <AppShell route={route} />
}

function AppShell({ route: { path, parts } }: { route: Route }) {
  const r = resolve(parts)
  const main = useRef<HTMLElement>(null)
  const lastPath = useRef(path)
  const { toast, dismiss } = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  // Arriving from the landing page: start the app at the top, not at the page's scroll position.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Move focus to the new screen's heading on navigation (not on query-only changes).
  useEffect(() => {
    if (lastPath.current === path) return
    lastPath.current = path
    if (main.current) main.current.scrollTop = 0
    // An Undo belongs to the screen it was raised for (which may be the one we just arrived on).
    const t = toastRef.current
    if (t?.action && t.path !== path) dismiss()
    const h = main.current?.querySelector<HTMLElement>('h1') ?? main.current
    if (!h) return
    if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1')
    h.focus({ preventScroll: true })
  }, [path, dismiss])

  return (
    <div className="app-shell" data-screen={parts[0] === 'trip' ? (parts[2] || 'overview') : parts[0]}>
      <div className="device-status" aria-hidden="true"><span>9:41</span><span className="device-notch" /><span className="device-signal"><Signal size={15} /><Wifi size={15} /><BatteryFull size={21} /></span></div>
      <a href="#main" onClick={(e) => { e.preventDefault(); main.current?.focus() }} className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-control focus:bg-surface focus:p-3">
        Skip to content
      </a>
      <main id="main" ref={main} tabIndex={-1} className="outline-none">
        {r.screen}
      </main>
      {r.showNav && <BottomNav active={r.nav} />}
      <ToastHost offset={r.toast} />
      <div className="device-home" aria-hidden="true" />
    </div>
  )
}
