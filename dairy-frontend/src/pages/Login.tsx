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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#5F259F]"
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
      <div className="relative hidden w-[52%] items-center justify-center overflow-hidden bg-[#5F259F] lg:flex">
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
      <div className="relative flex flex-1 flex-col items-center justify-end bg-[#5F259F] px-6 pb-16 lg:justify-center lg:pb-0">
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
          className="absolute right-5 top-5 rounded-lg border border-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 transition hover:border-[#5F259F]/20 hover:text-[#5F259F]"
        >
          {copy.languageLabel}
        </button>

        <div
          className="w-full max-w-[360px] rounded-[3rem] border border-white/20 bg-white p-8 shadow-[0_16px_50px_rgba(0,0,0,0.25),0_6px_20px_rgba(95,37,159,0.3)] lg:rounded-[3.2rem] lg:p-10"
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
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-[#5F259F]" />
                {copy.googleLoading}
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-0 z-10 cursor-pointer rounded-full opacity-0 overflow-hidden">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => toast.error('Google login failed.')}
                    shape="pill"
                    theme="outline"
                    size="large"
                    width="300"
                    text="signin_with"
                  />
                </div>
                <div className="flex items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span className="text-[0.85rem] font-semibold text-slate-700">Sign in with Google</span>
                </div>
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
