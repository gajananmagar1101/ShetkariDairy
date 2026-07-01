import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import axios from 'axios'
import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Logo } from '../ui/Logo'
import Sidebar from './Sidebar'
import Header from './Header'
import MobileDock from './MobileDock'
import MobileIntro from './MobileIntro'
import { useAuthStore } from '../../store/useAuthStore'
import { useSettingsStore } from '../../store/settingsStore'
import { Toaster } from 'react-hot-toast'
import { GlobalLoadBar } from '../ui/loading'
import { useNetworkActivity } from '../../lib/networkActivity'

// Korsa sequence:
// 1. icon: Large box, center
// 2. moveUp: Shrinks, top-center
// 3. expandDown: Full height strip, center (sidebar visible)
// 4. moveLeft: Strip slides to LEFT edge
// 5. expandRight: Page grows from strip to the right
// 6. reveal: Content fades in
type Stage = 'blank' | 'icon' | 'moveUp' | 'expandDown' | 'moveLeft' | 'expandRight' | 'reveal' | 'done'

export default function AppLayout() {
  const { user, token, setAuth } = useAuthStore()
  const { theme } = useSettingsStore()
  const isNetworkBusy = useNetworkActivity()

  const isMobile = useRef(typeof window !== 'undefined' && window.innerWidth < 768)
  const shouldAnimate = useRef(!sessionStorage.getItem('dashboard-intro-seen'))
  const [showMobileIntro, setShowMobileIntro] = useState(shouldAnimate.current && isMobile.current)
  const [stage, setStage] = useState<Stage>(shouldAnimate.current && !isMobile.current ? 'blank' : 'done')

  const handleMobileIntroComplete = useCallback(() => {
    setShowMobileIntro(false)
    sessionStorage.setItem('dashboard-intro-seen', 'true')
  }, [])

  useEffect(() => {
    if (!shouldAnimate.current || isMobile.current) return
    const timers = [
      setTimeout(() => setStage('icon'), 400),
      setTimeout(() => setStage('moveUp'), 2400),
      setTimeout(() => setStage('expandDown'), 3800),
      setTimeout(() => setStage('moveLeft'), 5400),
      setTimeout(() => setStage('expandRight'), 6800),
      setTimeout(() => setStage('reveal'), 8400),
      setTimeout(() => {
        setStage('done')
        sessionStorage.setItem('dashboard-intro-seen', 'true')
      }, 9600),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token || !user) return
      try {
        const res = await axios.get('/api/users/profile')
        if (res.data.success) {
          setAuth({ ...user, ...res.data.data }, token)
        }
      } catch (error) {
        console.error('Failed to fetch latest profile', error)
      }
    }
    fetchProfile()
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const stageOrder: Stage[] = ['blank', 'icon', 'moveUp', 'expandDown', 'moveLeft', 'expandRight', 'reveal', 'done']
  const stageIdx = stageOrder.indexOf(stage)
  const past = (s: Stage) => stageIdx >= stageOrder.indexOf(s)

  const dims = useMemo(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1440
    const vh = typeof window !== 'undefined' ? window.innerHeight : 900
    const pad = vw >= 1024 ? 20 : vw >= 640 ? 16 : 12
    const cardW = Math.min(vw - pad * 2, 1720)
    const cardH = vh - pad * 2
    const cardL = (vw - cardW) / 2
    const cardT = pad
    return { vw, vh, pad, cardW, cardH, cardL, cardT }
  }, [])

  const { vw, vh, cardW, cardH, cardL, cardT } = dims
  const iconBoxSize = 110
  const stripW = 68

  const getRect = () => {
    switch (stage) {
      case 'blank':
      case 'icon':
        return { w: iconBoxSize, h: iconBoxSize, l: vw / 2 - iconBoxSize / 2, t: vh / 2 - iconBoxSize / 2 }
      case 'moveUp':
        return { w: stripW, h: stripW, l: vw / 2 - stripW / 2, t: cardT }
      case 'expandDown':
        // Full height, still CENTER
        return { w: stripW, h: cardH, l: vw / 2 - stripW / 2, t: cardT }
      case 'moveLeft':
        // Same strip, moves to LEFT edge
        return { w: stripW, h: cardH, l: cardL, t: cardT }
      case 'expandRight':
      case 'reveal':
      case 'done':
        // Full page card — expands from left strip
        return { w: cardW, h: cardH, l: cardL, t: cardT }
    }
  }

  const r = getRect()

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#F5F5F5] text-[#1A1A1A] transition-colors duration-500 dark:bg-[#0A0A0A] dark:text-[#E5E5E5]">
      <GlobalLoadBar active={isNetworkBusy} />

      {/* Mobile intro */}
      {showMobileIntro && <MobileIntro onComplete={handleMobileIntroComplete} />}

      {/* ═══ ONE ELEMENT — transforms through all stages ═══ */}
      <motion.div
        className="absolute z-50 overflow-hidden bg-white dark:bg-[#111111]"
        initial={stage === 'done' ? {
          width: r.w,
          height: r.h,
          left: r.l,
          top: r.t,
          borderRadius: 24,
          boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
          opacity: 1,
          scale: 1,
        } : {
          width: iconBoxSize,
          height: iconBoxSize,
          left: vw / 2 - iconBoxSize / 2,
          top: vh / 2 - iconBoxSize / 2,
          borderRadius: 26,
          boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
          opacity: 0,
          scale: 0.5,
        }}
        animate={{
          width: r.w,
          height: r.h,
          left: r.l,
          top: r.t,
          borderRadius: past('expandRight') ? 24 : 26,
          boxShadow: past('expandRight')
            ? '0 4px 24px rgba(0,0,0,0.04)'
            : '0 20px 60px rgba(0,0,0,0.08)',
          opacity: stage === 'blank' ? 0 : 1,
          scale: stage === 'blank' ? 0.5 : 1,
        }}
        transition={{
          duration: stage === 'expandRight' ? 1.2 : stage === 'moveLeft' ? 1.1 : stage === 'expandDown' ? 1.1 : 1.0,
          ease: [0.25, 0.1, 0.25, 1],
          opacity: { duration: 0.8 },
          scale: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
        }}
      >
        {/* ── Brand icon: visible during icon & moveUp ── */}
        <motion.div
          className="absolute inset-0 z-20 flex items-center justify-center"
          animate={{ opacity: (stage === 'icon' || stage === 'moveUp') ? 1 : 0 }}
          transition={{ duration: 0.25 }}
          style={{ pointerEvents: 'none' }}
        >
          <motion.div
            className="flex items-center justify-center overflow-hidden rounded-[16px]"
            initial={{ scale: 0.3, opacity: 0, filter: 'blur(8px)', width: 56, height: 56 }}
            animate={
              (stage === 'icon' || stage === 'moveUp')
                ? { scale: 1, opacity: 1, filter: 'blur(0px)', width: stage === 'icon' ? 56 : 40, height: stage === 'icon' ? 56 : 40 }
                : { scale: 0.8, opacity: 0, filter: 'blur(4px)', width: 40, height: 40 }
            }
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Logo size={stage === 'icon' ? 56 : 40} />
          </motion.div>
        </motion.div>

        {/* ── Real sidebar + content: from expandDown onward ──
            Sidebar IS the strip. Never switches. ── */}
        <motion.div
          className="absolute inset-0 flex"
          animate={{ opacity: past('expandDown') ? 1 : 0 }}
          transition={{ duration: 0.3, delay: past('expandDown') ? 0.15 : 0 }}
          style={{ pointerEvents: past('expandDown') ? 'auto' : 'none' }}
        >
          {/* Real Sidebar — this IS the strip */}
          <div className="hidden h-full flex-shrink-0 md:block">
            <Sidebar animationStage={!past('done') ? 'sidebar-content' : null} forceCollapsed={!past('done')} />
          </div>

          {/* Main content area */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {/* Header — enters from top FIRST */}
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={past('reveal') ? { opacity: 1, y: 0 } : { opacity: 0, y: -30 }}
              transition={{ duration: 0.9, delay: past('reveal') ? 0.1 : 0, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <Header />
            </motion.div>

            {/* Page content — enters slowly from top, staggered reveal */}
            <main className="relative flex-1 overflow-hidden bg-transparent">
              <div className="h-full overflow-y-auto overflow-x-hidden">
                <motion.div
                  className="min-h-full px-4 pb-28 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pt-7 lg:pb-10"
                  initial={{ opacity: 0, y: -40 }}
                  animate={past('reveal') ? { opacity: 1, y: 0 } : { opacity: 0, y: -40 }}
                  transition={{ duration: 1.8, delay: past('reveal') ? 0.6 : 0, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    maskImage: past('reveal')
                      ? 'linear-gradient(to bottom, black 0%, black 100%)'
                      : 'linear-gradient(to bottom, black 0%, transparent 40%)',
                    WebkitMaskImage: past('reveal')
                      ? 'linear-gradient(to bottom, black 0%, black 100%)'
                      : 'linear-gradient(to bottom, black 0%, transparent 40%)',
                  }}
                >
                  <Outlet />
                </motion.div>
              </div>
            </main>
          </div>
        </motion.div>

      </motion.div>

      {(past('reveal') || isMobile.current) && !showMobileIntro && <MobileDock />}

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: '16px',
            background: theme === 'dark' ? '#1A1A1A' : '#FFFFFF',
            color: theme === 'dark' ? '#E5E5E5' : '#1A1A1A',
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.06)',
            padding: '14px 18px',
            fontWeight: 500,
            fontSize: '14px',
          },
        }}
      />
    </div>
  )
}
