import { useEffect, useMemo, useState } from 'react'
import { motion, type Variants } from 'framer-motion'

export const dashboardSection: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 150,
      damping: 22,
      mass: 1,
    },
  },
}

export const dashboardStagger = (staggerChildren = 0.08, delayChildren = 0): Variants => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
})

export const riseIn: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.975 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 170, damping: 22 },
  },
}

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -18, y: 4 },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { type: 'spring', stiffness: 170, damping: 22 },
  },
}

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 18, y: 4 },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { type: 'spring', stiffness: 170, damping: 22 },
  },
}

export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 160, damping: 20 },
  },
}

export function AnimatedNumber({
  value,
  suffix = '',
  precision = 0,
  duration = 900,
}: {
  value: number
  suffix?: string
  precision?: number
  duration?: number
}) {
  const [displayValue, setDisplayValue] = useState(0)

  const formattedValue = useMemo(() => {
    if (precision > 0) {
      return displayValue.toFixed(precision)
    }
    return Math.round(displayValue).toString()
  }, [displayValue, precision])

  useEffect(() => {
    let frame = 0
    const start = performance.now()
    const from = 0

    const step = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const nextValue = from + (value - from) * eased
      setDisplayValue(nextValue)

      if (progress < 1) {
        frame = requestAnimationFrame(step)
      }
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return (
    <motion.span
      key={`${value}-${precision}-${suffix}`}
      initial={{ opacity: 0.7, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {formattedValue}
      {suffix}
    </motion.span>
  )
}
