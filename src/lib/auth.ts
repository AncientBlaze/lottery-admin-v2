import { create } from 'zustand'

// Same localStorage keys as the old panel, so existing sessions keep working.
const TOKEN_KEY = 'admin_token'
const USER_KEY = 'admin_user'
const ROLE_KEY = 'admin_role'
const API_KEY = 'api_base'
const DEFAULT_API = 'http://localhost:8080/api'

export const getApiBase = () =>
  (localStorage.getItem(API_KEY) || DEFAULT_API).replace(/\/$/, '')

export const setApiBase = (url: string) =>
  localStorage.setItem(API_KEY, url.trim().replace(/\/$/, ''))

type Session = { token: string; username: string; role: string }
type AuthState = Session & {
  setSession: (s: Session) => void
  logout: () => void
}

export const useAuth = create<AuthState>((set) => ({
  token: localStorage.getItem(TOKEN_KEY) || '',
  username: localStorage.getItem(USER_KEY) || '',
  role: localStorage.getItem(ROLE_KEY) || '',
  setSession: (s) => {
    localStorage.setItem(TOKEN_KEY, s.token)
    localStorage.setItem(USER_KEY, s.username)
    localStorage.setItem(ROLE_KEY, s.role)
    set(s)
  },
  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(ROLE_KEY)
    set({ token: '', username: '', role: '' })
  },
}))
