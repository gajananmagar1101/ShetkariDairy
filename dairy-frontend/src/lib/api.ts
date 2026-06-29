import axios from 'axios'
import { useAuthStore } from '../store/useAuthStore'
import { beginNetworkActivity, endNetworkActivity } from './networkActivity'

const REQUEST_TIMEOUT_MS = 60000

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

// In-flight GET request deduplication
const inflightRequests = new Map<string, Promise<any>>()

function getDedupeKey(config: any): string | null {
  if (config.method && config.method.toLowerCase() !== 'get') return null
  const url = config.url || ''
  const params = config.params ? JSON.stringify(config.params) : ''
  return `${url}?${params}`
}

axios.interceptors.request.use((config) => {
  beginNetworkActivity()
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  endNetworkActivity()
  return Promise.reject(error)
});

axios.interceptors.response.use(
  (response) => {
    endNetworkActivity()
    const key = getDedupeKey(response.config)
    if (key) inflightRequests.delete(key)
    return response
  },
  (error) => {
    endNetworkActivity()
    if (error.config) {
      const key = getDedupeKey(error.config)
      if (key) inflightRequests.delete(key)
    }
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        error.message =
          'API request timed out. Check whether the backend is deployed and reachable.'
      } else if (error.response) {
        if (error.response.status === 401 || error.response.status === 403) {
          useAuthStore.getState().logout();
          window.location.href = '/login';
          error.message = 'Session expired. Please log in again.';
        } else if (error.response.data?.message) {
          error.message = error.response.data.message;
        } else {
          error.message = `Request failed with status ${error.response.status}`;
        }
      } else if (error.request) {
        error.message =
          'Could not reach the API server. If frontend and backend are deployed separately, set VITE_API_URL in the frontend deployment.'
      }
    }

    return Promise.reject(error)
  },
)

// Wrap axios.get to deduplicate in-flight GET requests
const originalGet = axios.get.bind(axios)
axios.get = ((url: string, config?: any) => {
  const fullConfig = { ...config, url, method: 'get' }
  const key = getDedupeKey(fullConfig)
  if (key) {
    const existing = inflightRequests.get(key)
    if (existing) return existing
    const promise = originalGet(url, config).finally(() => inflightRequests.delete(key))
    inflightRequests.set(key, promise)
    return promise
  }
  return originalGet(url, config)
}) as typeof axios.get

export const getApiBaseUrl = () => configuredApiUrl || window.location.origin
