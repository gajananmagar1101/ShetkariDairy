import axios from 'axios'

export interface AppSettingsResponse {
  autoEntryTime: string
  timezone: string
  upiId: string
}

export async function fetchAppSettings() {
  const res = await axios.get('/api/users/auto-entry-settings')
  if (res.data.success) {
    return res.data.data as AppSettingsResponse
  }
  return {
    autoEntryTime: '21:30',
    timezone: 'Asia/Kolkata',
    upiId: '',
  } satisfies AppSettingsResponse
}
