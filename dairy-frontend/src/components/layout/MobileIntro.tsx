import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Logo } from '../ui/Logo'

interface MobileIntroProps {
  onComplete: () => void
}

export default function MobileIntro({ onComplete }: MobileIntroProps) {
  const [phase, setPhase] = useState<'enter' | 'logo' | 'brand' | 'glow' | 'exit'>('enter')

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('logo'), 300),
      setTimeout(() => setPhase('brand'), 1200),
      setTimeout(() => setPhase('glow'), 2600),
      setTimeout(() => setPhase('exit'), 3400),
      setTimeout(() => onComplete(), 4200),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  const phaseIdx = ['enter', 'logo', 'brand', 'glow', 'exit'].indexOf(phase)
  const past = (p: string) => phaseIdx >= ['enter', 'logo', 'brand', 'glow', 'exit'].indexOf(p)

  return (
    <AnimatePresence>
      {phase !== 'exit' ? (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Background gradient */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{
              background: 'linear-gradient(160deg, #1B5E20 0%, #2E7D32 35%, #388E3C 65%, #1B5E20 100%)',
            }}
          />

          {/* Animated background rings */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: past('logo') ? 0.15 : 0 }}
            transition={{ duration: 1.5 }}
          >
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border border-white/20"
                initial={{ width: 80, height: 80, opacity: 0 }}
                animate={past('logo') ? {
                  width: 80 + i * 120,
                  height: 80 + i * 120,
                  opacity: [0, 0.6, 0],
                } : {}}
                transition={{
                  duration: 2.5,
                  delay: i * 0.4,
                  ease: 'easeOut',
                  opacity: { duration: 2.5, times: [0, 0.3, 1] },
                }}
              />
            ))}
          </motion.div>

          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-1 w-1 rounded-full bg-white/30"
                initial={{
                  x: `${20 + (i * 13) % 60}%`,
                  y: '110%',
                  scale: 0.5 + (i % 3) * 0.5,
                }}
                animate={past('brand') ? {
                  y: '-10%',
                  opacity: [0, 1, 0],
                } : {}}
                transition={{
                  duration: 3 + i * 0.5,
                  delay: i * 0.2,
                  ease: 'easeOut',
                }}
              />
            ))}
          </div>

          {/* Logo container with glow */}
          <motion.div className="relative z-10 flex flex-col items-center">
            {/* Glow behind logo */}
            <motion.div
              className="absolute -inset-8 rounded-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: past('glow') ? 0.4 : past('logo') ? 0.2 : 0 }}
              transition={{ duration: 1 }}
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
              }}
            />

            {/* Logo box */}
            <motion.div
              className="relative flex items-center justify-center rounded-[28px] bg-white/10 backdrop-blur-sm"
              initial={{ scale: 0, opacity: 0, rotate: -20 }}
              animate={past('logo') ? { scale: 1, opacity: 1, rotate: 0 } : {}}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 15,
                duration: 0.8,
              }}
              style={{
                width: 96,
                height: 96,
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
              }}
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={past('logo') ? { scale: 1, opacity: 1 } : {}}
                transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <Logo size={52} />
              </motion.div>
            </motion.div>

            {/* Brand name */}
            <motion.div
              className="mt-7 flex flex-col items-center gap-2"
              initial={{ opacity: 0, y: 20 }}
              animate={past('brand') ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="relative text-[1.8rem] font-extrabold tracking-tight text-white">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={past('brand') ? { opacity: 1 } : {}}
                  transition={{ duration: 0.4 }}
                >
                  शेतकरी वही
                </motion.span>
                {/* Shimmer overlay */}
                <motion.span
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent bg-[length:200%_100%]"
                  style={{
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                  initial={{ backgroundPosition: '-100% 0' }}
                  animate={past('brand') ? { backgroundPosition: '200% 0' } : {}}
                  transition={{ duration: 1.2, delay: 0.3, ease: 'easeInOut' }}
                >
                  शेतकरी वही
                </motion.span>
              </h1>

              <motion.p
                className="text-[13px] font-medium text-white/60"
                initial={{ opacity: 0, y: 8 }}
                animate={past('brand') ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                Dairy Management System
              </motion.p>
            </motion.div>

            {/* Loading indicator */}
            <motion.div
              className="mt-10 flex gap-1.5"
              initial={{ opacity: 0 }}
              animate={past('brand') ? { opacity: 1 } : {}}
              transition={{ delay: 0.5 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-white/50"
                  animate={past('brand') ? {
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  } : {}}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </motion.div>
          </motion.div>

          {/* Bottom subtle branding */}
          <motion.div
            className="absolute bottom-12 z-10"
            initial={{ opacity: 0 }}
            animate={past('brand') ? { opacity: 1 } : {}}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <p className="text-[11px] font-medium tracking-wider text-white/30 uppercase">
              Smart Dairy Solutions
            </p>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{
            background: 'linear-gradient(160deg, #1B5E20 0%, #2E7D32 35%, #388E3C 65%, #1B5E20 100%)',
          }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0, y: -30 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        />
      )}
    </AnimatePresence>
  )
}
