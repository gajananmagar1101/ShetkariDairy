import React, { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { BadgeCheck } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useSettingsStore } from '../store/settingsStore'

const Login: React.FC = () => {
  const setAuth = useAuthStore((state) => state.setAuth)
  const language = useSettingsStore((state) => state.language)
  const toggleLanguage = useSettingsStore((state) => state.toggleLanguage)
  const navigate = useNavigate()
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)

  const isMarathi = language === 'mr'
  const copy = {
    brandName: isMarathi ? 'शेतकरी वही' : 'Shetkari Vahi',
    desktopEyebrow: isMarathi ? 'शेतकरी वही' : 'Shetkari Vahi',
    heroLine1: isMarathi ? 'दूध नोंदी, कामगार आणि' : 'Dairy records, workers and',
    heroLine2: isMarathi ? 'बिलिंग एकाच ठिकाणी.' : 'billing in one place.',
    milkTracking: isMarathi ? 'दूध नोंद' : 'Milk tracking',
    customerBilling: isMarathi ? 'ग्राहक बिलिंग' : 'Customer billing',
    labourManagement: isMarathi ? 'मजूर व्यवस्थापन' : 'Labour management',
    signIn: isMarathi ? 'Google ने साइन इन' : 'Sign in with Google',
    welcomeBack: isMarathi ? 'पुन्हा स्वागत आहे' : 'Welcome back',
    loginHelp: isMarathi
      ? 'लॉगिनसाठी Google खाते वापरा.'
      : 'Use your Google account to continue.',
    verifiedText: isMarathi ? 'सोपे आणि सुरक्षित लॉगिन' : 'Simple and secure login',
    googleLoading: isMarathi ? 'Google ने साइन इन सुरू आहे...' : 'Signing you in with Google...',
    languageA: isMarathi ? 'EN' : 'मराठी',
    languageB: isMarathi ? 'मराठी' : 'EN',
  }

  const completeAuth = (payload: {
    token: string
    name: string
    role: string
    picture?: string
    email?: string
    phone?: string
  }) => {
    const { token, name, role, picture, email, phone } = payload
    setAuth({ name, role, picture, email, phone }, token)
    navigate('/')
  }

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse?.credential || isGoogleSubmitting) {
      if (!credentialResponse?.credential) {
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

      completeAuth(response.data.data)
      toast.success(isMarathi ? 'लॉगिन यशस्वी झाले.' : 'Login successful.')
    } catch (error: any) {
      console.error('Google login error:', error)
      toast.error(error?.response?.data?.message || error?.message || 'Google authentication failed.')
    } finally {
      setIsGoogleSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-end justify-center overflow-x-hidden overflow-y-auto bg-slate-100 px-2 py-10 text-slate-900 dark:bg-slate-950 dark:text-white sm:items-center sm:px-4 sm:py-10">
      <div className="absolute right-3 top-3 z-20 sm:right-5 sm:top-5">
        <button
          type="button"
          onClick={toggleLanguage}
          className="rounded-full border border-white/45 bg-white/18 px-3 py-1.5 text-xs font-bold text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl transition hover:bg-white/24 sm:px-4 sm:py-2 sm:text-sm"
        >
          {copy.languageA} / {copy.languageB}
        </button>
      </div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-100"
          style={{ backgroundImage: "url('/login-bg-custom.png')", backgroundPosition: 'center 62%' }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_34%,rgba(255,196,110,0.34),transparent_24%),radial-gradient(circle_at_84%_16%,rgba(131,166,70,0.18),transparent_20%),linear-gradient(90deg,rgba(42,28,14,0.3)_0%,rgba(42,28,14,0.12)_24%,rgba(255,247,231,0.08)_54%,rgba(255,249,238,0.28)_100%)] dark:bg-[linear-gradient(90deg,rgba(2,6,23,0.78)_0%,rgba(2,6,23,0.58)_42%,rgba(15,23,42,0.42)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,247,231,0.08)_0%,rgba(255,247,231,0)_35%,rgba(248,250,252,0.12)_100%)]" />
        <div className="absolute left-[-8rem] top-[-6rem] h-72 w-72 rounded-full bg-amber-200/12 blur-3xl dark:bg-amber-700/12" />
        <div className="absolute right-[-10rem] top-[12%] h-96 w-96 rounded-full bg-lime-200/10 blur-3xl dark:bg-emerald-700/14" />
      </div>

      <div className="relative z-10 grid w-full max-w-5xl items-end gap-2 sm:gap-8 lg:items-center lg:gap-10 lg:grid-cols-[1fr_460px]">
        <section className="hidden lg:block">
          <div className="relative max-w-[36rem] overflow-hidden rounded-[1.8rem] shadow-[0_20px_56px_rgba(15,23,42,0.2)]">
            <div
              className="absolute inset-0 rounded-[1.8rem] bg-[linear-gradient(180deg,rgba(166,132,92,0.2)_0%,rgba(142,114,78,0.15)_36%,rgba(101,87,47,0.1)_68%,rgba(76,72,31,0.06)_100%)] backdrop-blur-[9px]"
              style={{
                WebkitMaskImage:
                  'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.42) 10%, rgba(0,0,0,0.88) 18%, black 26%, black 74%, rgba(0,0,0,0.88) 82%, rgba(0,0,0,0.42) 90%, rgba(0,0,0,0) 100%)',
                maskImage:
                  'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.42) 10%, rgba(0,0,0,0.88) 18%, black 26%, black 74%, rgba(0,0,0,0.88) 82%, rgba(0,0,0,0.42) 90%, rgba(0,0,0,0) 100%)',
              }}
            />
            <div
              className="absolute inset-0 rounded-[1.8rem] bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]"
              style={{
                WebkitMaskImage:
                  'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.38) 12%, rgba(0,0,0,0.8) 20%, black 28%, black 72%, rgba(0,0,0,0.8) 80%, rgba(0,0,0,0.38) 88%, rgba(0,0,0,0) 100%)',
                maskImage:
                  'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.38) 12%, rgba(0,0,0,0.8) 20%, black 28%, black 72%, rgba(0,0,0,0.8) 80%, rgba(0,0,0,0.38) 88%, rgba(0,0,0,0) 100%)',
              }}
            />
            <div className="relative rounded-[1.8rem] px-6 py-6">
              <div className="flex items-center gap-4">
                <img
                  src="/custom-brand-logo-cropped.png"
                  alt="Gharcha Dudh Logo"
                  className="h-24 w-24 object-contain drop-shadow-[0_18px_36px_rgba(0,0,0,0.3)]"
                />
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.34em] text-[#f5e6bd]">
                    {copy.desktopEyebrow}
                  </p>
                  <h1
                    className="mt-2 text-[2.8rem] font-black tracking-tight text-white"
                    style={{ fontFamily: "'Nunito', sans-serif" }}
                  >
                    {copy.brandName}
                  </h1>
                </div>
              </div>

              <h2 className="mt-14 max-w-[320px] text-base font-medium leading-7 text-white/95">
                {copy.heroLine1}
                <br />
                {copy.heroLine2}
              </h2>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                {[copy.milkTracking, copy.customerBilling, copy.labourManagement].map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.4rem] border border-white/20 bg-white/12 px-4 py-4 text-sm font-semibold text-white shadow-lg shadow-black/10 backdrop-blur-md"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="w-full">
          <div className="-mb-10 flex -translate-y-12 justify-center lg:hidden">
            <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-[radial-gradient(circle_at_50%_42%,rgba(255,242,206,0.18),rgba(255,226,150,0.08)_56%,rgba(255,255,255,0)_78%)]">
              <img
                src="/custom-brand-logo-cropped.png"
                alt="Gharcha Dudh Logo"
                className="relative h-36 w-36 animate-bounce-slow object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.18)]"
              />
            </div>
          </div>
          <div
            className="relative mx-auto my-auto w-full max-w-[20.5rem] -translate-y-4 overflow-hidden rounded-[1.7rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,248,235,0.06)_0%,rgba(248,219,172,0.03)_48%,rgba(126,101,37,0.035)_100%)] p-3 shadow-[0_20px_56px_rgba(15,23,42,0.1)] backdrop-blur-[34px] dark:border-slate-700/10 dark:bg-[linear-gradient(180deg,rgba(51,65,85,0.1)_0%,rgba(30,41,59,0.1)_100%)] sm:max-w-md sm:rounded-[2rem] sm:p-8 sm:shadow-[0_30px_80px_rgba(15,23,42,0.1)] lg:border-transparent lg:bg-transparent lg:shadow-[0_20px_56px_rgba(15,23,42,0.2)] lg:backdrop-blur-0"
          >
            <div
              className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.015))] lg:hidden"
              style={{
                WebkitMaskImage:
                  'radial-gradient(circle at center, black 42%, rgba(0,0,0,0.84) 58%, rgba(0,0,0,0.48) 76%, rgba(0,0,0,0.18) 90%, transparent 100%)',
                maskImage:
                  'radial-gradient(circle at center, black 42%, rgba(0,0,0,0.84) 58%, rgba(0,0,0,0.48) 76%, rgba(0,0,0,0.18) 90%, transparent 100%)',
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_28%_24%,rgba(255,230,170,0.12),transparent_26%),radial-gradient(circle_at_74%_36%,rgba(255,255,255,0.07),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.008))] lg:hidden"
              style={{
                WebkitMaskImage:
                  'radial-gradient(circle at center, black 48%, rgba(0,0,0,0.76) 66%, rgba(0,0,0,0.34) 84%, transparent 100%)',
                maskImage:
                  'radial-gradient(circle at center, black 48%, rgba(0,0,0,0.76) 66%, rgba(0,0,0,0.34) 84%, transparent 100%)',
              }}
            />
            <div className="pointer-events-none absolute inset-[8%] rounded-[inherit] bg-[radial-gradient(circle_at_center,rgba(255,218,165,0.18),rgba(255,218,165,0.08)_42%,transparent_78%)] blur-2xl lg:hidden" />
            <div
              className="pointer-events-none absolute inset-0 hidden rounded-[2rem] bg-[linear-gradient(180deg,rgba(166,132,92,0.2)_0%,rgba(142,114,78,0.15)_36%,rgba(101,87,47,0.1)_68%,rgba(76,72,31,0.06)_100%)] backdrop-blur-[9px] lg:block"
              style={{
                WebkitMaskImage:
                  'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.42) 10%, rgba(0,0,0,0.88) 18%, black 26%, black 74%, rgba(0,0,0,0.88) 82%, rgba(0,0,0,0.42) 90%, rgba(0,0,0,0) 100%)',
                maskImage:
                  'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.42) 10%, rgba(0,0,0,0.88) 18%, black 26%, black 74%, rgba(0,0,0,0.88) 82%, rgba(0,0,0,0.42) 90%, rgba(0,0,0,0) 100%)',
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 hidden rounded-[2rem] bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] lg:block"
              style={{
                WebkitMaskImage:
                  'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.38) 12%, rgba(0,0,0,0.8) 20%, black 28%, black 72%, rgba(0,0,0,0.8) 80%, rgba(0,0,0,0.38) 88%, rgba(0,0,0,0) 100%)',
                maskImage:
                  'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.38) 12%, rgba(0,0,0,0.8) 20%, black 28%, black 72%, rgba(0,0,0,0.8) 80%, rgba(0,0,0,0.38) 88%, rgba(0,0,0,0) 100%)',
              }}
            />

            <div className="relative lg:hidden">
              <div className="flex flex-col items-center text-center">
                <h1
                  className="text-[1.35rem] font-black tracking-tight text-white drop-shadow-[0_8px_20px_rgba(0,0,0,0.18)]"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  {copy.brandName}
                </h1>
                <p className="mt-2 text-[0.72rem] font-semibold tracking-[0.08em] text-white/80 sm:text-xs">
                  {copy.milkTracking} • {copy.customerBilling} • {copy.labourManagement}
                </p>
              </div>
            </div>

            <div className="relative mt-3 lg:hidden">
              {isGoogleSubmitting ? (
                <div className="flex w-full items-center justify-center gap-3 rounded-full border border-white/35 bg-white/78 px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700 dark:border-slate-600 dark:border-t-slate-200" />
                  {copy.googleLoading}
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="w-full max-w-[290px] overflow-hidden rounded-full">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => {
                        toast.error('Google login failed.')
                      }}
                      shape="pill"
                      theme="outline"
                      size="large"
                      width="290"
                      text="signin_with"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="relative hidden lg:block lg:mt-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-white/88">
                <BadgeCheck className="h-3.5 w-3.5" />
                {copy.verifiedText}
              </div>
              <h2 className="mt-3 text-[1.45rem] font-black leading-tight text-white sm:text-2xl">
                {copy.welcomeBack}
              </h2>
              <p className="mt-1.5 text-[0.92rem] leading-5 text-white sm:mt-2 sm:text-sm sm:leading-6">
                {copy.loginHelp}
              </p>
            </div>

            <div className="relative mt-6 hidden justify-center lg:flex">
              {isGoogleSubmitting ? (
                <div className="flex w-full max-w-[300px] items-center justify-center gap-3 rounded-full border border-white/45 bg-white/90 px-5 py-2.5 text-[0.92rem] font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:max-w-[320px] sm:px-6 sm:py-3 sm:text-sm">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700 dark:border-slate-600 dark:border-t-slate-200" />
                  {copy.googleLoading}
                </div>
              ) : (
                <div className="w-full max-w-[300px] overflow-hidden rounded-full sm:max-w-[320px]">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => {
                      toast.error('Google login failed.')
                    }}
                    shape="pill"
                    theme="outline"
                    size="large"
                    width="300"
                    text="signin_with"
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Login
