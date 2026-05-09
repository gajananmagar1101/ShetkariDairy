import React, { useState, useRef, useEffect } from 'react'
import { Mail, Phone, User as UserIcon, Camera, Edit2, Check, X, Loader2 } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { resizeImage } from '../utils/imageUtils'
import axios from 'axios'

const Profile: React.FC = () => {
  const { user, setAuth, token } = useAuthStore()
  
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const [editName, setEditName] = useState(user?.name || '')
  const [editPhone, setEditPhone] = useState(user?.phone || '')
  const [editPicture, setEditPicture] = useState(user?.picture || '')
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) return;
      try {
        const res = await axios.get('/api/users/profile')
        if (res.data.success) {
          const fetchedUser = res.data.data;
          setAuth({ ...user, ...fetchedUser }, token as string)
        }
      } catch (error) {
        console.error("Failed to fetch latest profile", error)
      }
    }
    fetchProfile()
  }, [])

  useEffect(() => {
    if (user) {
      setEditName(user.name || '')
      setEditPhone(user.phone || '')
      setEditPicture(user.picture || '')
    }
  }, [user])

  if (!user) return null

  const handleImageClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const resizedBase64 = await resizeImage(file)
      setEditPicture(resizedBase64)
    } catch (error) {
      console.error('Failed to resize image:', error)
      alert('Failed to process image. Please try another one.')
    }
  }

  const handleSave = async () => {
    if (!editName.trim()) {
      alert('Name cannot be empty')
      return
    }

    setIsLoading(true)
    try {
      const payload: any = {
        name: editName.trim()
      }
      if (editPhone.trim()) {
        payload.phone = editPhone.trim()
      }
      if (editPicture) {
        payload.picture = editPicture
      }

      const res = await axios.put('/api/users/profile', payload)
      if (res.data.success) {
        // Update local store
        setAuth({
          ...user,
          name: payload.name,
          phone: payload.phone || user.phone,
          picture: payload.picture || user.picture
        }, token as string)
        setIsEditing(false)
      } else {
        alert(res.data.message || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('An error occurred while saving your profile.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setEditName(user.name || '')
    setEditPhone(user.phone || '')
    setEditPicture(user.picture || '')
    setIsEditing(false)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">My Profile</h1>
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors shadow-sm"
          >
            <Edit2 className="w-4 h-4" />
            <span className="hidden sm:inline">Edit Profile</span>
            <span className="sm:hidden">Edit</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button 
              onClick={handleCancel}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors shadow-sm disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Cancel</span>
            </button>
            <button 
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span className="hidden sm:inline">Save Changes</span>
              <span className="sm:hidden">Save</span>
            </button>
          </div>
        )}
      </div>
      
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-white/60 dark:border-slate-800/50 overflow-hidden relative transition-all duration-300">
        
        {/* Soft Mesh Gradient Header */}
        <div className="h-32 sm:h-40 bg-slate-50/50 dark:bg-slate-800/30 relative overflow-hidden">
          <div className="absolute top-[-30%] left-[-10%] w-[60%] h-[150%] bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[140%] bg-emerald-400/20 dark:bg-emerald-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-40%] left-[30%] w-[50%] h-[100%] bg-purple-400/20 dark:bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/40 dark:to-slate-900/40"></div>
        </div>
        
        <div className="px-6 pb-10 sm:px-10 flex flex-col items-center relative text-center">
          <div 
            onClick={handleImageClick}
            className={`-mt-16 w-32 h-32 sm:-mt-20 sm:w-40 sm:h-40 rounded-full border-[6px] border-white/80 dark:border-slate-900/80 bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shadow-xl relative z-10 transition-transform duration-300 backdrop-blur-sm ${isEditing ? 'cursor-pointer hover:scale-105 group' : ''}`}
          >
            {editPicture ? (
              <img src={editPicture} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-4xl sm:text-5xl font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                {editName ? editName.substring(0, 2).toUpperCase() : 'GM'}
              </span>
            )}
            
            {isEditing && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                <Camera className="w-8 h-8 text-white mb-1" />
                <span className="text-white text-xs font-medium tracking-wide shadow-sm">Change Photo</span>
              </div>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageChange} 
            accept="image/*" 
            className="hidden" 
          />
          
          <div className="mt-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isEditing && editName ? editName : user.name}
            </h2>
          </div>

          <div className="mt-10 w-full text-left space-y-5 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 border-b border-slate-200/50 dark:border-slate-800/50 pb-3 px-2">
              <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                Personal Details
              </h3>
              {isEditing && <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] sm:text-xs font-semibold rounded-full animate-pulse border border-blue-500/20">Editing</span>}
            </div>
            
            <div className="space-y-4 sm:space-y-5">
              {/* Name Field */}
              <div className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 p-4 rounded-2xl transition-all duration-300 backdrop-blur-md ${isEditing ? 'bg-blue-50/60 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/40 shadow-sm' : 'bg-white/60 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-800/60'}`}>
                <div className="flex items-center gap-3 sm:gap-0 sm:w-14 sm:justify-center">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-colors ${isEditing ? 'bg-blue-500 text-white shadow-blue-500/30' : 'bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                    <UserIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <p className="text-xs font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400 sm:hidden">Full Name</p>
                </div>
                <div className="flex-1 w-full">
                  <p className="hidden sm:block text-[11px] font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-1.5">Full Name</p>
                  {isEditing ? (
                    <input 
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-900 dark:text-white font-semibold outline-none transition-all shadow-sm"
                      placeholder="Enter your full name"
                      autoFocus
                    />
                  ) : (
                    <p className="text-base sm:text-lg font-bold text-slate-800 dark:text-white/90">{user.name}</p>
                  )}
                </div>
              </div>

              {/* Phone Field */}
              <div className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 p-4 rounded-2xl transition-all duration-300 backdrop-blur-md ${isEditing ? 'bg-blue-50/60 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/40 shadow-sm' : 'bg-white/60 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-800/60'}`}>
                <div className="flex items-center gap-3 sm:gap-0 sm:w-14 sm:justify-center">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-colors ${isEditing ? 'bg-green-500 text-white shadow-green-500/30' : 'bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                    <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <p className="text-xs font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400 sm:hidden">Mobile Number</p>
                </div>
                <div className="flex-1 w-full">
                  <p className="hidden sm:block text-[11px] font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-1.5">Mobile Number</p>
                  {isEditing ? (
                    <input 
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-900 dark:text-white font-semibold outline-none transition-all shadow-sm"
                      placeholder="Enter your mobile number"
                    />
                  ) : (
                    <p className="text-base sm:text-lg font-bold text-slate-800 dark:text-white/90">
                      {user.phone ? user.phone : <span className="text-slate-400 italic text-sm sm:text-base font-normal">Not added yet</span>}
                    </p>
                  )}
                </div>
              </div>

              {/* Email Field (Always Readonly) */}
              {user.email && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 p-4 rounded-2xl bg-white/60 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-800/60 transition-all duration-300 backdrop-blur-md">
                  <div className="flex items-center gap-3 sm:gap-0 sm:w-14 sm:justify-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 shadow-sm">
                      <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <p className="text-xs font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400 sm:hidden">Email Address</p>
                  </div>
                  <div className="flex-1 w-full overflow-hidden">
                    <p className="hidden sm:block text-[11px] font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-1.5">Email Address</p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                      <p className="text-base sm:text-lg font-bold text-slate-800 dark:text-white/90 truncate">
                        {user.email}
                      </p>
                      {isEditing && <span className="text-[10px] font-semibold text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded-md border border-slate-300/50 dark:border-slate-600/50 w-max shadow-sm">Unchangeable</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
