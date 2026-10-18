import type { Place } from '../domain/types'
import { asset } from '../lib/asset'

/*
 * Illustrative Bangkok places. Names are real; every duration, price, opening-hours
 * note and coordinate here is a SAMPLE ESTIMATE for a prototype, not verified data.
 * Prices are rough THB figures per person and change often — check before visiting.
 * Coordinates are rough km offsets from a reference point near Wang Burapha
 * (x east, y north), derived from approximate map positions, for a schematic map only.
 * Every place is inside Bangkok; Wat Arun is the only stop on the Thonburi bank.
 */
const img = (name: string) => asset(`/images/bangkok/${name}.jpg`)
const CHECK = 'Check before visiting'

export const PLACES: Place[] = [
  // ── Rattanakosin (the royal island) ──────────────────────────
  {
    id: 'grand-palace', destinationId: 'bangkok', name: 'Grand Palace', category: 'architecture',
    area: 'Rattanakosin, Phra Nakhon', zone: 'rattanakosin', x: -0.94, y: 0.55,
    summary: 'The former royal residence: gilded throne halls and Wat Phra Kaew, home of the Emerald Buddha. A dress code applies.',
    visitMins: 150, costPerPerson: 500, hoursNote: `Daytime, may close for ceremonies · ${CHECK}`, bestTime: 'morning',
    image: img('grand-palace'), tags: ['dress-code', 'photogenic'],
  },
  {
    id: 'wat-pho', destinationId: 'bangkok', name: 'Wat Pho', category: 'architecture',
    area: 'Rattanakosin, Phra Nakhon', zone: 'rattanakosin', x: -0.76, y: 0.17,
    summary: 'A vast temple complex with the 46-metre Reclining Buddha, tiled chedis and a traditional massage school.',
    visitMins: 75, costPerPerson: 300, hoursNote: `Usually open daytime · ${CHECK}`, bestTime: 'any',
    image: img('wat-pho'), tags: ['dress-code', 'photogenic'],
  },
  {
    id: 'wat-arun', destinationId: 'bangkok', name: 'Wat Arun', category: 'architecture',
    area: 'Thonburi riverbank, across from Tha Tien', zone: 'rattanakosin', x: -1.2, y: -0.14, riverSide: 'thonburi',
    summary: 'The Temple of Dawn: a porcelain-studded central prang on the west bank, reached by a short cross-river ferry.',
    visitMins: 60, costPerPerson: 200, hoursNote: `Usually open daytime · ${CHECK}`, bestTime: 'any',
    image: img('wat-arun'), tags: ['riverside', 'photogenic', 'outdoor'],
  },
  {
    id: 'national-museum', destinationId: 'bangkok', name: 'Bangkok National Museum', category: 'architecture',
    area: 'Sanam Luang, Phra Nakhon', zone: 'rattanakosin', x: -0.81, y: 1.38,
    summary: 'Thai art and history set in the halls of the former Front Palace, including the Buddhaisawan Chapel.',
    visitMins: 90, costPerPerson: 200, hoursNote: `Usually closed some weekdays · ${CHECK}`, bestTime: 'any',
    image: img('national-museum'), tags: ['museum', 'indoor'],
  },
  {
    id: 'museum-siam', destinationId: 'bangkok', name: 'Museum Siam', category: 'architecture',
    area: 'Tha Tien, Phra Nakhon', zone: 'rattanakosin', x: -0.65, y: -0.09,
    summary: 'A playful museum about Thai identity inside a restored early-1900s ministry building.',
    visitMins: 75, costPerPerson: 100, hoursNote: `Usually closed Mondays · ${CHECK}`, bestTime: 'afternoon',
    image: img('museum-siam'), tags: ['museum', 'indoor'],
  },
  {
    id: 'pak-khlong-talat', destinationId: 'bangkok', name: 'Pak Khlong Talat', category: 'market',
    area: 'Chak Phet Road, Phra Nakhon', zone: 'rattanakosin', x: -0.32, y: -0.28,
    summary: 'Bangkok’s wholesale flower market: marigold garlands, orchids and lotus buds piled along the river.',
    visitMins: 40, costPerPerson: 0, hoursNote: `Busiest early morning and late night · ${CHECK}`, bestTime: 'morning',
    image: img('pak-khlong-talat'), tags: ['photogenic', 'walking'],
  },
  {
    id: 'blue-whale', destinationId: 'bangkok', name: 'Blue Whale Café', category: 'cafe',
    area: 'Maha Rat Road, near Wat Pho', zone: 'rattanakosin', x: -0.81, y: -0.02,
    summary: 'A small shophouse café known for its butterfly-pea blue lattes, a short walk from Wat Pho.',
    visitMins: 40, costPerPerson: 160, hoursNote: CHECK, bestTime: 'afternoon',
    tags: ['indoor'],
  },

  // ── Old town (Sao Ching Cha & Golden Mount) ──────────────────
  {
    id: 'wat-saket', destinationId: 'bangkok', name: 'Wat Saket (Golden Mount)', category: 'architecture',
    area: 'Golden Mount, Pom Prap', zone: 'old-town', x: 0.71, y: 0.96,
    summary: 'A gilded chedi on an artificial hill; around 300 steps lead to wide views over the old town.',
    visitMins: 60, costPerPerson: 100, hoursNote: `Usually open daytime · ${CHECK}`, bestTime: 'afternoon',
    image: img('wat-saket'), tags: ['views', 'outdoor', 'stairs'],
  },
  {
    id: 'wat-suthat', destinationId: 'bangkok', name: 'Wat Suthat & Giant Swing', category: 'architecture',
    area: 'Sao Ching Cha, Phra Nakhon', zone: 'old-town', x: 0.12, y: 0.71,
    summary: 'A royal temple with some of Bangkok’s finest murals, facing the tall red frame of the Giant Swing.',
    visitMins: 45, costPerPerson: 100, hoursNote: `Usually open daytime · ${CHECK}`, bestTime: 'any',
    image: img('giant-swing'), tags: ['photogenic'],
  },
  {
    id: 'loha-prasat', destinationId: 'bangkok', name: 'Loha Prasat (Wat Ratchanatdaram)', category: 'architecture',
    area: 'Maha Chai Road, Phra Nakhon', zone: 'old-town', x: 0.44, y: 1.06,
    summary: 'A tiered “metal castle” of 37 spires, the only one of its kind still standing. We have no hours or price estimate for it.',
    visitMins: 40, costPerPerson: null, hoursNote: null, bestTime: 'any',
    image: img('loha-prasat'), tags: [],
  },
  {
    id: 'thipsamai', destinationId: 'bangkok', name: 'Thipsamai Pad Thai', category: 'food',
    area: 'Maha Chai Road, Phra Nakhon', zone: 'old-town', x: 0.53, y: 0.85,
    summary: 'A long-running pad thai shop cooking over charcoal; queues are usual in the evening.',
    visitMins: 45, costPerPerson: 150, hoursNote: `Usually opens late afternoon · ${CHECK}`, bestTime: 'evening',
    image: img('thipsamai'), tags: ['queue'],
  },
  {
    id: 'jay-fai', destinationId: 'bangkok', name: 'Raan Jay Fai', category: 'food',
    area: 'Maha Chai Road, Phra Nakhon', zone: 'old-town', x: 0.49, y: 0.81,
    summary: 'A famous wok-fired street kitchen known for crab omelettes. A splurge; bookings or long waits are common.',
    visitMins: 75, costPerPerson: 1200, hoursNote: `Limited days, booking advised · ${CHECK}`, bestTime: 'evening',
    image: img('jay-fai'), tags: ['splurge', 'booking'],
  },
  {
    id: 'kope-hya-tai-kee', destinationId: 'bangkok', name: 'Kope Hya Tai Kee', category: 'cafe',
    area: 'Sao Ching Cha, Phra Nakhon', zone: 'old-town', x: -0.05, y: 0.8,
    summary: 'An old-style Hainanese coffee shop serving kopi, kaya toast and eggs for breakfast.',
    visitMins: 40, costPerPerson: 120, hoursNote: `Mornings to mid-afternoon · ${CHECK}`, bestTime: 'morning',
    tags: ['breakfast'],
  },

  // ── Chinatown, Talat Noi & Charoen Krung ─────────────────────
  {
    id: 'yaowarat', destinationId: 'bangkok', name: 'Yaowarat Road street food', category: 'food',
    area: 'Yaowarat, Samphanthawong', zone: 'chinatown', x: 1.03, y: -0.5,
    summary: 'Chinatown’s main road after dark: neon signs, seafood stalls, noodles and desserts along the pavement.',
    visitMins: 90, costPerPerson: 350, hoursNote: `Stalls set up in the evening · ${CHECK}`, bestTime: 'evening',
    image: img('yaowarat-night'), tags: ['walking', 'outdoor', 'night'],
  },
  {
    id: 'nai-ek', destinationId: 'bangkok', name: 'Nai Ek Roll Noodles', category: 'food',
    area: 'Yaowarat Soi 9, Samphanthawong', zone: 'chinatown', x: 0.84, y: -0.38,
    summary: 'Peppery rolled rice-noodle soup with crispy pork, a quick Chinatown lunch.',
    visitMins: 40, costPerPerson: 100, hoursNote: CHECK, bestTime: 'midday',
    tags: [],
  },
  {
    id: 'pa-tong-go', destinationId: 'bangkok', name: 'Pa Tong Go Savoey', category: 'cafe',
    area: 'Yaowarat, Samphanthawong', zone: 'chinatown', x: 1.05, y: -0.46,
    summary: 'Fried dough sticks with pandan custard and Thai iced tea, eaten at small tables in Chinatown.',
    visitMins: 30, costPerPerson: 80, hoursNote: CHECK, bestTime: 'afternoon',
    tags: [],
  },
  {
    id: 'wat-traimit', destinationId: 'bangkok', name: 'Wat Traimit', category: 'architecture',
    area: 'Chinatown gate, Samphanthawong', zone: 'chinatown', x: 1.47, y: -0.81,
    summary: 'Home of the Golden Buddha, a five-tonne gold statue found under plaster in the 1950s.',
    visitMins: 45, costPerPerson: 100, hoursNote: `Usually open daytime · ${CHECK}`, bestTime: 'any',
    image: img('wat-traimit'), tags: [],
  },
  {
    id: 'talat-noi', destinationId: 'bangkok', name: 'Talat Noi', category: 'architecture',
    area: 'Talat Noi, Samphanthawong', zone: 'chinatown', x: 1.4, y: -1.44,
    summary: 'A riverside quarter of Chinese shrines, old shophouses, mechanics’ workshops and street art.',
    visitMins: 75, costPerPerson: 0, hoursNote: 'Neighbourhood · shops keep their own hours', bestTime: 'any',
    image: img('talat-noi'), tags: ['walking', 'outdoor', 'street-art'],
  },
  {
    id: 'hong-sieng-kong', destinationId: 'bangkok', name: 'Hong Sieng Kong', category: 'cafe',
    area: 'Talat Noi riverside', zone: 'chinatown', x: 1.17, y: -1.33,
    summary: 'A café inside a restored Chinese trading house on the Chao Phraya, with a river-view courtyard.',
    visitMins: 45, costPerPerson: 180, hoursNote: CHECK, bestTime: 'afternoon',
    tags: ['riverside'],
  },
  {
    id: 'mother-roaster', destinationId: 'bangkok', name: 'Mother Roaster', category: 'cafe',
    area: 'Talat Noi, upstairs in a car-parts workshop', zone: 'chinatown', x: 1.44, y: -1.48,
    summary: 'A specialty coffee bar hidden above a garage in Talat Noi, known for its pour-overs.',
    visitMins: 40, costPerPerson: 180, hoursNote: CHECK, bestTime: 'morning',
    tags: [],
  },
  {
    id: 'song-wat', destinationId: 'bangkok', name: 'Song Wat Road', category: 'market',
    area: 'Song Wat, Samphanthawong', zone: 'chinatown', x: 0.54, y: -0.72,
    summary: 'A heritage trading street of spice and dried-goods wholesalers mixed with small galleries and cafés.',
    visitMins: 60, costPerPerson: 0, hoursNote: 'Street · shops keep their own hours', bestTime: 'any',
    image: img('song-wat'), tags: ['walking', 'outdoor'],
  },
  {
    id: 'sampeng', destinationId: 'bangkok', name: 'Sampeng Lane', category: 'market',
    area: 'Sampheng, Samphanthawong', zone: 'chinatown', x: 0.32, y: -0.24,
    summary: 'A narrow, crowded wholesale lane of beads, toys, fabric and kitchenware. Browsing only — shopping isn’t in the budget.',
    visitMins: 50, costPerPerson: 0, hoursNote: `Busiest in the morning · ${CHECK}`, bestTime: 'morning',
    image: img('sampeng'), tags: ['shopping-excluded', 'walking'],
  },
  {
    id: 'sarnies', destinationId: 'bangkok', name: 'Sarnies Bangkok', category: 'cafe',
    area: 'Charoen Krung Soi 44, Bang Rak', zone: 'chinatown', x: 1.54, y: -2.32,
    summary: 'All-day café in a 150-year-old shophouse on Charoen Krung, good for a late breakfast.',
    visitMins: 50, costPerPerson: 260, hoursNote: CHECK, bestTime: 'morning',
    tags: [],
  },

  // ── Pathum Wan & the parks ───────────────────────────────────
  {
    id: 'jim-thompson', destinationId: 'bangkok', name: 'Jim Thompson House', category: 'architecture',
    area: 'Soi Kasem San 2, Pathum Wan', zone: 'pathum-wan', x: 3.06, y: 0.48,
    summary: 'Six traditional teak houses joined into a museum home, with a garden on Khlong Saen Saep. Visits are by guided tour.',
    visitMins: 75, costPerPerson: 200, hoursNote: `Guided tours through the day · ${CHECK}`, bestTime: 'any',
    image: img('jim-thompson'), tags: ['museum'],
  },
  {
    id: 'bacc', destinationId: 'bangkok', name: 'Bangkok Art and Culture Centre', category: 'architecture',
    area: 'National Stadium, Pathum Wan', zone: 'pathum-wan', x: 3.26, y: 0.18,
    summary: 'A white spiralling gallery building with rotating contemporary shows; main galleries are usually free.',
    visitMins: 75, costPerPerson: 0, hoursNote: `Usually closed Mondays · ${CHECK}`, bestTime: 'afternoon',
    image: img('bacc'), tags: ['museum', 'indoor', 'free'],
  },
  {
    id: 'gallery-drip', destinationId: 'bangkok', name: 'Gallery Drip Coffee', category: 'cafe',
    area: 'Inside BACC, Pathum Wan', zone: 'pathum-wan', x: 3.27, y: 0.19,
    summary: 'A hand-drip coffee counter on the ground floor of the art centre.',
    visitMins: 35, costPerPerson: 120, hoursNote: CHECK, bestTime: 'afternoon',
    image: img('gallery-drip'), tags: ['indoor'],
  },
  {
    id: 'som-tam-nua', destinationId: 'bangkok', name: 'Som Tam Nua', category: 'food',
    area: 'Siam Square, Pathum Wan', zone: 'pathum-wan', x: 3.63, y: -0.01,
    summary: 'Papaya salad, grilled chicken and sticky rice in Siam Square — a popular, casual lunch.',
    visitMins: 50, costPerPerson: 250, hoursNote: CHECK, bestTime: 'midday',
    tags: [],
  },
  {
    id: 'lumphini', destinationId: 'bangkok', name: 'Lumphini Park', category: 'park',
    area: 'Rama IV Road, Pathum Wan', zone: 'pathum-wan', x: 4.47, y: -1.5,
    summary: 'Central Bangkok’s big green space: a lake, shady paths and monitor lizards; cooler in the late afternoon.',
    visitMins: 60, costPerPerson: 0, hoursNote: `Usually open early to evening · ${CHECK}`, bestTime: 'afternoon',
    image: img('lumphini'), tags: ['outdoor', 'walking', 'green'],
  },
  {
    id: 'benjakitti', destinationId: 'bangkok', name: 'Benjakitti Forest Park', category: 'park',
    area: 'Ratchadaphisek Road, Khlong Toei', zone: 'pathum-wan', x: 6.37, y: -1.77,
    summary: 'A newer wetland park with raised skywalks over ponds and planted forest, beside the old tobacco warehouses.',
    visitMins: 60, costPerPerson: 0, hoursNote: `Usually open early to evening · ${CHECK}`, bestTime: 'afternoon',
    image: img('benjakitti'), tags: ['outdoor', 'walking', 'green', 'views'],
  },

  // ── North: Chatuchak & Dusit ─────────────────────────────────
  {
    id: 'chatuchak', destinationId: 'bangkok', name: 'Chatuchak Weekend Market', category: 'market',
    area: 'Kamphaeng Phet 2 Road, Chatuchak', zone: 'chatuchak', x: 5.4, y: 6.07, openDays: [0, 6],
    summary: 'Thousands of stalls of clothes, plants, ceramics and snacks. Weekends only; browsing only — shopping isn’t in the budget.',
    visitMins: 150, costPerPerson: 0, hoursNote: `Weekends only · ${CHECK}`, bestTime: 'morning',
    image: img('chatuchak'), tags: ['shopping-excluded', 'walking', 'weekend-only'],
  },
  {
    id: 'or-tor-kor', destinationId: 'bangkok', name: 'Or Tor Kor Market', category: 'market',
    area: 'Kamphaeng Phet Road, Chatuchak', zone: 'chatuchak', x: 5.16, y: 5.87,
    summary: 'A tidy fresh market for fruit, curry pastes and ready-made dishes, across the road from Chatuchak.',
    visitMins: 60, costPerPerson: 200, hoursNote: `Usually open daily · ${CHECK}`, bestTime: 'midday',
    tags: ['indoor'],
  },
  {
    id: 'wat-benchamabophit', destinationId: 'bangkok', name: 'Wat Benchamabophit', category: 'architecture',
    area: 'Dusit', zone: 'dusit', x: 1.53, y: 2.39,
    summary: 'The “Marble Temple”: an ordination hall clad in Italian marble, with a cloister of Buddha images.',
    visitMins: 45, costPerPerson: 50, hoursNote: `Usually open daytime · ${CHECK}`, bestTime: 'morning',
    image: img('wat-benchamabophit'), tags: ['photogenic'],
  },
]

export const getPlace = (id: string) => PLACES.find((p) => p.id === id)
export function requirePlace(id: string): Place {
  const p = getPlace(id)
  if (!p) throw new Error(`Unknown place: ${id}`)
  return p
}
