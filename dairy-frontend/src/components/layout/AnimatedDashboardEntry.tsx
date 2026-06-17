import { useEffect, useMemo, useState } from 'react'
import { LayoutGroup, motion } from 'framer-motion'
import { Logo } from '../ui/Logo'
import Sidebar from './Sidebar'
import Header from './Header'
import Dashboard from '../../pages/Dashboard'

type AnimationStage =
  | 'empty'
  | 'icon'
  | 'sidebar-grow'
  | 'sidebar-content'
  | 'sidebar-position'
  | 'dashboard-expand'
  | 'dashboard-header'
  | 'dashboard-cards'
  | 'dashboard-chart'
  | 'complete'

type AnimatedDashboardEntryProps = {
  onComplete: () => void
}

const stageOrder: AnimationStage[] = [
  'empty',
  'icon',
  'sidebar-grow',
  'sidebar-content',
  'sidebar-position',
  'dashboard-expand',
  'dashboard-header',
  'dashboard-cards',
  'dashboard-chart',
  'complete',
]

export default function AnimatedDashboardEntry({ onComplete }: AnimatedDashboardEntryProps) {
  const [stage, setStage] = useState<AnimationStage>('empty')
  const [viewport, setViewport] = useState({ width: 0, height: 0 })

  useEffect(() => {
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
      window.setTimeout(() => setStage('sidebar-grow'), 1000),
      window.setTimeout(() => setStage('sidebar-content'), 1800),
      window.setTimeout(() => setStage('sidebar-position'), 2400),
      window.setTimeout(() => setStage('dashboard-expand'), 3200),  // Start AFTER sidebar moves left
      window.setTimeout(() => setStage('dashboard-header'), 3600),
      window.setTimeout(() => setStage('dashboard-cards'), 4000),
      window.setTimeout(() => setStage('dashboard-chart'), 4600),
      window.setTimeout(() => setStage('complete'), 5200),
      window.setTimeout(onComplete, 5400),
    ]

    window.addEventListener('resize', updateViewport)

    return () => {
      window.removeEventListener('resize', updateViewport)
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [onComplete])

  const sizes = useMemo(() => {
    const width = viewport.width || 1440
    const height = viewport.height || 900
    const sidebarWidth = Math.min(304, Math.max(290, width * 0.18))
    const sidebarHeight = Math.min(height - 48, height * 0.92)
    const leftMargin = 40  // Left margin when sidebar is at left
    const gap = 24  // Gap between sidebar and dashboard
    const dashboardWidth = width - leftMargin - sidebarWidth - gap - 40  // 40 is right margin
    const dashboardHeight = sidebarHeight
    const initialX = 0
    const finalSidebarX = -(width / 2) + leftMargin + sidebarWidth / 2

    return {
      sidebarWidth,
      sidebarHeight,
      dashboardWidth,
      dashboardHeight,
      initialX,
      finalSidebarX,
      gap,
    }
  }, [viewport.width, viewport.height])

  const stageIndex = stageOrder.indexOf(stage)
  const showIcon = stageIndex >= 1
  const showSidebarGrow = stageIndex >= 2
  const showSidebarContent = stageIndex >= 3
  const showSidebarPosition = stageIndex >= 4
  const showDashboardExpand = stageIndex >= 5
  const showDashboardHeader = stageIndex >= 6
  const showDashboardCards = stageIndex >= 7
  const showDashboardChart = stageIndex >= 8

  return (
    <LayoutGroup>
      <motion.div
        className="fixed inset-0 z-50 overflow-hidden bg-[radial-gradient(circle_at_center,rgba(17,24,39,0.95),rgba(2,6,23,0.98)_58%,rgba(0,0,0,1)_100%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.28, ease: 'easeOut' } }}
      >
        {/* Background gradient layers */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_52%_34%,rgba(96,165,250,0.12),transparent_26%),radial-gradient(circle_at_30%_72%,rgba(16,185,129,0.08),transparent_24%),radial-gradient(circle_at_72%_66%,rgba(168,85,247,0.08),transparent_22%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:92px_92px] [mask-image:radial-gradient(circle_at_center,black_42%,transparent_82%)]" />

        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="relative"
            animate={{
              x: showSidebarPosition ? sizes.finalSidebarX : sizes.initialX,
            }}
            transition={{ type: 'spring', stiffness: 120, damping: 18, mass: 1 }}
            style={{ willChange: 'transform' }}
          >
            <div className="relative flex gap-0">
              {/* Sidebar Container */}
              <motion.div
                layoutId="sidebar-container"
                className="relative flex overflow-hidden border border-white/12 bg-white/95 shadow-[0_30px_90px_rgba(15,23,42,0.28)] backdrop-blur-3xl dark:bg-[#090909]/95"
                animate={{
                  width: showSidebarGrow ? sizes.sidebarWidth : 80,
                  height: showSidebarGrow ? sizes.sidebarHeight : 80,
                  borderRadius: showSidebarGrow ? '2rem' : '9999px',
                }}
                transition={{ type: 'spring', stiffness: 130, damping: 18, mass: 1 }}
              >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.05),transparent_28%)]" />

              {showSidebarContent ? (
                <motion.div
                  className="relative z-10 h-full w-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  <Sidebar animationStage={stage} />
                </motion.div>
              ) : (
                showIcon && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 180, damping: 22, mass: 1 }}
                  >
                    <motion.div
                      layoutId="brand-icon"
                      className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl shadow-[0_8px_20px_rgba(95,37,159,0.3)]"
                    >
                      <Logo size={48} />
                    </motion.div>
                  </motion.div>
                )
              )}
              </motion.div>

              {/* Dashboard Container */}
              {showDashboardExpand && (
                <motion.div
                  layoutId="dashboard-content"
                  className="overflow-hidden rounded-[2rem] border border-white/12 bg-white/[0.92] shadow-[0_30px_90px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:bg-[#111214]/90"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{
                    width: sizes.dashboardWidth,
                    opacity: 1,
                    height: sizes.dashboardHeight,
                    marginLeft: sizes.gap,
                  }}
                  transition={{
                    width: { type: 'spring', stiffness: 100, damping: 18, mass: 1 },
                    opacity: { duration: 0.3 },
                    height: { type: 'spring', stiffness: 115, damping: 18, mass: 1 },
                    marginLeft: { type: 'spring', stiffness: 100, damping: 18, mass: 1 },
                  }}
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.86),rgba(248,250,252,0.94)_40%,rgba(241,245,249,0.98)_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(17,24,39,0.4),rgba(5,5,5,0.95))]" />

                  <div className="relative z-10 flex h-full flex-col">
                    {/* Header */}
                    {showDashboardHeader && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                      >
                        <Header revealStage={showDashboardHeader ? 'complete' : 'hidden'} />
                      </motion.div>
                    )}

                    {/* Dashboard Content */}
                    <main className="relative flex-1 overflow-hidden">
                      <div className="h-full overflow-y-auto overflow-x-hidden">
                        <div className="min-h-full px-4 pb-10 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pt-6">
                          <Dashboard
                            animationStage={stage}
                            showCards={showDashboardCards}
                            showChart={showDashboardChart}
                          />
                        </div>
                      </div>
                    </main>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </LayoutGroup>
  )
}
