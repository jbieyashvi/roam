import type { Category, Collection, Destination, Hotel, Interest } from '../domain/types'
import { asset } from '../lib/asset'

const img = (name: string) => asset(`/images/bangkok/${name}.jpg`)
const UNAVAILABLE = 'Inspiration only — planning isn’t available for this destination in the demo.'

export const DESTINATIONS: Destination[] = [
  {
    id: 'bangkok', name: 'Bangkok', region: 'Thailand', supported: true,
    intro: 'Riverside temples, Chinatown street food, shophouse cafés and busy markets — plenty for a three-day city break.',
    image: img('express-boat'),
  },
  {
    id: 'chiang-mai', name: 'Chiang Mai', region: 'Northern Thailand', supported: false,
    intro: 'A moated old city and hill temples.', image: img('chiang-mai'), unsupportedNote: UNAVAILABLE,
  },
  {
    id: 'ayutthaya', name: 'Ayutthaya', region: 'Central Thailand', supported: false,
    intro: 'Ruins of the old royal capital.', image: img('ayutthaya'), unsupportedNote: UNAVAILABLE,
  },
  {
    id: 'phuket', name: 'Phuket Old Town', region: 'Southern Thailand', supported: false,
    intro: 'Sino-Portuguese shophouse streets.', image: img('phuket'), unsupportedNote: UNAVAILABLE,
  },
  { id: 'lisbon', name: 'Lisbon', region: 'Portugal', supported: false, intro: 'Hills, tiles and viewpoints.', image: asset('/images/lisbon.jpg'), unsupportedNote: UNAVAILABLE },
  { id: 'kyoto', name: 'Kyoto', region: 'Japan', supported: false, intro: 'Temples, gardens and craft.', image: asset('/images/kyoto.jpg'), unsupportedNote: UNAVAILABLE },
]

export const COLLECTIONS: Collection[] = [
  {
    id: 'bangkok-temples', destinationId: 'bangkok', title: 'Temples & old Bangkok', interest: 'architecture',
    blurb: 'Royal temples, a palace, museums and teak houses.',
    placeIds: ['grand-palace', 'wat-pho', 'wat-arun', 'wat-saket', 'wat-suthat', 'loha-prasat', 'wat-traimit', 'wat-benchamabophit', 'national-museum', 'jim-thompson'],
    image: img('wat-phra-kaew'),
  },
  {
    id: 'bangkok-food', destinationId: 'bangkok', title: 'Street food, old and famous', interest: 'food',
    blurb: 'Chinatown at night, charcoal pad thai and a wok-fired splurge.',
    placeIds: ['yaowarat', 'nai-ek', 'thipsamai', 'jay-fai', 'som-tam-nua'],
    image: img('yaowarat-road'),
  },
  {
    id: 'bangkok-cafes', destinationId: 'bangkok', title: 'Shophouse cafés', interest: 'cafes',
    blurb: 'Hainanese kopi, river courtyards and hand-drip coffee.',
    placeIds: ['kope-hya-tai-kee', 'blue-whale', 'pa-tong-go', 'hong-sieng-kong', 'mother-roaster', 'sarnies', 'gallery-drip'],
    image: img('gallery-drip'),
  },
  {
    id: 'bangkok-markets', destinationId: 'bangkok', title: 'Markets & trading streets', interest: 'markets',
    blurb: 'Flowers by the river, spice wholesalers and the weekend market.',
    placeIds: ['pak-khlong-talat', 'song-wat', 'sampeng', 'or-tor-kor', 'chatuchak'],
    image: img('marigolds'),
  },
  {
    id: 'bangkok-green', destinationId: 'bangkok', title: 'Green breathers', interest: null,
    blurb: 'Two city parks for a slower, shadier afternoon.',
    placeIds: ['lumphini', 'benjakitti', 'bacc', 'gallery-drip'],
    image: img('benjakitti-park'),
  },
  {
    id: 'bangkok-riverside', destinationId: 'bangkok', title: 'Along the Chao Phraya', interest: null,
    blurb: 'Temples on both banks and a riverside old quarter.',
    placeIds: ['wat-arun', 'wat-pho', 'museum-siam', 'pak-khlong-talat', 'talat-noi', 'hong-sieng-kong'],
    image: img('talat-noi-shrine'),
  },
]

/** Fictional hotels: they mark where each day starts and ends. */
export const HOTELS: Hotel[] = [
  { id: 'lantern-yard', destinationId: 'bangkok', name: 'Lantern Yard Hotel (fictional)', area: 'Wang Burapha, central Bangkok', x: 0.65, y: -0.06, fictional: true },
  { id: 'riverside-teak', destinationId: 'bangkok', name: 'Riverside Teak House (fictional)', area: 'Tha Tien, near Wat Pho', x: -0.7, y: 0.05, fictional: true },
]

export const DEFAULT_HOTEL_ID = 'lantern-yard'

export const getHotel = (id: string) => HOTELS.find((h) => h.id === id) ?? HOTELS[0]
export const getDestination = (id: string) => DESTINATIONS.find((d) => d.id === id)
export const getCollection = (id: string) => COLLECTIONS.find((c) => c.id === id)

export const INTERESTS: { id: Interest; label: string; category: Category }[] = [
  { id: 'architecture', label: 'Architecture', category: 'architecture' },
  { id: 'food', label: 'Local food', category: 'food' },
  { id: 'cafes', label: 'Cafés', category: 'cafe' },
  { id: 'markets', label: 'Markets', category: 'market' },
]

export const CATEGORY_LABEL: Record<Category, string> = {
  architecture: 'Architecture',
  food: 'Local food',
  cafe: 'Café',
  market: 'Market',
  park: 'Green space',
}

/** The trip interest a category belongs to; parks belong to none. */
export const interestForCategory = (c: Category): Interest | null =>
  INTERESTS.find((i) => i.category === c)?.id ?? null

/** Explicit demo share links. Anything else is reported as unrecognised. */
export const DEMO_LINKS: Record<string, string> = {
  'https://www.instagram.com/p/roam-demo-wat-arun': 'wat-arun',
  'https://roam.example/p/talat-noi-walk': 'talat-noi',
  'https://maps.example.com/place/hong-sieng-kong-bangkok': 'hong-sieng-kong',
  'https://blog.example.com/bangkok/golden-mount-guide': 'wat-saket',
}

/** Default "seed" inspiration so Discover has a saved preview on first launch. */
export const SEED_SAVED = [
  'grand-palace', 'wat-pho', 'wat-arun', 'wat-saket', 'talat-noi', 'jim-thompson',
  'yaowarat', 'thipsamai', 'pak-khlong-talat', 'song-wat', 'hong-sieng-kong', 'gallery-drip',
]
