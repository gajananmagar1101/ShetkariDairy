import { StrictMode } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './lib/api'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId="554655172126-0imvqv0v7e00gi8rhmb3s3rhmlcmu4nb.apps.googleusercontent.com">
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
// Trigger deployment
// Trigger deployment again
