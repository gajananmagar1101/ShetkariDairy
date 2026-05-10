interface CacheRecord<T> {
  timestamp: number
  data: T
}

export function getCachedViewData<T>(key: string, ttlMs: number) {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null

    const parsed = JSON.parse(raw) as CacheRecord<T>
    if (Date.now() - parsed.timestamp > ttlMs) {
      sessionStorage.removeItem(key)
      return null
    }

    return parsed.data
  } catch {
    return null
  }
}

export function setCachedViewData<T>(key: string, data: T) {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        timestamp: Date.now(),
        data,
      } satisfies CacheRecord<T>),
    )
  } catch {
    // Ignore cache write failures.
  }
}

export function invalidateViewCache(key: string) {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // Ignore cache delete failures.
  }
}
