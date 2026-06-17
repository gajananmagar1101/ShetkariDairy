import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Logo } from '../ui/Logo'

interface SplashScreenProps {
  onComplete: () => void
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<'icon' | 'name' | 'exit'>('icon')

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('name'), 1000),
      setTimeout(() => setPhase('exit'), 2400),
      setTimeout(() => onComplete(), 3100),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  return (
    <AnimatePresence>
      {phase !== 'exit' ? (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#F5F5F5]"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Icon container — Korsa style */}
          <motion.div
            className="relative flex h-[100px] w-[100px] items-center justify-center rounded-[28px] bg-white"
            initial={{ scale: 0.7, opacity: 0, filter: 'blur(10px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            style={{
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
            }}
          >
            {/* Shadow grows underneath */}
            <motion.div
              className="absolute -bottom-4 left-1/2 h-[30px] w-[70px] -translate-x-1/2 rounded-full bg-black/[0.04] blur-xl"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
            />
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <Logo size={40} />
            </motion.div>
          </motion.div>

          {/* Brand name */}
          <motion.div
            className="mt-8 overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={phase === 'name' ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          >
            <motion.h1
              className="text-[1.6rem] font-bold tracking-tight text-[#1A1A1A]"
              initial={{ y: 20, opacity: 0 }}
              animate={phase === 'name' ? { y: 0, opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
            >
              Shetkari Vahi
            </motion.h1>
          </motion.div>

          <motion.p
            className="mt-2 text-[13px] font-medium text-[#9CA3AF]"
            initial={{ opacity: 0, y: 10 }}
            animate={phase === 'name' ? { opacity: 1, y: 0 } : { opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
          >
            Dairy Management System
          </motion.p>
        </motion.div>
      ) : (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#F5F5F5]"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        />
      )}
    </AnimatePresence>
  )
}
