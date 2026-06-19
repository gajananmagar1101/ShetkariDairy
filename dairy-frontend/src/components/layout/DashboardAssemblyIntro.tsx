import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BriefcaseBusiness,
  CreditCard,
  Droplets,
  FileText,
  Home,
  Settings,
  Users,
} from 'lucide-react'
import { Logo } from '../ui/Logo'

type DashboardAssemblyIntroProps = {
  open: boolean
  onComplete: () => void
}

type Stage = 'empty' | 'icon' | 'grow' | 'content' | 'move' | 'expand' | 'structure' | 'reveal' | 'done'

const sidebarMenu = [
  { icon: Home, label: 'Dashboard', active: true },
  { icon: Users, label: 'Customers', active: false },
  { icon: Droplets, label: 'Milk Entries', active: false },
  { icon: FileText, label: 'Billing', active: false },
  { icon: CreditCard, label: 'Payments', active: false },
  { icon: Settings, label: 'Settings', active: false },
]

const stageOrder: Stage[] = ['empty', 'icon', 'grow', 'content', 'move', 'expand', 'structure', 'reveal', 'done']

export default function DashboardAssemblyIntro({ open, onComplete }: DashboardAssemblyIntroProps) {
  const [stage, setStage] = useState<Stage>('empty')
  const [viewport, setViewport] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!open) {
      setStage('empty')
      return
    }

    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    updateViewport()
    setStage('empty')

    const timers = [
      window.setTimeout(() => setStage('icon'), 500),
      window.setTimeout(() => setStage('grow'), 1000),
      window.setTimeout(() => setStage('content'), 1800),
      window.setTimeout(() => setStage('move'), 2800),
      window.setTimeout(() => setStage('expand'), 3600),
      window.setTimeout(() => setStage('structure'), 4400),
      window.setTimeout(() => setStage('reveal'), 5200),
      window.setTimeout(() => setStage('done'), 6000),
      window.setTimeout(onComplete, 6250),
    ]

    window.addEventListener('resize', updateViewport)

    return () => {
      window.removeEventListener('resize', updateViewport)
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [open, onComplete])

  const sizes = useMemo(() => {
    const width = viewport.width || 1440
    const height = viewport.height || 900
    const sidebarWidth = Math.min(288, Math.max(264, width * 0.16))
    const sidebarHeight = Math.min(780, Math.max(650, height * 0.78))
    const frameWidth = Math.max(0, width - sidebarWidth - 48)
    const frameHeight = Math.min(sidebarHeight, height - 64)
    const finalLeftX = -(width / 2) + 24 + sidebarWidth / 2

    return {
      sidebarWidth,
      sidebarHeight,
      frameWidth,
      frameHeight,
      finalLeftX,
    }
  }, [viewport.height, viewport.width])

  if (!open) return null

  const stageIndex = stageOrder.indexOf(stage)
  const showSidebarContent = stageIndex >= 3
  const showMove = stageIndex >= 4
  const showFrame = stageIndex >= 5
  const showStructure = stageIndex >= 6
  const showReveal = stageIndex >= 7

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 overflow-hidden bg-[radial-gradient(circle_at_center,rgba(17,24,39,0.95),rgba(2,6,23,0.98)_58%,rgba(0,0,0,1)_100%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.28, ease: 'easeOut' } }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_52%_34%,rgba(96,165,250,0.12),transparent_26%),radial-gradient(circle_at_30%_72%,rgba(16,185,129,0.08),transparent_24%),radial-gradient(circle_at_72%_66%,rgba(168,85,247,0.08),transparent_22%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:92px_92px] [mask-image:radial-gradient(circle_at_center,black_42%,transparent_82%)]" />
        <motion.div
          className="pointer-events-none absolute inset-0"
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%'],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            backgroundImage:
              'linear-gradient(120deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.0) 30%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.0) 70%, rgba(255,255,255,0.03) 100%)',
            backgroundSize: '220% 220%',
          }}
        />

        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="relative flex items-center justify-center"
            animate={{
              opacity: stageIndex >= 1 ? 1 : 0,
              scale: stageIndex >= 1 ? 1 : 0.8,
            }}
            transition={{ type: 'spring', stiffness: 180, damping: 22, mass: 1 }}
          >
            <motion.div
              layoutId="brand-logo"
              className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.2rem] shadow-[0_18px_70px_rgba(15,23,42,0.35)]"
            >
              <Logo size={64} />
            </motion.div>
            <motion.div
              className="pointer-events-none absolute inset-[-24px] rounded-[1.8rem] bg-[radial-gradient(circle,rgba(255,255,255,0.26),transparent_62%)] blur-2xl"
              animate={{ opacity: stageIndex >= 1 && stageIndex < 8 ? 1 : 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          </motion.div>
        </div>

        <motion.div
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 overflow-hidden"
          animate={{
            x: showMove ? sizes.finalLeftX : 0,
            width: showFrame || showStructure || showReveal ? sizes.sidebarWidth + sizes.frameWidth : sizes.sidebarWidth,
            height: sizes.sidebarHeight,
          }}
          transition={{ type: 'spring', stiffness: 120, damping: 18, mass: 1 }}
          style={{ willChange: 'transform,width,height' }}
        >
          <motion.div
            className="relative flex h-full shrink-0 flex-col overflow-hidden border border-white/12 bg-white/95 shadow-[0_30px_90px_rgba(15,23,42,0.28)] backdrop-blur-3xl"
            animate={{
              width: sizes.sidebarWidth,
              borderRadius: stageIndex >= 2 ? 34 : 999,
            }}
            transition={{ type: 'spring', stiffness: 130, damping: 18, mass: 1 }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.05),transparent_28%)]" />

            <div className="relative z-10 flex h-full flex-col p-5">
              <AnimatePresence mode="sync" initial={false}>
                {showSidebarContent ? (
                  <motion.div
                    key="sidebar-content"
                    className="flex flex-col gap-4"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                  >
                    <motion.div
                      className="flex items-center gap-3"
                      layoutId="brand-logo"
                      initial={{ opacity: 0, scale: 0.9, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                    >
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-[0.9rem] shadow-[0_10px_24px_rgba(15,23,42,0.22)]">
                        <Logo size={40} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[1rem] font-extrabold tracking-tight text-slate-900">Shetkari Vahi</div>
                        <div className="text-[0.68rem] font-medium tracking-[0.26em] text-slate-500 uppercase">
                          Dairy + Labour
                        </div>
                      </div>
                    </motion.div>

                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2 px-1 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        <span className="h-px flex-1 bg-slate-200" />
                        <span>Navigation</span>
                        <span className="h-px flex-1 bg-slate-200" />
                      </div>

                      <motion.div
                        className="space-y-1"
                        variants={{
                          visible: {
                            transition: {
                              staggerChildren: 0.08,
                              delayChildren: 0.02,
                            },
                          },
                        }}
                        initial="hidden"
                        animate="visible"
                      >
                        {sidebarMenu.map((item) => (
                          <motion.div
                            key={item.label}
                            variants={{
                              hidden: { opacity: 0, y: 10, scale: 0.98 },
                              visible: { opacity: 1, y: 0, scale: 1 },
                            }}
                            transition={{ type: 'spring', stiffness: 170, damping: 20 }}
                            className={`flex items-center gap-3 rounded-[1rem] px-3 py-2.5 ${
                              item.active ? 'bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)]' : 'text-slate-500'
                            }`}
                          >
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-[0.85rem] ${
                                item.active ? 'bg-white/10' : 'bg-slate-100'
                              }`}
                            >
                              <item.icon className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-medium">{item.label}</span>
                          </motion.div>
                        ))}
                      </motion.div>

                      <div className="pt-1 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        More
                      </div>
                      <motion.div
                        className="flex items-center gap-3 rounded-[1rem] px-3 py-2.5 text-slate-500"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.18, duration: 0.28 }}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-[0.85rem] bg-slate-100">
                          <BriefcaseBusiness className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">Labour</span>
                      </motion.div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="center-icon"
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div
                      className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.2rem] shadow-[0_16px_40px_rgba(53,94,59,0.22)]"
                      animate={{ scale: stageIndex >= 2 ? 1 : 0.95 }}
                      transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                    >
                      <Logo size={64} />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.div
            className="relative h-full overflow-hidden border border-l-0 border-white/12 bg-white/[0.92] shadow-[0_30px_90px_rgba(15,23,42,0.18)] backdrop-blur-2xl"
            animate={{
              width: showFrame || showStructure || showReveal ? sizes.frameWidth : 0,
              opacity: showFrame || showStructure || showReveal ? 1 : 0,
              borderTopRightRadius: 34,
              borderBottomRightRadius: 34,
            }}
            transition={{ type: 'spring', stiffness: 115, damping: 18, mass: 1 }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.86),rgba(248,250,252,0.94)_40%,rgba(241,245,249,0.98)_100%)]" />
            <div className="relative z-10 flex h-full flex-col px-6 py-6">
              <AnimatePresence mode="sync" initial={false}>
                {showStructure && !showReveal && (
                  <motion.div
                    key="structure"
                    className="flex h-full flex-col gap-4"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-6 w-40 rounded-full bg-slate-200/70" />
                      <div className="h-9 w-24 rounded-full bg-slate-200/70" />
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-28 rounded-[1.2rem] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80" />
                      ))}
                    </div>
                    <div className="grid flex-1 grid-cols-2 gap-4">
                      <div className="rounded-[1.4rem] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80" />
                      <div className="rounded-[1.4rem] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80" />
                    </div>
                  </motion.div>
                )}

                {showReveal && (
                  <motion.div
                    key="reveal"
                    className="flex h-full flex-col gap-4"
                    initial={{ opacity: 0, y: 12, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                  >
                    <div className="flex items-center justify-between">
                      <motion.div
                        className="h-6 w-44 rounded-full bg-slate-200/70"
                        animate={{ opacity: [0.85, 1, 0.85] }}
                        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                      />
                      <motion.div
                        className="h-9 w-28 rounded-full bg-slate-200/70"
                        animate={{ opacity: [0.85, 1, 0.85] }}
                        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <motion.div
                          key={index}
                          className="h-28 rounded-[1.2rem] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80"
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.26, delay: index * 0.08, ease: 'easeOut' }}
                        />
                      ))}
                    </div>

                    <div className="grid flex-1 grid-cols-2 gap-4">
                      {Array.from({ length: 2 }).map((_, index) => (
                        <motion.div
                          key={index}
                          className="rounded-[1.4rem] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80"
                          initial={{ opacity: 0, y: 12, scale: 0.985 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.28, delay: 0.18 + index * 0.08, ease: 'easeOut' }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
