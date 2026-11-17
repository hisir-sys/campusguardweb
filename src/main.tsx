import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import './scroll-motion.css'
import './contact.css'
import './motion-pro.css'
import './polish.css'
import { initPolish } from './polish'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

initPolish()
