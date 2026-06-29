import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Language = 'en' | 'mr'
type Theme = 'light' | 'dark'

interface SettingsState {
  language: Language
  theme: Theme
  isMobileMenuOpen: boolean
  isSidebarCollapsed: boolean
  setLanguage: (lang: Language) => void
  setTheme: (theme: Theme) => void
  toggleLanguage: () => void
  toggleTheme: () => void
  toggleMobileMenu: () => void
  setMobileMenuOpen: (isOpen: boolean) => void
  toggleSidebarCollapsed: () => void
  setSidebarCollapsed: (isCollapsed: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
  language: 'en',
  theme: 'light',
  isMobileMenuOpen: false,
  isSidebarCollapsed: true,
  setLanguage: (lang) => set({ language: lang }),
  setTheme: (theme) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    set({ theme })
  },
  toggleLanguage: () => set((state) => ({ language: state.language === 'en' ? 'mr' : 'en' })),
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light'
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    return { theme: newTheme }
  }),
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  setMobileMenuOpen: (isOpen) => set({ isMobileMenuOpen: isOpen }),
  toggleSidebarCollapsed: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (isCollapsed) => set({ isSidebarCollapsed: isCollapsed }),
    }),
    {
      name: 'settings-storage',
      version: 3,
      migrate: (persistedState) => {
        const state = persistedState as Partial<SettingsState> | undefined
        return {
          language: state?.language ?? 'en',
          theme: state?.theme ?? 'light',
          isMobileMenuOpen: state?.isMobileMenuOpen ?? false,
          isSidebarCollapsed: true,
        } as Partial<SettingsState>
      },
    }
  )
)
