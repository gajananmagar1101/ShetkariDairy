import React, { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { useAuthStore } from '../store/useAuthStore'
import { useNavigate } from 'react-router-dom'

import axios from 'axios'

const Login: React.FC = () => {
  const setAuth = useAuthStore((state) => state.setAuth)
  const navigate = useNavigate()
  const [isSigningIn, setIsSigningIn] = useState(false)

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse?.credential) {
      alert('Google authentication token not received.')
      return
    }

    setIsSigningIn(true)
    try {
      const res = await axios.post('/api/auth/google', { token: credentialResponse.credential })
      if (res.data.success) {
        const { token, name, role, picture, email, phone } = res.data.data
        setAuth({ name, role, picture, email, phone }, token)
        navigate('/')
      } else {
        alert('Login failed. Please try again.')
        setIsSigningIn(false)
      }
    } catch (error) {
      console.error('Google login error:', error)
      alert('Authentication failed.')
      setIsSigningIn(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-300">
      
      {/* Blurred Mesh Gradient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/30 dark:bg-blue-600/20 rounded-full blur-[100px] sm:blur-[120px] animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute top-[20%] right-[-10%] w-[60%] h-[60%] bg-emerald-400/20 dark:bg-emerald-600/10 rounded-full blur-[100px] sm:blur-[120px] animate-pulse" style={{ animationDuration: '10s' }}></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] bg-purple-400/30 dark:bg-purple-600/20 rounded-full blur-[100px] sm:blur-[120px] animate-pulse" style={{ animationDuration: '12s' }}></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center animate-bounce-slow drop-shadow-2xl mt-4 sm:mt-8 mb-2 sm:mb-6">
          <img src="/logo.png" alt="Gharcha Dudh Logo" className="w-32 h-32 sm:w-40 sm:h-40 object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.2)] transform scale-150 sm:scale-[1.75]" />
        </div>
        <h2 className="mt-8 text-center text-5xl sm:text-[4rem] font-black text-slate-900 dark:text-white tracking-tight" style={{ fontFamily: "'Nunito', sans-serif" }}>
          Gharcha Dudh
        </h2>
        <p className="mt-4 text-center text-[11px] sm:text-[12px] font-semibold text-slate-500 dark:text-slate-400 uppercase" style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: '0.35em' }}>
          Manage &bull; Track &bull; Deliver
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-2xl py-10 px-6 shadow-2xl rounded-[2.5rem] sm:rounded-[3rem] sm:px-12 border border-white/50 dark:border-slate-700/50 flex flex-col items-center hover:bg-white/80 dark:hover:bg-slate-900/60 transition-all duration-500">
          <p className="text-slate-700 dark:text-slate-300 text-sm mb-8 text-center font-medium leading-relaxed">
            Welcome back! Please sign in with your Google account to access your dashboard.
          </p>
          {isSigningIn ? (
            <div className="flex w-full max-w-[320px] items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
              Signing you in...
            </div>
          ) : (
            <div className="transform transition-transform duration-300 hover:scale-105 active:scale-95">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => {
                  console.log('Login Failed')
                }}
                useOneTap
                shape="pill"
                theme="outline"
                size="large"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Login
