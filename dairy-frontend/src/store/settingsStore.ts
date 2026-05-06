import { create } from 'zustand'

type Language = 'en' | 'mr'
type Theme = 'light' | 'dark'

interface SettingsState {
  language: Language
  theme: Theme
  setLanguage: (lang: Language) => void
  setTheme: (theme: Theme) => void
  toggleLanguage: () => void
  toggleTheme: () => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  language: 'en',
  theme: 'light',
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
}))
