import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { buildScenario } from '../state/demo'
import { STORAGE_KEY, type AppState } from '../state/model'
import { StoreProvider, ToastProvider } from '../state/store'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root
let host: HTMLDivElement

const stored = (): AppState => JSON.parse(localStorage.getItem(STORAGE_KEY)!)
const trip = () => stored().trips.find((t) => t.id === 'demo-bangkok')!
const toast = () => document.querySelector<HTMLElement>('[role=status]')
const text = () => document.body.textContent ?? ''
const wait = (ms = 150) => act(() => new Promise((r) => setTimeout(r, ms))) // reduced motion: 100 ms "processing"

function button(label: string, scope: ParentNode = document) {
  const b = [...scope.querySelectorAll<HTMLButtonElement>('button')].find(
    (el) => el.textContent?.trim().startsWith(label) || el.getAttribute('aria-label') === label,
  )
  if (!b) throw new Error(`No button "${label}"`)
  return b
}
const click = (label: string, scope?: ParentNode) => act(async () => button(label, scope).click())

async function type(value: string) {
  const input = document.querySelector<HTMLInputElement>('#adjust-text')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await click('Preview change')
}

async function mount(hash: string, scenario: Parameters<typeof buildScenario>[0] = 'ready-itinerary') {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(buildScenario(scenario, '2026-10-17T00:00:00.000Z').state))
  window.location.hash = hash
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () =>
    root.render(
      <StoreProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </StoreProvider>,
    ),
  )
}

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia
  Element.prototype.scrollIntoView = vi.fn()
  window.scrollTo = vi.fn()
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  localStorage.clear()
})

describe('AdjustScreen', () => {
  it('previews, applies, returns to the itinerary with Undo, and undoes', async () => {
    await mount('#/trip/demo-bangkok/adjust?day=2')
    const before = trip().itinerary
    await click('More cafés')
    await wait()
    expect(text()).toContain('Proposed change')
    expect(trip().itinerary).toEqual(before) // previewing never changes the trip

    await click('Apply changes')
    expect(window.location.hash).toBe('#/trip/demo-bangkok/itinerary?day=2')
    expect(trip().undo).not.toBeNull()
    expect(toast()?.textContent).toContain('Undo')

    await click('Undo', toast()!)
    expect(trip().undo).toBeNull()
    expect(trip().itinerary).toEqual(before)
    expect(toast()?.textContent).toContain('Change undone')
  })

  it('handles "Make day 2 more relaxed" and keeps every must-visit', async () => {
    await mount('#/trip/demo-bangkok/adjust?day=1')
    const day2Before = trip().itinerary!.days[1].placeIds.length
    await type('Make day 2 more relaxed')
    await wait()
    expect(window.location.hash).toContain('day=2')
    expect(text()).toMatch(/Proposed change\s*·\s*Day 2/)
    await click('Apply changes')
    const t = trip()
    const scheduled = t.itinerary!.days.flatMap((d) => d.placeIds)
    for (const id of t.mustVisit) expect(scheduled).toContain(id)
    expect(t.itinerary!.days[1].placeIds.length).toBeLessThan(day2Before)
  })

  it('"Keep current plan" leaves the trip untouched', async () => {
    await mount('#/trip/demo-bangkok/adjust?day=1')
    const before = trip()
    await click('Lower the cost')
    await wait()
    await click('Keep current plan')
    expect(trip()).toEqual(before)
    expect(window.location.hash).toBe('#/trip/demo-bangkok/itinerary?day=1')
    expect(toast()?.textContent).toContain('No changes made')
  })

  it('explains unsupported requests without changing anything', async () => {
    await mount('#/trip/demo-bangkok/adjust?day=1')
    await type('Book us a hot-air balloon ride')
    await wait()
    expect(text()).toContain('Nothing was booked or changed')
    expect(trip().undo).toBeNull()
  })

  it('surfaces a budget conflict with choices before applying', async () => {
    await mount('#/trip/demo-bangkok/adjust?day=1&request=less-walking', 'budget-conflict')
    await wait()
    expect(text()).toMatch(/budget/i)
    button('Edit budget')
    button('Apply anyway')
    expect(trip().undo).toBeNull()
  })

  it('the itinerary "Undo last change" replaces a stale Undo toast', async () => {
    await mount('#/trip/demo-bangkok/adjust?day=2')
    await click('More cafés')
    await wait()
    await click('Apply changes')
    await click('Undo last change')
    expect(trip().undo).toBeNull()
    expect(toast()?.textContent).toContain('Change undone')
    expect(toast()?.querySelector('button')?.textContent).not.toBe('Undo')
  })
})
