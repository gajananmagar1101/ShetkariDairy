import { useEffect, useState } from 'react'

let pendingRequests = 0
const listeners = new Set<(count: number) => void>()
let notifyScheduled = false

const notify = () => {
  if (notifyScheduled) return
  notifyScheduled = true
  queueMicrotask(() => {
    notifyScheduled = false
    listeners.forEach((listener) => listener(pendingRequests))
  })
}

export function beginNetworkActivity() {
  pendingRequests += 1
  notify()
}

export function endNetworkActivity() {
  pendingRequests = Math.max(0, pendingRequests - 1)
  notify()
}

export function subscribeToNetworkActivity(listener: (count: number) => void) {
  listeners.add(listener)
  listener(pendingRequests)
  return () => {
    listeners.delete(listener)
  }
}

export function useNetworkActivity(delayMs = 150) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    let timer: number | undefined

    return subscribeToNetworkActivity((count) => {
      if (count > 0) {
        if (timer) {
          window.clearTimeout(timer)
        }
        timer = window.setTimeout(() => setActive(true), delayMs)
        return
      }

      if (timer) {
        window.clearTimeout(timer)
      }
      setActive(false)
    })
  }, [delayMs])

  return active
}
