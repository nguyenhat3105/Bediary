import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '../api/api'
import { persistLogin, setUnauthorizedHandler } from '../api/client'
import { clearSession, getStoredUser, getToken, setStoredUser, setToken } from './storage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [booting, setBooting] = useState(true)
  const [user, setUser] = useState(null)
  const [token, setTokenState] = useState(null)

  useEffect(() => {
    async function boot() {
      const [storedToken, storedUser] = await Promise.all([getToken(), getStoredUser()])
      setTokenState(storedToken)
      setUser(storedUser)
      setBooting(false)
    }
    boot()
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setTokenState(null)
      setUser(null)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  const value = useMemo(() => ({
    booting,
    user,
    token,
    isSignedIn: Boolean(token),
    async login(credentials) {
      const response = await authApi.login(credentials)
      await persistLogin(response.data)
      const nextUser = {
        userId: response.data.userId,
        email: response.data.email,
        fullName: response.data.fullName,
        familyId: response.data.familyId,
        role: response.data.role,
      }
      setTokenState(response.data.token)
      setUser(nextUser)
      return nextUser
    },
    async updateSession(data) {
      if (data?.token) {
        await setToken(data.token)
        setTokenState(data.token)
      }
      if (data?.user) {
        await setStoredUser(data.user)
        setUser(data.user)
      }
    },
    async logout() {
      try {
        await authApi.logout()
      } catch {
        /* ignore */
      }
      await clearSession()
      setTokenState(null)
      setUser(null)
    },
  }), [booting, token, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
