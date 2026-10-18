/*
 * The earlier Jaipur sample (state version 1). It is no longer browsable or plannable;
 * these names only let archived Jaipur trips from older saves be listed and read.
 */
export const LEGACY_DESTINATION = { id: 'jaipur', name: 'Jaipur' }

export const LEGACY_PLACE_NAMES: Record<string, string> = {
  'hawa-mahal': 'Hawa Mahal',
  'city-palace': 'City Palace',
  'jantar-mantar': 'Jantar Mantar',
  'albert-hall': 'Albert Hall Museum',
  'raj-mandir': 'Raj Mandir Cinema',
  'birla-mandir': 'Birla Mandir',
  'patrika-gate': 'Patrika Gate',
  'amer-fort': 'Amer Fort',
  'panna-meena': 'Panna Meena ka Kund',
  'anokhi-museum': 'Anokhi Museum of Hand Printing',
  'jal-mahal': 'Jal Mahal viewpoint',
  'nahargarh': 'Nahargarh Fort',
  'jaigarh': 'Jaigarh Fort',
  'galta-ji': 'Galta Ji',
  'lmb': 'Laxmi Misthan Bhandar (LMB)',
  'rawat': 'Rawat Mishthan Bhandar',
  'masala-chowk': 'Masala Chowk',
  'niros': 'Niro’s',
  '1135-ad': '1135 AD',
  'wind-view': 'Wind View Café',
  'baradari': 'Baradari',
  'anokhi-cafe': 'Anokhi Café',
  'tapri': 'Tapri Central',
  'curious-life': 'Curious Life Coffee Roasters',
  'johari-bazaar': 'Johari Bazaar',
  'bapu-bazaar': 'Bapu Bazaar',
  'tripolia-bazaar': 'Tripolia Bazaar',
  'chandpole-bazaar': 'Chandpole Bazaar',
}

/** Trip id the Jaipur sample used. Old links to it get a recovery screen. */
export const LEGACY_DEMO_TRIP_ID = 'demo-jaipur'
