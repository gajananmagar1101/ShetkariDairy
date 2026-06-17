import { useState } from 'react'
import AnimatedDashboardEntry from '../components/layout/AnimatedDashboardEntry'

export default function AnimationDemo() {
  const [showAnimation, setShowAnimation] = useState(true)

  const handleComplete = () => {
    setShowAnimation(false)
    // Auto-replay after 2 seconds
    setTimeout(() => {
      setShowAnimation(true)
    }, 2000)
  }

  if (!showAnimation) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-800">Animation Complete!</h1>
          <p className="mt-2 text-slate-600">Replaying in 2 seconds...</p>
        </div>
      </div>
    )
  }

  return <AnimatedDashboardEntry onComplete={handleComplete} />
}
