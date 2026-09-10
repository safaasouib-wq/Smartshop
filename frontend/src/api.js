// Client API — centralise les appels REST et le token JWT
const BASE = '/api'

export function getToken() { return sessionStorage.getItem('token') }
export function setToken(t) { sessionStorage.setItem('token', t) }
export function clearToken() { sessionStorage.removeItem('token') }

async function request(path, options = {}) {
  const headers = { 'ngrok-skip-browser-warning': 'true', ...(options.headers || {}) }
  if (getToken()) headers['Authorization'] = `Bearer ${getToken()}`
  if (options.body && !(options.body instanceof URLSearchParams))
    headers['Content-Type'] = 'application/json'

  const resp = await fetch(`${BASE}${path}`, { ...options, headers })
  if (resp.status === 401) { clearToken(); window.location.reload() }
  if (!resp.ok) throw new Error((await resp.json()).detail || 'Erreur serveur')
  return resp.status === 204 ? null : resp.json()
}

export const api = {
  login: (email, password) => {
    const body = new URLSearchParams({ username: email, password })
    return request('/auth/login', { method: 'POST', body })
  },
  moi: () => request('/auth/moi'),
  stats: () => request('/stats'),
  resumeJour: () => request('/resume-jour'),
  produits: {
    list: () => request('/produits'),
    create: (p) => request('/produits', { method: 'POST', body: JSON.stringify(p) }),
    update: (id, p) => request(`/produits/${id}`, { method: 'PUT', body: JSON.stringify(p) }),
    remove: (id) => request(`/produits/${id}`, { method: 'DELETE' }),
  },
  commandes: {
    list: () => request('/commandes'),
    setStatut: (id, statut) => request(`/commandes/${id}/statut?statut=${statut}`, { method: 'PUT' }),
    demarrerLivraison: (id) => request(`/commandes/${id}/livraison/demarrer`, { method: 'POST' }),
  },
  conversations: {
    list: () => request('/conversations'),
    messages: (id) => request(`/conversations/${id}/messages`),
    repondre: (id, texte) => request(`/conversations/${id}/repondre`, { method: 'POST', body: JSON.stringify({ texte }) }),
    rendreIA: (id) => request(`/conversations/${id}/rendre-ia`, { method: 'POST' }),
  },
  escalades: () => request('/escalades'),

  admin: {
    employes: {
      list: () => request('/admin/employes'),
      get: (id) => request(`/admin/employes/${id}`),
      create: (e) => request('/admin/employes', { method: 'POST', body: JSON.stringify(e) }),
      update: (id, e) => request(`/admin/employes/${id}`, { method: 'PUT', body: JSON.stringify(e) }),
      remove: (id) => request(`/admin/employes/${id}`, { method: 'DELETE' }),
      addConge: (id, c) => request(`/admin/employes/${id}/conges`, { method: 'POST', body: JSON.stringify(c) }),
      addAbsence: (id, a) => request(`/admin/employes/${id}/absences`, { method: 'POST', body: JSON.stringify(a) }),
    },
    congeRemove: (id) => request(`/admin/conges/${id}`, { method: 'DELETE' }),
    absenceRemove: (id) => request(`/admin/absences/${id}`, { method: 'DELETE' }),
    planning: () => request('/admin/planning'),
    clients: {
      list: () => request('/admin/clients'),
      get: (id) => request(`/admin/clients/${id}`),
      saveNotes: (id, notes) => request(`/admin/clients/${id}/notes`, { method: 'PUT', body: JSON.stringify({ notes }) }),
    },
    alertesStock: () => request('/admin/produits/alertes-stock'),
    recherchesProduits: () => request('/admin/recherches-produits'),
    produitToggle: (id) => request(`/admin/produits/${id}/toggle`, { method: 'POST' }),
    commandeDetail: (id) => request(`/admin/commandes/${id}`),
    rapports: (periode) => request(`/admin/rapports?periode=${periode}`),
    permissionsList: () => request('/admin/permissions'),
    utilisateurs: {
      list: () => request('/admin/utilisateurs'),
      create: (u) => request('/admin/utilisateurs', { method: 'POST', body: JSON.stringify(u) }),
      update: (id, u) => request(`/admin/utilisateurs/${id}`, { method: 'PUT', body: JSON.stringify(u) }),
      remove: (id) => request(`/admin/utilisateurs/${id}`, { method: 'DELETE' }),
    },
    telechargerPdf: telechargerPdf,
  },
}

// Téléchargement d'un PDF protégé (ajoute le token puis déclenche le download navigateur).
export async function telechargerPdf(path, filename) {
  const resp = await fetch(`${BASE}${path}`, {
    headers: {
      'ngrok-skip-browser-warning': 'true',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
  })
  if (!resp.ok) throw new Error('Téléchargement impossible')
  const url = URL.createObjectURL(await resp.blob())
  const a = document.createElement('a')
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}
