import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Vitrine from './Vitrine.jsx'
import Suivi from './Suivi.jsx'

// Routage minimal sans dépendance :
//   /admin  → dashboard commerçant
//   /suivi  → suivi de commande (carte live)
//   sinon   → vitrine publique
const path = window.location.pathname
const page = path.startsWith('/admin') ? <App />
           : path.startsWith('/suivi') ? <Suivi />
           : <Vitrine />

ReactDOM.createRoot(document.getElementById('root')).render(page)
