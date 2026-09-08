// Dashboard commerçant SmartShop — module 5 du cahier des charges
// Vues : Stats (F5.7) · Produits (F5.2) · Commandes (F5.4) · Conversations (F5.5) · Escalades (F5.6)
import React, { useEffect, useState, useCallback } from 'react'
import { api, getToken, setToken, clearToken } from './api.js'
import Personnel from './Personnel.jsx'
import Clients, { DetailClient } from './Clients.jsx'
import ProduitsAdmin from './ProduitsAdmin.jsx'
import Rapports from './Rapports.jsx'
import Utilisateurs from './Utilisateurs.jsx'

// ------------------------------------------------------------------ Connexion (F5.1)
function Login({ onOk }) {
  const [email, setEmail] = useState('admin@smartshop.ma')
  const [password, setPassword] = useState('')
  const [erreur, setErreur] = useState('')

  const submit = async () => {
    try {
      const { access_token } = await api.login(email, password)
      setToken(access_token); onOk()
    } catch (e) { setErreur(e.message) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-96">
        <h1 className="text-2xl font-bold mb-1">SmartShop 🛍️</h1>
        <p className="text-gray-500 mb-6 text-sm">Espace commerçant</p>
        <input className="w-full border rounded-lg p-2 mb-3" placeholder="Email"
               value={email} onChange={e => setEmail(e.target.value)} />
        <input className="w-full border rounded-lg p-2 mb-3" type="password" placeholder="Mot de passe"
               value={password} onChange={e => setPassword(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && submit()} />
        {erreur && <p className="text-red-600 text-sm mb-2">{erreur}</p>}
        <button onClick={submit} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg p-2 font-semibold">
          Se connecter
        </button>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ Statistiques (F5.7)
// Résumé IA de la journée : structure claire pour le commerçant —
//   1) phrase de synthèse (LLM)  2) chiffres clés en tuiles  3) bloc « À surveiller ».
function ResumeIA() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const charger = useCallback(() => {
    setLoading(true)
    api.resumeJour().then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])
  useEffect(() => { charger() }, [charger])

  const f = data?.faits
  const dateJour = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const tuiles = f ? [
    ['💰', `${f.chiffre_affaires_dh} DH`, "Chiffre d'affaires"],
    ['🧾', f.commandes, 'Commandes'],
    ['🛒', `${f.panier_moyen_dh} DH`, 'Panier moyen'],
    ['🏆', f.top_produits?.[0]?.nom || '—', 'Produit vedette'],
  ] : []
  const aSurveiller = f ? [
    f.commandes_en_cours > 0 && ['🚚', `${f.commandes_en_cours} commande(s) en cours`, 'text-blue-700 bg-blue-50 border-blue-200'],
    f.clients_a_rappeler > 0 && ['🙋', `${f.clients_a_rappeler} client(s) à rappeler`, 'text-orange-700 bg-orange-50 border-orange-200'],
    f.alertes_stock > 0 && ['⚠️', `${f.alertes_stock} produit(s) en stock faible`, 'text-red-700 bg-red-50 border-red-200'],
  ].filter(Boolean) : []

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl shadow p-5 mb-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-amber-900 flex items-center gap-2">🤖 Résumé IA de la journée</h3>
        <div className="flex items-center gap-3">
          <span className="text-amber-700/80 text-sm capitalize">{dateJour}</span>
          <button onClick={charger} disabled={loading}
                  className="text-amber-700 text-sm hover:underline disabled:opacity-50">↻ Actualiser</button>
        </div>
      </div>

      {loading ? (
        <p className="text-amber-800/70 mt-3 text-sm">Génération du résumé…</p>
      ) : !f ? (
        <p className="text-amber-800/70 mt-3 text-sm">Aucune donnée pour aujourd'hui.</p>
      ) : (
        <>
          {/* 1) Synthèse en une phrase */}
          {data.resume && (
            <p className="text-amber-900 mt-2 italic leading-relaxed">« {data.resume} »</p>
          )}

          {/* 2) Chiffres clés */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {tuiles.map(([ico, val, lib]) => (
              <div key={lib} className="bg-white rounded-lg p-3 text-center shadow-sm">
                <div className="text-xl">{ico}</div>
                <div className="text-lg font-bold text-gray-800 truncate" title={String(val)}>{val}</div>
                <div className="text-xs text-gray-500">{lib}</div>
              </div>
            ))}
          </div>

          {/* 3) À surveiller / à faire */}
          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-800/70 mb-2">À surveiller</div>
            {aSurveiller.length ? (
              <div className="flex flex-wrap gap-2">
                {aSurveiller.map(([ico, txt, cls]) => (
                  <span key={txt} className={`text-sm px-3 py-1.5 rounded-full border ${cls}`}>{ico} {txt}</span>
                ))}
              </div>
            ) : (
              <span className="text-sm text-emerald-700">✅ Rien à signaler, tout est à jour.</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Stats() {
  const [stats, setStats] = useState(null)
  useEffect(() => { api.stats().then(setStats).catch(console.error) }, [])
  const cartes = stats ? [
    ['Conversations', stats.conversations_total, '💬'],
    ['Commandes', stats.commandes_total, '🧾'],
    ['Commandes (7 j)', stats.commandes_7_jours, '📈'],
    ['Chiffre d\'affaires', `${stats.chiffre_affaires_dh} DH`, '💰'],
    ['Taux d\'escalade', `${stats.taux_escalade} %`, '🙋'],
  ] : []
  return (
    <div>
      <ResumeIA />
      {!stats ? <p>Chargement…</p> : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {cartes.map(([titre, val, ico]) => (
            <div key={titre} className="bg-white rounded-xl shadow p-4">
              <div className="text-2xl">{ico}</div>
              <div className="text-2xl font-bold">{val}</div>
              <div className="text-gray-500 text-sm">{titre}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ Produits (F5.2)
const PRODUIT_VIDE = { nom: '', description: '', prix: 0, stock: 0, categorie: '', actif: true, image_url: '' }

function Produits() {
  const [produits, setProduits] = useState([])
  const [form, setForm] = useState(null) // null = fermé, sinon {id?, ...champs}

  const recharger = useCallback(() => api.produits.list().then(setProduits), [])
  useEffect(() => { recharger() }, [recharger])

  const sauvegarder = async () => {
    const { id, ...donnees } = form
    donnees.prix = parseFloat(donnees.prix); donnees.stock = parseInt(donnees.stock)
    if (id) await api.produits.update(id, donnees)
    else await api.produits.create(donnees)
    setForm(null); recharger()
  }

  return (
    <div>
      <button onClick={() => setForm({ ...PRODUIT_VIDE })}
              className="mb-4 bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold">+ Nouveau produit</button>

      {form && (
        <div className="bg-white rounded-xl shadow p-4 mb-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          {['nom', 'categorie', 'prix', 'stock', 'description'].map(champ => (
            <input key={champ} className="border rounded-lg p-2" placeholder={champ}
                   value={form[champ]} onChange={e => setForm({ ...form, [champ]: e.target.value })} />
          ))}
          <div className="flex gap-2">
            <button onClick={sauvegarder} className="bg-emerald-600 text-white px-4 rounded-lg">Enregistrer</button>
            <button onClick={() => setForm(null)} className="bg-gray-300 px-4 rounded-lg">Annuler</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>{['Produit', 'Catégorie', 'Prix (DH)', 'Stock', 'Actions'].map(h => <th key={h} className="p-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {produits.map(p => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-medium">{p.nom}{!p.actif && <span className="text-gray-400"> (inactif)</span>}</td>
                <td className="p-3">{p.categorie}</td>
                <td className="p-3">{p.prix}</td>
                <td className={`p-3 ${p.stock <= 3 ? 'text-red-600 font-bold' : ''}`}>{p.stock}</td>
                <td className="p-3 flex gap-2">
                  <button onClick={() => setForm({ ...p })} className="text-blue-600">Modifier</button>
                  <button onClick={async () => { await api.produits.remove(p.id); recharger() }}
                          className="text-red-600">Désactiver</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ Commandes (F5.4)
const STATUTS = ['nouvelle', 'en_preparation', 'prete', 'recuperee', 'annulee']
const COULEURS = { nouvelle: 'bg-blue-100 text-blue-800', en_preparation: 'bg-yellow-100 text-yellow-800', prete: 'bg-emerald-100 text-emerald-800', recuperee: 'bg-gray-200 text-gray-700', annulee: 'bg-red-100 text-red-800' }

function DetailCommande({ id, onClose, onVoirClient }) {
  const [c, setC] = useState(null)
  useEffect(() => { api.admin.commandeDetail(id).then(setC) }, [id])
  if (!c) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg my-8" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">Commande #{c.id}</h2>
              <p className="text-gray-500 text-sm">{new Date(c.date).toLocaleString('fr-FR')}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
          </div>
          <div className="flex gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${c.mode === 'livraison' ? 'bg-orange-100 text-orange-700' : 'bg-sky-100 text-sky-700'}`}>{c.mode === 'livraison' ? '🛵 Livraison' : '🏪 Retrait'}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${COULEURS[c.statut]}`}>{c.statut?.replace('_', ' ')}</span>
          </div>

          <div className="mt-4 bg-gray-50 rounded-xl p-3">
            <div className="font-semibold text-sm">{c.client.nom} <span className="text-gray-400 font-normal">· {c.client.canal}</span></div>
            {c.client.telephone && <div className="text-sm text-gray-500">{c.client.telephone}</div>}
            {c.mode === 'livraison' && c.adresse_livraison && <div className="text-sm text-gray-500">📍 {c.adresse_livraison}</div>}
            <button onClick={() => onVoirClient(c.client.id)} className="text-sm text-blue-600 mt-1">👤 Plus d'infos client →</button>
          </div>

          <table className="w-full text-sm mt-4">
            <tbody>
              {c.lignes.map((l, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2">{l.quantite}× {l.produit}</td>
                  <td className="py-2 text-right text-gray-400">{l.prix_unitaire} DH</td>
                  <td className="py-2 text-right font-medium">{l.sous_total} DH</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between font-bold mt-2"><span>Total</span><span>{c.total} DH</span></div>

          <button onClick={() => api.admin.telechargerPdf(`/admin/commandes/${c.id}/ticket.pdf`, `ticket_${c.id}.pdf`)}
                  className="mt-5 w-full bg-gray-800 text-white py-2 rounded-lg text-sm font-semibold">🧾 Imprimer le ticket (PDF)</button>
        </div>
      </div>
    </div>
  )
}

function Commandes() {
  const [commandes, setCommandes] = useState([])
  const [detail, setDetail] = useState(null)
  const [ficheClient, setFicheClient] = useState(null)
  const recharger = useCallback(() => api.commandes.list().then(setCommandes), [])
  useEffect(() => { recharger(); const t = setInterval(recharger, 10000); return () => clearInterval(t) }, [recharger])

  return (
    <div className="space-y-3">
      {commandes.map(c => (
        <div key={c.id} className="bg-white rounded-xl shadow p-4 flex flex-wrap items-center gap-4">
          <div className="font-bold">#{c.id}</div>
          <div className="text-gray-600">{c.client}</div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${c.mode === 'livraison' ? 'bg-orange-100 text-orange-700' : 'bg-sky-100 text-sky-700'}`}>
            {c.mode === 'livraison' ? '🛵 Livraison' : '🏪 Retrait'}
          </span>
          <div className="flex-1 text-sm text-gray-500">
            {c.lignes.map(l => `${l.quantite}× ${l.produit}`).join(' · ')}
          </div>
          <div className="font-semibold">{c.total} DH</div>
          <button onClick={() => setDetail(c.id)} className="text-sm text-blue-600">Détails</button>
          <select value={c.statut} onChange={async e => { await api.commandes.setStatut(c.id, e.target.value); recharger() }}
                  className={`rounded-full px-3 py-1 text-sm font-medium ${COULEURS[c.statut]}`}>
            {STATUTS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          {c.mode === 'livraison' && (
            c.suivi_livraison
              ? <a href={`/suivi?id=${c.id}`} target="_blank" rel="noreferrer"
                   className="text-sm text-emerald-700 font-medium">
                  {c.suivi_livraison === 'livree' ? '✅ Livrée' : '📍 Suivre'}
                </a>
              : <button onClick={async () => { await api.commandes.demarrerLivraison(c.id); recharger() }}
                        className="bg-orange-500 text-white text-sm px-3 py-1 rounded-lg font-medium">🛵 Lancer la livraison</button>
          )}
        </div>
      ))}
      {commandes.length === 0 && <p className="text-gray-500">Aucune commande pour le moment.</p>}
      {detail && <DetailCommande id={detail} onClose={() => setDetail(null)} onVoirClient={(cid) => { setDetail(null); setFicheClient(cid) }} />}
      {ficheClient && <DetailClient id={ficheClient} onClose={() => setFicheClient(null)} />}
    </div>
  )
}

// ------------------------------------------------------------------ Conversations (F5.5) + réponse (F4.4/F4.5)
function Conversations() {
  const [convs, setConvs] = useState([])
  const [active, setActive] = useState(null)
  const [messages, setMessages] = useState([])
  const [texte, setTexte] = useState('')

  const recharger = useCallback(() => api.conversations.list().then(setConvs), [])
  useEffect(() => { recharger(); const t = setInterval(recharger, 10000); return () => clearInterval(t) }, [recharger])

  const ouvrir = async (c) => { setActive(c); setMessages(await api.conversations.messages(c.id)) }
  const envoyer = async () => {
    if (!texte.trim()) return
    await api.conversations.repondre(active.id, texte)
    setTexte(''); ouvrir(active)
  }

  const STYLE = { client: 'bg-gray-200 self-start', ia: 'bg-emerald-100 self-end', commercant: 'bg-blue-100 self-end' }

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="space-y-2">
        {convs.map(c => (
          <div key={c.id} onClick={() => ouvrir(c)}
               className={`bg-white rounded-xl shadow p-3 cursor-pointer border-2 ${active?.id === c.id ? 'border-emerald-500' : 'border-transparent'}`}>
            <div className="flex justify-between">
              <span className="font-semibold">{c.client}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${c.statut === 'escaladee' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {c.statut === 'escaladee' ? '🙋 escaladée' : c.gere_par}
              </span>
            </div>
            <div className="text-xs text-gray-500">{c.canal} · {c.nb_messages} messages</div>
          </div>
        ))}
      </div>

      <div className="md:col-span-2 bg-white rounded-xl shadow p-4 flex flex-col h-[70vh]">
        {!active ? <p className="text-gray-500 m-auto">Sélectionner une conversation</p> : (
          <>
            <div className="flex justify-between items-center border-b pb-2 mb-2">
              <span className="font-bold">{active.client}</span>
              {active.statut === 'escaladee' && (
                <button onClick={async () => { await api.conversations.rendreIA(active.id); recharger(); setActive({ ...active, statut: 'active' }) }}
                        className="bg-emerald-600 text-white text-sm px-3 py-1 rounded-lg">🤖 Rendre la main à l'IA</button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col gap-2 py-2">
              {messages.map(m => (
                <div key={m.id} className={`rounded-xl px-3 py-2 max-w-[75%] text-sm ${STYLE[m.emetteur]}`}>
                  <div className="text-[10px] text-gray-500 font-semibold">{m.emetteur}</div>
                  {m.contenu}
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <input className="flex-1 border rounded-lg p-2" placeholder="Répondre au client…"
                     value={texte} onChange={e => setTexte(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && envoyer()} />
              <button onClick={envoyer} className="bg-blue-600 text-white px-4 rounded-lg">Envoyer</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ Escalades en attente (F5.6)
function Escalades() {
  const [escalades, setEscalades] = useState([])
  useEffect(() => {
    const charger = () => api.escalades().then(setEscalades)
    charger(); const t = setInterval(charger, 8000); return () => clearInterval(t)
  }, [])
  return (
    <div className="space-y-3">
      {escalades.map(e => (
        <div key={e.id} className="bg-white rounded-xl shadow p-4 border-l-4 border-red-500">
          <div className="font-semibold">🙋 {e.client} — conversation #{e.conversation_id}</div>
          <div className="text-sm text-gray-600">Raison : {e.raison || 'non précisée'}</div>
          <div className="text-xs text-gray-400">{new Date(e.date).toLocaleString('fr-FR')}</div>
        </div>
      ))}
      {escalades.length === 0 && <p className="text-gray-500">✅ Aucune escalade en attente.</p>}
    </div>
  )
}

// ------------------------------------------------------------------ Application
// Chaque onglet : [label, composant, permission requise] ('__admin__' = admin uniquement).
const ONGLETS = {
  stats: ['📊 Statistiques', Stats, 'stats'],
  produits: ['📦 Produits', ProduitsAdmin, 'produits'],
  commandes: ['🧾 Commandes', Commandes, 'commandes'],
  conversations: ['💬 Conversations', Conversations, 'conversations'],
  escalades: ['🙋 Escalades', Escalades, 'conversations'],
  personnel: ['👥 Personnel', Personnel, 'personnel'],
  clients: ['🗂️ Clients', Clients, 'clients'],
  rapports: ['📈 Rapports', Rapports, 'rapports'],
  utilisateurs: ['🔐 Utilisateurs', Utilisateurs, '__admin__'],
}

export default function App() {
  const [connecte, setConnecte] = useState(!!getToken())
  const [profil, setProfil] = useState(null)
  const [onglet, setOnglet] = useState(null)
  const [nbEscalades, setNbEscalades] = useState(0)

  // Charge le profil (rôle + permissions) à la connexion
  useEffect(() => {
    if (!connecte) { setProfil(null); return }
    api.moi().then(setProfil).catch(() => { clearToken(); setConnecte(false) })
  }, [connecte])

  const autorise = (perm) => profil && (profil.est_admin || (perm !== '__admin__' && profil.permissions.includes(perm)))
  const onglets = profil ? Object.entries(ONGLETS).filter(([, [, , perm]]) => autorise(perm)) : []

  // Sélectionne le premier onglet autorisé
  useEffect(() => {
    if (onglets.length && (!onglet || !onglets.find(([c]) => c === onglet))) setOnglet(onglets[0][0])
  }, [profil])

  useEffect(() => {
    if (!connecte || !autorise('conversations')) return
    const charger = () => api.escalades().then(e => setNbEscalades(e.length)).catch(() => {})
    charger(); const t = setInterval(charger, 8000); return () => clearInterval(t)
  }, [connecte, profil])

  if (!connecte) return <Login onOk={() => setConnecte(true)} />
  if (!profil || !onglet) return <p className="p-8 text-gray-400">Chargement…</p>
  const Vue = ONGLETS[onglet][1]

  return (
    <div className="max-w-6xl mx-auto p-4">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">SmartShop 🛍️ <span className="text-gray-400 font-normal text-sm">Dashboard commerçant</span></h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{profil.nom || profil.email} · {profil.est_admin ? '👑 Admin' : 'Vendeur'}</span>
          <button onClick={() => { clearToken(); setConnecte(false) }} className="text-sm text-gray-500 hover:text-red-600">Déconnexion</button>
        </div>
      </header>
      <nav className="flex gap-2 mb-6 flex-wrap">
        {onglets.map(([cle, [label]]) => (
          <button key={cle} onClick={() => setOnglet(cle)}
                  className={`px-4 py-2 rounded-full text-sm font-medium relative ${onglet === cle ? 'bg-emerald-600 text-white' : 'bg-white shadow'}`}>
            {label}
            {cle === 'escalades' && nbEscalades > 0 &&
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{nbEscalades}</span>}
          </button>
        ))}
      </nav>
      <Vue />
    </div>
  )
}
