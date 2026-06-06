import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const clearSessionCaches = () => {
  try {
    const keysToRemove: string[] = []
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index)
      if (!key) continue
      if (key === 'customer-cache-v1' || key.startsWith('view-cache-')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => sessionStorage.removeItem(key))
  } catch {
    // Ignore storage access issues.
  }
}

export interface User {
  id?: string
  name: string
  phone?: string
  email?: string
  role: string
  picture?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  hasHydrated: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
  setHasHydrated: (hasHydrated: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      hasHydrated: false,
      setAuth: (user, token) => {
        clearSessionCaches()
        set({ user, token, isAuthenticated: true })
      },
      logout: () => {
        clearSessionCaches()
        set({ user: null, token: null, isAuthenticated: false })
      },
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
