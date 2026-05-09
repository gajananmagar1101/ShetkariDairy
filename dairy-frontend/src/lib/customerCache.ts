import axios from 'axios'

const CUSTOMER_CACHE_KEY = 'customer-cache-v1'
const CUSTOMER_CACHE_TTL_MS = 60_000

interface CustomerLike {
  id: string
  name: string
  balance?: number
  skippedDates?: string[]
  specialCondition?: unknown
}

interface CachedCustomers<T> {
  timestamp: number
  data: T[]
}

export function getCachedCustomers<T extends CustomerLike>() {
  try {
    const raw = sessionStorage.getItem(CUSTOMER_CACHE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as CachedCustomers<T>
    if (Date.now() - parsed.timestamp > CUSTOMER_CACHE_TTL_MS) {
      sessionStorage.removeItem(CUSTOMER_CACHE_KEY)
      return null
    }

    return parsed.data
  } catch {
    return null
  }
}

export function setCachedCustomers<T extends CustomerLike>(customers: T[]) {
  try {
    sessionStorage.setItem(
      CUSTOMER_CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        data: customers,
      } satisfies CachedCustomers<T>)
    )
  } catch {
    // Ignore storage errors so the UI still works normally.
  }
}

export function invalidateCustomerCache() {
  try {
    sessionStorage.removeItem(CUSTOMER_CACHE_KEY)
  } catch {
    // Ignore storage errors.
  }
}

export async function fetchCustomersWithCache<T extends CustomerLike>(
  forceRefresh = false
) {
  if (!forceRefresh) {
    const cached = getCachedCustomers<T>()
    if (cached) return cached
  }

  const res = await axios.get('/api/customers')
  if (res.data.success) {
    const customers = res.data.data as T[]
    setCachedCustomers(customers)
    return customers
  }

  return [] as T[]
}
