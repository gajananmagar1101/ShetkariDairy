import React, { useState } from 'react'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import axios from 'axios'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { BadgeCheck } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useSettingsStore } from '../store/settingsStore'
import { LoadingBlock } from '../components/ui/loading'

const Login: React.FC = () => {
  const setAuth = useAuthStore((state) => state.setAuth)
  const language = useSettingsStore((state) => state.language)
  const toggleLanguage = useSettingsStore((state) => state.toggleLanguage)
  const hasHydrated = useAuthStore((state) => state.hasHydrated)
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)

  const isMarathi = language === 'mr'
  const copy = {
    brandName: isMarathi ? 'शेतकरी वही' : 'Shetkari Vahi',
    desktopEyebrow: isMarathi ? 'दूध नोंदी • बिलिंग • मजूर' : 'Milk records • billing • labour',
    heroLine1: isMarathi ? 'दूध नोंदी, कामगार आणि' : 'Dairy records, workers and',
    heroLine2: isMarathi ? 'बिलिंग एकाच ठिकाणी.' : 'billing in one place.',
    milkTracking: isMarathi ? 'दूध नोंद' : 'Milk tracking',
    customerBilling: isMarathi ? 'ग्राहक बिलिंग' : 'Customer billing',
    labourManagement: isMarathi ? 'मजूर व्यवस्थापन' : 'Labour management',
    signIn: isMarathi ? 'Google ने साइन इन' : 'Sign in with Google',
    welcomeBack: isMarathi ? 'पुन्हा स्वागत आहे' : 'Welcome back',
    loginHelp: isMarathi
      ? 'लॉगिनसाठी तुमचं Google खाते वापरा.'
      : 'Use your Google account to continue.',
    verifiedText: isMarathi ? 'सोपे आणि सुरक्षित लॉगिन' : 'Simple and secure login',
    googleLoading: isMarathi ? 'Google ने साइन इन सुरू आहे...' : 'Signing you in with Google...',
    languageA: isMarathi ? 'EN' : 'मराठी',
    languageB: isMarathi ? 'मराठी' : 'EN',
  }

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential || isGoogleSubmitting) {
      if (!credentialResponse.credential) {
        toast.error('Google authentication token not received.')
      }
      return
    }

    setIsGoogleSubmitting(true)
    try {
      const response = await axios.post('/api/auth/google', {
        token: credentialResponse.credential,
      })

      if (!response.data?.success || !response.data?.data) {
        throw new Error('Google login failed.')
      }

      const { token, name, role, picture, email, phone } = response.data.data

      sessionStorage.removeItem('dashboard-intro-seen')
      setAuth({ name, role, picture, email, phone }, token)
      toast.success(isMarathi ? 'लॉगिन यशस्वी झाले.' : 'Login successful.')
    } catch (error: unknown) {
      console.error('Google login error:', error)
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message
        : error instanceof Error
          ? error.message
          : undefined
      toast.error(message || 'Google authentication failed.')
    } finally {
      setIsGoogleSubmitting(false)
    }
  }

  if (!hasHydrated) {
    return <LoadingBlock label={isMarathi ? 'लोड होत आहे...' : 'Loading login...'} minHeightClassName="min-h-screen" />
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6f2fb] text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(139,92,246,0.16),transparent_24%),radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.1),transparent_22%),radial-gradient(circle_at_50%_80%,rgba(236,72,153,0.05),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.68)_0%,rgba(247,241,255,0.96)_55%,rgba(242,234,255,1)_100%)] dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.78)_0%,rgba(15,23,42,0.62)_50%,rgba(15,23,42,0.9)_100%)]" />
        <div className="absolute left-[-6rem] top-[-7rem] h-80 w-80 rounded-full bg-violet-300/30 blur-3xl dark:bg-violet-700/20 animate-drift-slow" />
        <div className="absolute right-[-8rem] top-[14%] h-96 w-96 rounded-full bg-fuchsia-300/20 blur-3xl dark:bg-sky-700/10 animate-drift-slow" />
        <div className="absolute bottom-[-7rem] left-[10%] h-72 w-72 rounded-full bg-amber-200/20 blur-3xl dark:bg-emerald-700/10" />
      </div>

      <div className="absolute right-3 top-3 z-20 sm:right-5 sm:top-5">
        <button
          type="button"
          onClick={toggleLanguage}
          className="rounded-full border border-violet-200/70 bg-white/70 px-3 py-1.5 text-xs font-bold text-violet-700 shadow-[0_10px_30px_rgba(91,33,182,0.08)] backdrop-blur-xl transition hover:bg-white/85 sm:px-4 sm:py-2 sm:text-sm"
        >
          {copy.languageA} / {copy.languageB}
        </button>
      </div>

      <motion.div
        className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl items-end gap-5 px-3 pb-8 pt-14 sm:px-5 sm:pb-10 sm:pt-16 lg:grid-cols-[1.1fr_430px] lg:items-center lg:gap-10 lg:px-8 lg:py-10"
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
      >
        <motion.section
          className="hidden lg:block"
          variants={{ hidden: { opacity: 0, x: -18 }, visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } }}
        >
          <div className="relative max-w-[38rem] overflow-hidden rounded-[2.2rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.86)_0%,rgba(251,248,255,0.84)_48%,rgba(244,239,255,0.9)_100%)] p-7 shadow-[0_28px_80px_rgba(91,33,182,0.14)] backdrop-blur-[20px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(139,92,246,0.1),transparent_28%),radial-gradient(circle_at_82%_14%,rgba(255,255,255,0.55),transparent_20%),linear-gradient(145deg,rgba(255,255,255,0.42),rgba(255,255,255,0.06))]" />
            <div className="relative">
              <div className="flex items-center gap-4">
                <div className="rounded-[1.8rem] border border-white/30 bg-white/85 p-3 shadow-[0_18px_40px_rgba(0,0,0,0.14)] backdrop-blur-xl">
                  <img src="/logo.svg" alt="Shetkari Vahi logo" className="h-24 w-24 object-contain drop-shadow-[0_18px_36px_rgba(0,0,0,0.25)]" />
                </div>
                <div>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-violet-700">
                    {copy.desktopEyebrow}
                  </p>
                  <h1 className="mt-2 text-[2.8rem] font-black tracking-tight text-slate-900" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    {copy.brandName}
                  </h1>
                  <p className="mt-1 text-sm font-medium text-slate-600">
                    {copy.verifiedText}
                  </p>
                </div>
              </div>

              <div className="mt-12 max-w-[34rem]">
                <h2 className="text-[2.45rem] font-black leading-[1.06] text-slate-900 sm:text-[2.8rem]">
                  {copy.heroLine1}
                  <br />
                  {copy.heroLine2}
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  {copy.loginHelp}
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[copy.milkTracking, copy.customerBilling, copy.labourManagement].map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.4rem] border border-violet-100 bg-white/92 px-4 py-4 text-sm font-semibold text-slate-700 shadow-lg shadow-violet-950/8 backdrop-blur-md"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          className="w-full lg:justify-self-end"
          variants={{ hidden: { opacity: 0, x: 18 }, visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } }}
        >
          <div className="mb-4 flex justify-center lg:hidden">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/50 bg-white/82 px-3 py-2 shadow-[0_18px_50px_rgba(91,33,182,0.10)] backdrop-blur-xl">
              <img src="/logo.svg" alt="Shetkari Vahi logo" className="h-12 w-12 rounded-2xl bg-white p-1.5 object-contain" />
              <div className="text-left">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-violet-700/80">
                  {copy.desktopEyebrow}
                </p>
                <p className="text-sm font-bold text-slate-900">{copy.brandName}</p>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[28rem] overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(250,247,255,0.92)_48%,rgba(244,239,255,0.96)_100%)] p-4 shadow-[0_24px_70px_rgba(91,33,182,0.14)] backdrop-blur-[34px] sm:p-6 lg:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(167,139,250,0.16),transparent_26%),radial-gradient(circle_at_80%_24%,rgba(255,255,255,0.55),transparent_28%),linear-gradient(145deg,rgba(255,255,255,0.2),rgba(255,255,255,0.04))]" />

            <div className="relative">
              <div className="hidden lg:flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-[1.35rem] border border-violet-100 bg-white p-2.5 shadow-[0_14px_30px_rgba(91,33,182,0.08)]">
                    <img src="/logo.svg" alt="Shetkari Vahi logo" className="h-14 w-14 object-contain" />
                  </div>
                  <div>
                    <p className="text-[0.66rem] font-semibold uppercase tracking-[0.32em] text-violet-700/70">
                      {copy.brandName}
                    </p>
                    <h2 className="text-[1.45rem] font-black tracking-tight text-slate-900">
                      {copy.welcomeBack}
                    </h2>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/90 px-3 py-1.5 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-violet-700">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {copy.verifiedText}
                </div>
              </div>

              <div className="lg:mt-5">
                <h2 className="text-[1.7rem] font-black leading-tight text-slate-900 sm:text-[1.95rem] lg:hidden">
                  {copy.welcomeBack}
                </h2>
                <p className="mt-2 text-[0.95rem] leading-6 text-slate-600 sm:text-sm sm:leading-7">
                  {copy.loginHelp}
                </p>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                {[copy.milkTracking, copy.customerBilling, copy.labourManagement].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-violet-100 bg-white/95 px-4 py-3 text-center text-sm font-semibold text-slate-700 shadow-[0_10px_28px_rgba(91,33,182,0.08)] backdrop-blur-md lg:text-left"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-6 lg:mt-8">
                {isGoogleSubmitting ? (
                  <div className="flex w-full items-center justify-center gap-3 rounded-full border border-violet-100 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700 dark:border-slate-600 dark:border-t-slate-200" />
                    {copy.googleLoading}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-full bg-white">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => {
                        toast.error('Google login failed.')
                      }}
                      shape="pill"
                      theme="outline"
                      size="large"
                      width="100%"
                      text="signin_with"
                    />
                  </div>
                )}
              </div>

              <div className="mt-4 text-center text-[0.74rem] font-medium tracking-wide text-slate-500 lg:text-left">
                {copy.signIn}
              </div>
            </div>
          </div>
        </motion.section>
      </motion.div>
    </div>
  )
}

export default Login
