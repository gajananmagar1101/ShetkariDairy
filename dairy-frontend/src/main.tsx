import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import axios from 'axios'

let apiUrl = import.meta.env.VITE_API_URL
if (apiUrl) {
  if (!apiUrl.startsWith('http')) {
    apiUrl = 'https://' + apiUrl
  }
  axios.defaults.baseURL = apiUrl
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
