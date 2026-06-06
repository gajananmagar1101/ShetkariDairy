import axios from 'axios'

export interface AppSettingsResponse {
  autoEntryTime: string
  labourAutoAttendanceTime: string
  timezone: string
  upiId: string
}

const SETTINGS_CACHE_KEY = 'app-settings-cache-v1'
const SETTINGS_CACHE_TTL_MS = 60_000

const fallbackSettings = {
  autoEntryTime: '21:30',
  labourAutoAttendanceTime: '20:00',
  timezone: 'Asia/Kolkata',
  upiId: '',
} satisfies AppSettingsResponse

function getCachedAppSettings() {
  try {
    const raw = sessionStorage.getItem(SETTINGS_CACHE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as { timestamp: number; data: AppSettingsResponse }
    if (Date.now() - parsed.timestamp > SETTINGS_CACHE_TTL_MS) {
      sessionStorage.removeItem(SETTINGS_CACHE_KEY)
      return null
    }

    return parsed.data
  } catch {
    return null
  }
}

function setCachedAppSettings(data: AppSettingsResponse) {
  try {
    sessionStorage.setItem(
      SETTINGS_CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        data,
      }),
    )
  } catch {
    // Ignore storage failures.
  }
}

export function invalidateAppSettingsCache() {
  try {
    sessionStorage.removeItem(SETTINGS_CACHE_KEY)
  } catch {
    // Ignore storage failures.
  }
}

export async function fetchAppSettings(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = getCachedAppSettings()
    if (cached) return cached
  }

  const res = await axios.get('/api/users/auto-entry-settings')
  if (res.data.success) {
    const data = res.data.data as AppSettingsResponse
    setCachedAppSettings(data)
    return data
  }
  return fallbackSettings
}
