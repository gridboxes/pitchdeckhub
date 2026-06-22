import { createContext, useContext, useEffect, useState } from 'react'
import { mockAuth } from '../lib/mockAuth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    mockAuth.getSession().then(({ data }) => setSession(data.session))

    const { data: { subscription } } = mockAuth.onAuthStateChange(session => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, loading: session === undefined }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
