import axios from 'axios'

const REQUEST_TIMEOUT_MS = 10000

const normalizeApiUrl = (value?: string) => {
  if (!value) {
    return ''
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  if (trimmed.startsWith('/')) {
    return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
  }

  const withProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
  return withProtocol.endsWith('/') ? withProtocol.slice(0, -1) : withProtocol
}

const configuredApiUrl = normalizeApiUrl(import.meta.env.VITE_API_URL)

axios.defaults.timeout = REQUEST_TIMEOUT_MS

if (configuredApiUrl) {
  axios.defaults.baseURL = configuredApiUrl
}

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        error.message =
          'API request timed out. Check whether the backend is deployed and reachable.'
      } else if (error.response?.data?.message) {
        error.message = error.response.data.message
      } else if (error.request) {
        error.message =
          'Could not reach the API server. If frontend and backend are deployed separately, set VITE_API_URL in the frontend deployment.'
      }
    }

    return Promise.reject(error)
  },
)

export const getApiBaseUrl = () => configuredApiUrl || window.location.origin
