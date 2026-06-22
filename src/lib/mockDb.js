// In-memory stand-in for the Supabase tables. All state lives in module
// scope, so it resets the moment the page refreshes — fine for a portfolio
// demo where nothing needs to persist.

function uid() {
  return crypto.randomUUID()
}

function delay(ms = 350) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

let members = [
  { id: uid(), name: 'Avery Chen', color: '{"c":"#3b82f6","grad":0.55,"ang":135,"sp":18}', pattern: 'solid', pin: '1234' },
  { id: uid(), name: 'Jordan Lee', color: '{"c":"#f59e0b","grad":0.4,"ang":120,"sp":0}', pattern: 'solid', pin: '1234' },
  { id: uid(), name: 'Priya Nair', color: '{"c":"#10b981","grad":0.5,"ang":150,"sp":24}', pattern: 'solid', pin: '1234' },
  { id: uid(), name: 'Sam Rivera', color: '{"c":"#ec4899","grad":0.45,"ang":140,"sp":12}', pattern: 'solid', pin: '1234' },
]

let decks = [
  {
    id: uid(),
    client_name: 'Northwind Robotics',
    slug: 'NORTHWIND-ROBOTICS',
    deck_url: 'https://stripe.com',
    alt_deck_url: null,
    date_added: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    member_ids: [members[0].id, members[2].id],
  },
  {
    id: uid(),
    client_name: 'Lumen Health',
    slug: 'LUMEN-HEALTH',
    deck_url: 'https://notion.so',
    alt_deck_url: null,
    date_added: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
    member_ids: [members[1].id],
  },
  {
    id: uid(),
    client_name: 'Glacier Logistics',
    slug: 'GLACIER-LOGISTICS',
    deck_url: 'https://linear.app',
    alt_deck_url: 'https://figma.com',
    date_added: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21).toISOString(),
    member_ids: [members[3].id, members[0].id],
  },
  {
    id: uid(),
    client_name: 'Solace Energy',
    slug: 'SOLACE-ENERGY',
    deck_url: 'https://framer.com',
    alt_deck_url: null,
    date_added: new Date(Date.now() - 1000 * 60 * 60 * 24 * 35).toISOString(),
    member_ids: [members[2].id],
  },
]

export async function listDecks() {
  await delay()
  return [...decks].sort((a, b) => new Date(b.date_added) - new Date(a.date_added))
}

export async function listMembers() {
  await delay(200)
  return [...members].sort((a, b) => a.name.localeCompare(b.name))
}

export async function getDeckBySlug(slug) {
  await delay(200)
  return decks.find(d => d.slug === slug) || null
}

export async function createDeck(payload) {
  await delay()
  if (decks.some(d => d.slug === payload.slug)) {
    return { error: { message: `duplicate key value violates unique constraint "decks_slug_key"` } }
  }
  const deck = { id: uid(), date_added: new Date().toISOString(), ...payload }
  decks = [deck, ...decks]
  return { data: deck }
}

export async function updateDeck(id, payload) {
  await delay()
  if (decks.some(d => d.id !== id && d.slug === payload.slug)) {
    return { error: { message: `duplicate key value violates unique constraint "decks_slug_key"` } }
  }
  let updated = null
  decks = decks.map(d => {
    if (d.id !== id) return d
    updated = { ...d, ...payload }
    return updated
  })
  return { data: updated }
}

export async function deleteDeckById(id) {
  await delay(250)
  decks = decks.filter(d => d.id !== id)
}

export async function removeMemberFromDecks(memberId, deckIds) {
  await delay(150)
  decks = decks.map(d =>
    deckIds.includes(d.id) ? { ...d, member_ids: d.member_ids.filter(id => id !== memberId) } : d
  )
}

export async function createMember(payload) {
  await delay(250)
  const member = { id: uid(), ...payload }
  members = [...members, member]
  return { data: member }
}

export async function updateMember(id, payload) {
  await delay(250)
  let updated = null
  members = members.map(m => {
    if (m.id !== id) return m
    updated = { ...m, ...payload }
    return updated
  })
  return { data: updated }
}

export async function deleteMemberById(id) {
  await delay(250)
  members = members.filter(m => m.id !== id)
}
