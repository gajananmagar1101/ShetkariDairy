import React, { useState } from 'react'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import axios from 'axios'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/useAuthStore'
import { useSettingsStore } from '../store/settingsStore'
import { LoadingBlock } from '../components/ui/loading'
import { Logo } from '../components/ui/Logo'

const Login: React.FC = () => {
  const setAuth = useAuthStore((state) => state.setAuth)
  const language = useSettingsStore((state) => state.language)
  const toggleLanguage = useSettingsStore((state) => state.toggleLanguage)
  const hasHydrated = useAuthStore((state) => state.hasHydrated)
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)
  const [introPhase, setIntroPhase] = useState<'zoom' | 'done'>('zoom')

  const isMarathi = language === 'mr'
  const copy = {
    brandName: isMarathi ? 'शेतकरी वही' : 'Shetkari Vahi',
    tagline: isMarathi ? 'दूध नोंदी • बिलिंग • मजूर व्यवस्थापन' : 'Milk records • Billing • Labour management',
    welcome: isMarathi ? 'सुरू करा' : 'Get Started',
    googleLoading: isMarathi ? 'साइन इन सुरू आहे...' : 'Signing in...',
    languageLabel: isMarathi ? 'EN' : 'मरा',
    terms: isMarathi ? 'साइन इन करून तुम्ही सेवा अटी स्वीकारता' : 'By signing in you agree to our terms',
  }
  const mobileGridStyle = {
    backgroundImage:
      'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
    backgroundSize: '48px 48px',
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
      toast.success(isMarathi ? 'लॉगिन यशस्वी.' : 'Login successful.')
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
    return <LoadingBlock label={isMarathi ? 'लोड होत आहे...' : 'Loading...'} minHeightClassName="min-h-screen" />
  }

  return (
    <>
      {/* Intro: Logo appears, scales up, fades out to reveal login */}
      {introPhase === 'zoom' && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#355E3B]"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5, delay: 1.8 }}
          onAnimationComplete={() => setIntroPhase('done')}
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Logo size={72} className="rounded-[20px] shadow-[0_30px_80px_rgba(0,0,0,0.4)]" />
          </motion.div>
          <motion.h1
            className="absolute mt-32 text-2xl font-bold text-white/90"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            शेतकरी वही
          </motion.h1>
        </motion.div>
      )}

      {/* Login page */}
      <div className="relative flex min-h-screen overflow-hidden">
      {/* Left panel — brand/visual */}
      <div className="relative hidden w-[52%] items-center justify-center overflow-hidden bg-[#355E3B] lg:flex">
        {/* Gradient mesh overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(167,139,250,0.3),transparent_50%),radial-gradient(ellipse_at_80%_20%,rgba(124,58,237,0.4),transparent_40%),radial-gradient(ellipse_at_50%_90%,rgba(91,33,182,0.5),transparent_45%)]" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        {/* Content */}
        <div className="relative z-10 max-w-md px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <Logo size={64} className="rounded-[16px] shadow-[0_20px_50px_rgba(0,0,0,0.3)]" />
            <h1 className="mt-7 text-[2.4rem] font-black leading-[1.1] tracking-tight text-white">
              {copy.brandName}
            </h1>
            <p className="mt-3 text-[0.95rem] font-medium leading-relaxed text-white/70">
              {copy.tagline}
            </p>

            {/* Stats bar */}
            <div className="mt-10 flex gap-6">
              <div>
                <p className="text-2xl font-black text-white">500+</p>
                <p className="text-xs text-white/50">{isMarathi ? 'ग्राहक' : 'Customers'}</p>
              </div>
              <div className="h-10 w-px bg-white/15" />
              <div>
                <p className="text-2xl font-black text-white">₹2L+</p>
                <p className="text-xs text-white/50">{isMarathi ? 'व्यवहार' : 'Transactions'}</p>
              </div>
              <div className="h-10 w-px bg-white/15" />
              <div>
                <p className="text-2xl font-black text-white">99%</p>
                <p className="text-xs text-white/50">{isMarathi ? 'अपटाइम' : 'Uptime'}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full border border-white/10" />
        <div className="absolute -bottom-10 -right-10 h-44 w-44 rounded-full border border-white/8" />
        <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full border border-white/6" />
      </div>

      {/* Right panel — login form */}
      <div className="relative flex flex-1 flex-col items-center justify-center bg-[#355E3B] px-4 pb-8 pt-16 lg:justify-center lg:px-6 lg:pb-0 lg:pt-0">
        <div className="pointer-events-none absolute inset-0 lg:hidden">
          <div className="absolute inset-0 bg-[#355E3B] bg-[radial-gradient(ellipse_at_20%_50%,rgba(167,139,250,0.28),transparent_55%),radial-gradient(ellipse_at_80%_20%,rgba(124,58,237,0.24),transparent_42%),radial-gradient(ellipse_at_50%_90%,rgba(91,33,182,0.35),transparent_45%)]" />
          <div className="absolute inset-0 opacity-[0.05]" style={mobileGridStyle} />
          <div className="absolute -left-16 top-20 h-56 w-56 rounded-full border border-white/10" />
          <div className="absolute -right-16 bottom-16 h-44 w-44 rounded-full border border-white/10" />
        </div>
        {/* Light accents from top, right, bottom */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 top-0 h-[300px] w-[300px] rounded-full bg-white/10 blur-[80px]" />
          <div className="absolute -top-20 left-1/3 h-[250px] w-[250px] rounded-full bg-white/8 blur-[70px]" />
          <div className="absolute -bottom-16 right-1/4 h-[280px] w-[280px] rounded-full bg-white/7 blur-[75px]" />
        </div>
        {/* Language toggle */}
        <button
          type="button"
          onClick={toggleLanguage}
          className="absolute right-5 top-5 rounded-lg border border-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 transition hover:border-[#355E3B]/20 hover:text-[#355E3B]"
        >
          {copy.languageLabel}
        </button>

        <div className="relative z-10 flex w-full max-w-[390px] flex-col items-center gap-4 lg:hidden">
          <div className="inline-flex items-center gap-3 rounded-[1.5rem] border border-white/20 bg-white/12 px-4 py-3 shadow-[0_18px_44px_rgba(0,0,0,0.18)] backdrop-blur-xl">
            <Logo size={42} className="rounded-[12px]" />
            <div className="min-w-0 text-left">
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.28em] text-white/70">
                {copy.brandName}
              </p>
              <p className="truncate text-sm font-medium text-white/85">
                {copy.tagline}
              </p>
            </div>
          </div>

          <div
            className="w-full rounded-[2.25rem] border border-white/30 bg-white p-5 shadow-[0_20px_70px_rgba(0,0,0,0.25),0_10px_30px_rgba(95,37,159,0.18)] backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <Logo size={40} className="rounded-[11px]" />
              <div>
                <h1 className="text-[1rem] font-bold tracking-tight text-slate-900">
                  {copy.brandName}
                </h1>
                <p className="text-[0.68rem] text-slate-400">
                  {copy.tagline}
                </p>
              </div>
            </div>

            <h2 className="mt-5 text-[1.45rem] font-black tracking-tight text-slate-900">
              {copy.welcome}
            </h2>
            <p className="mt-2 text-[0.9rem] leading-6 text-slate-500">
              {copy.tagline}
            </p>

            <div className="mt-5">
              {isGoogleSubmitting ? (
                <div className="flex items-center justify-center gap-2.5 rounded-full border border-slate-200 bg-slate-50 px-5 py-3.5 text-[0.82rem] font-medium text-slate-500">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-[#355E3B]" />
                  {copy.googleLoading}
                </div>
              ) : (
                <div className="overflow-hidden rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => toast.error('Google login failed.')}
                    shape="pill"
                    theme="outline"
                    size="large"
                    width="100%"
                    text="signin_with"
                  />
                </div>
              )}
            </div>

            <p className="mt-4 text-center text-[0.68rem] leading-5 text-slate-400">
              {copy.terms}
            </p>
          </div>
        </div>

        <div
          className="hidden w-full max-w-[360px] rounded-[3rem] border border-white/20 bg-white p-8 shadow-[0_16px_50px_rgba(0,0,0,0.25),0_6px_20px_rgba(95,37,159,0.3)] lg:block lg:rounded-[3.2rem] lg:p-10"
        >
          {/* Logo + Brand */}
          <div className="flex items-center gap-3">
            <Logo size={42} className="rounded-[11px]" />
            <div>
              <h1 className="text-[1.05rem] font-bold tracking-tight text-slate-900">{copy.brandName}</h1>
              <p className="text-[0.65rem] text-slate-400">{copy.tagline}</p>
            </div>
          </div>

          {/* Welcome */}
          <h2 className="mt-6 text-[1.35rem] font-black tracking-tight text-slate-900">
            {copy.welcome}
          </h2>

          {/* Sign in button */}
          <div className="mt-5">
            {isGoogleSubmitting ? (
              <div className="flex items-center justify-center gap-2.5 rounded-full border border-slate-200 bg-slate-50 px-5 py-3.5 text-[0.82rem] font-medium text-slate-500">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-[#355E3B]" />
                {copy.googleLoading}
              </div>
            ) : (
              <div className="overflow-hidden rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast.error('Google login failed.')}
                  shape="pill"
                  theme="outline"
                  size="large"
                  width="100%"
                  text="signin_with"
                />
              </div>
            )}
          </div>

          {/* Terms */}
          <p className="mt-4 text-center text-[0.66rem] text-slate-300">
            {copy.terms}
          </p>
        </div>
      </div>
      </div>
    </>
  )
}

export default Login
