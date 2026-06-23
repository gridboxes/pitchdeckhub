// Stand-in for a real auth backend. The session itself persists across a
// refresh (via sessionStorage) so the dashboard doesn't kick you back to
// login — only explicit sign-out clears it. Decks/members still reset on
// refresh since those live in mockDb.js's in-memory store.

const STORAGE_KEY = 'mock-auth-session'

function readSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeSession(value) {
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {}
}

let session = readSession()
const listeners = new Set()

function notify() {
  listeners.forEach(fn => fn(session))
}

function delay(ms = 400) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const mockAuth = {
  getSession() {
    return Promise.resolve({ data: { session } })
  },

  onAuthStateChange(callback) {
    listeners.add(callback)
    return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } }
  },

  async signInWithPassword({ email, password }) {
    await delay()
    if (!email.trim() || !password.trim()) {
      return { error: { message: 'Enter any email and password to continue.' } }
    }
    session = { user: { email } }
    writeSession(session)
    notify()
    return { error: null }
  },

  async signOut() {
    await delay(150)
    session = null
    writeSession(null)
    notify()
    return { error: null }
  },
}
