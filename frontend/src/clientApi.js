// API du compte client + persistance locale (token & panier survivent à la fermeture du site).
const TOKEN_KEY = 'client_token'
const COMPTE_KEY = 'client_compte'
const PANIER_KEY = 'panier'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const getCompte = () => { try { return JSON.parse(localStorage.getItem(COMPTE_KEY)) } catch { return null } }
export function connecter(token, compte) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(COMPTE_KEY, JSON.stringify(compte))
}
export function deconnecter() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(COMPTE_KEY)
}
export const authHeader = () => ({
  'ngrok-skip-browser-warning': 'true',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
})

// Panier persistant
export const lirePanier = () => { try { return JSON.parse(localStorage.getItem(PANIER_KEY)) || [] } catch { return [] } }
export const ecrirePanier = (p) => localStorage.setItem(PANIER_KEY, JSON.stringify(p))

async function post(path, body) {
  const r = await fetch(path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(body),
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.detail || 'Erreur')
  return d
}

export const clientApi = {
  inscription: (data) => post('/api/client/inscription', data),
  connexion: (data) => post('/api/client/connexion', data),
  moi: async () => {
    const r = await fetch('/api/client/moi', { headers: authHeader() })
    if (r.status === 401) { deconnecter(); throw new Error('Session expirée') }
    if (!r.ok) throw new Error('Erreur')
    return r.json()
  },
}
