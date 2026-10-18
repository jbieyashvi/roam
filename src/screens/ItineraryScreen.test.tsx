import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastHost } from '../components/controls'
import { buildScenario } from '../state/demo'
import { STORAGE_KEY, type AppState } from '../state/model'
import { StoreProvider, ToastProvider } from '../state/store'
import { ItineraryScreen } from './ItineraryScreen'

// Lets React know act() is in use outside a test renderer.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root
let host: HTMLDivElement

const stored = (): AppState => JSON.parse(localStorage.getItem(STORAGE_KEY)!)
const trip = () => stored().trips[0]
const dialog = () => document.querySelector<HTMLElement>('[role=dialog]')
const toastText = () => document.querySelector('[role=status]')?.textContent ?? ''

function button(label: string, scope: ParentNode = document) {
  const b = [...scope.querySelectorAll<HTMLButtonElement>('button')].find((el) => el.textContent?.trim().startsWith(label))
  if (!b) throw new Error(`No button "${label}"`)
  return b
}

async function click(label: string, scope?: ParentNode) {
  await act(async () => button(label, scope).click())
}

beforeEach(async () => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia
  Element.prototype.scrollIntoView = vi.fn()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(buildScenario('ready-itinerary', '2026-10-17T00:00:00.000Z').state))
  window.location.hash = '#/trip/demo-bangkok/itinerary'
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () =>
    root.render(
      <StoreProvider>
        <ToastProvider>
          <ItineraryScreen tripId="demo-bangkok" />
          <ToastHost offset="action" />
        </ToastProvider>
      </StoreProvider>,
    ),
  )
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  localStorage.clear()
})

describe('ItineraryScreen', () => {
  it('confirms a swap from the place sheet without crashing, then undoes it', async () => {
    // Must-visits can't be swapped, so use the first optional stop.
    const day1 = trip().itinerary!.days[0].placeIds
    const first = day1.find((id) => !trip().mustVisit.includes(id))!
    const index = day1.indexOf(first)
    await act(async () => document.querySelector<HTMLElement>(`#stop-${first} button`)!.click())
    await click('Swap', dialog()!)
    const swapList = [...dialog()!.querySelectorAll('fieldset')].find((f) => f.querySelector('legend')?.textContent?.startsWith('Swap for'))!
    const alt = swapList.querySelector<HTMLButtonElement>('button')!
    await act(async () => alt.click())
    await click('Confirm swap', dialog()!)

    expect(dialog()).toBeNull()
    expect(trip().itinerary!.unscheduled).toContain(first)
    expect(trip().undo?.label).toMatch(/^Swapped /)

    await click('Undo', document.querySelector('[role=status]')!)
    expect(trip().itinerary!.days[0].placeIds[index]).toBe(first)
    expect(toastText()).toContain('Change undone')
  })

  it('opens the Adjust workspace for the selected day', async () => {
    await click('Day 2')
    await click('Adjust plan')
    expect(window.location.hash).toBe('#/trip/demo-bangkok/adjust?day=2')
    expect(trip().undo).toBeNull() // nothing changes until a proposal is applied
  })

  it('redirects legacy ?adjust= links to the Adjust route', async () => {
    await act(async () => { window.location.hash = '#/trip/demo-bangkok/itinerary?adjust=more-cafes&day=2' })
    expect(window.location.hash).toBe('#/trip/demo-bangkok/adjust?day=2&request=more-cafes')
  })
})
