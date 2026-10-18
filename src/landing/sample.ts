/*
 * The Bangkok sample, computed once for the marketing page.
 * Everything here is generated locally from the same fixture and planner the app uses;
 * nothing reads from or writes to the person's saved state.
 */
import { getHotel } from '../data/catalog'
import type { PlanState } from '../domain/adjust'
import { scheduleDay, summarize } from '../domain/planner'
import { formatDateRange, plural } from '../lib/format'
import { DEMO_BRIEF, DEMO_TRIP_NAME, demoTrip } from '../state/demo'

/** A fixed timestamp keeps the sample identical on every visit. */
const SAMPLE = demoTrip('2026-10-01T09:00:00.000Z')

export const SAMPLE_PLAN: PlanState = {
  brief: SAMPLE.brief,
  placeIds: SAMPLE.placeIds,
  mustVisit: SAMPLE.mustVisit,
  itinerary: SAMPLE.itinerary!,
}

export const SAMPLE_NAME = DEMO_TRIP_NAME
export const SAMPLE_DATES = formatDateRange(DEMO_BRIEF.startDate, DEMO_BRIEF.days)
export const SAMPLE_PARTY = plural(DEMO_BRIEF.travellers, 'adult')
export const SAMPLE_HOTEL = getHotel(DEMO_BRIEF.startLocationId)
export const SAMPLE_BUDGET = DEMO_BRIEF.budgetPerPerson ?? 0

export const scheduleFor = (plan: PlanState, day: number) => {
  const d = plan.itinerary.days[day]
  return scheduleDay(d.placeIds, plan.brief, d.pace)
}

export const summaryFor = (plan: PlanState) => summarize(plan.itinerary, plan.brief)

/** Why each sample day is grouped the way it is (matches the generated plan). */
export const DAY_NOTES = [
  {
    title: 'Rattanakosin and the river',
    why: 'The old royal quarter is compact, so the flower market, Grand Palace and Wat Pho sit a short walk or ride apart. The market goes first, in the morning, and a ferry across the river ends the day at Wat Arun.',
  },
  {
    title: 'Chinatown on foot',
    why: 'Song Wat Road, Wat Traimit and Talat Noi link up with short walks. A riverside café breaks the afternoon, and Yaowarat’s street food waits for the evening, when the stalls set up.',
  },
  {
    title: 'Weekend market, then Pathum Wan',
    why: 'Chatuchak only opens at weekends, so it lands on Sunday morning. The afternoon stays in Pathum Wan, with Jim Thompson House, the art centre and Lumphini Park joined by short walks and rides.',
  },
]
