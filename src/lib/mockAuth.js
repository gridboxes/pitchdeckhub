// Stand-in for a real auth backend. Session lives only in memory, so a page
// refresh always lands back on the login screen — there's nothing to persist.

let session = null
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
    notify()
    return { error: null }
  },

  async signOut() {
    await delay(150)
    session = null
    notify()
    return { error: null }
  },
}
