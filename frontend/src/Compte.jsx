// Compte client : modale connexion/inscription + panneau « Mon compte » (commandes en cours + historique).
import React, { useEffect, useState } from 'react'
import { clientApi, connecter, deconnecter } from './clientApi.js'

const OR = '#0b0b0b'

function Modale({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

export function AuthModal({ onClose, onAuth }) {
  const [tab, setTab] = useState('connexion')
  const [f, setF] = useState({ nom: '', email: '', mot_de_passe: '', telephone: '' })
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const maj = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const soumettre = async () => {
    setErreur(''); setEnvoi(true)
    try {
      const d = tab === 'connexion'
        ? await clientApi.connexion({ email: f.email, mot_de_passe: f.mot_de_passe })
        : await clientApi.inscription(f)
      connecter(d.token, d.client)
      onAuth(d.client); onClose()
    } catch (e) { setErreur(e.message); setEnvoi(false) }
  }

  return (
    <Modale onClose={onClose}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[11px] tracking-[0.3em] uppercase">Mon compte</h2>
          <button onClick={onClose} className="text-stone-400 text-2xl leading-none">×</button>
        </div>
        <div className="flex gap-2 mb-5">
          {[['connexion', 'Connexion'], ['inscription', 'Créer un compte']].map(([v, t]) => (
            <button key={v} onClick={() => { setTab(v); setErreur('') }}
                    className={`flex-1 py-2 text-[10px] tracking-[0.22em] uppercase ${tab === v ? 'text-white' : 'bg-stone-100 text-stone-500'}`}
                    style={tab === v ? { background: OR } : {}}>{t}</button>
          ))}
        </div>
        <div className="space-y-3">
          {tab === 'inscription' && (
            <input value={f.nom} onChange={maj('nom')} placeholder="Votre nom" className="w-full border border-[#e3e1dd] p-3 text-sm focus:outline-none focus:border-black" />
          )}
          <input value={f.email} onChange={maj('email')} type="email" placeholder="Email" className="w-full border border-[#e3e1dd] p-3 text-sm focus:outline-none focus:border-black" />
          <input value={f.mot_de_passe} onChange={maj('mot_de_passe')} type="password" placeholder="Mot de passe"
                 onKeyDown={e => e.key === 'Enter' && soumettre()} className="w-full border border-[#e3e1dd] p-3 text-sm focus:outline-none focus:border-black" />
          {tab === 'inscription' && (
            <input value={f.telephone} onChange={maj('telephone')} placeholder="Téléphone (optionnel)" className="w-full border border-[#e3e1dd] p-3 text-sm focus:outline-none focus:border-black" />
          )}
        </div>
        {erreur && <p className="text-red-600 text-sm mt-3">{erreur}</p>}
        <button onClick={soumettre} disabled={envoi}
                className="w-full mt-6 text-white text-[10px] tracking-[0.3em] uppercase py-4 disabled:opacity-50" style={{ background: OR }}>
          {envoi ? '…' : tab === 'connexion' ? 'Se connecter' : 'Créer mon compte'}
        </button>
      </div>
    </Modale>
  )
}

function Ligne({ c }) {
  const badge = c.mode === 'livraison' ? '🛵 Livraison' : '🏪 Retrait'
  const etat = c.mode === 'livraison'
    ? ({ '': 'À préparer', en_route: 'En route', proche: 'Bientôt chez vous', livree: 'Livrée' }[c.suivi_livraison] || c.statut)
    : c.statut
  return (
    <div className="border border-[#e3e1dd] p-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">Commande #{c.id}</span>
        <span className="text-xs text-stone-400">{new Date(c.date).toLocaleDateString('fr-FR')}</span>
      </div>
      <div className="text-xs text-stone-500 mt-0.5">{badge} · {c.lignes.map(l => `${l.quantite}× ${l.produit}`).join(', ')}</div>
      <div className="flex items-center justify-between mt-2">
        <span className="font-semibold" style={{ color: OR }}>{c.total} DH</span>
        <span className="text-[10px] tracking-[0.2em] uppercase px-2 py-0.5 bg-stone-100 text-stone-600">{etat}</span>
      </div>
    </div>
  )
}

export function ComptePanel({ compte, onClose, onLogout, onRecommander }) {
  const [data, setData] = useState(null)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    clientApi.moi().then(setData).catch(e => setErreur(e.message))
  }, [])

  const deco = () => { deconnecter(); onLogout() }

  return (
    <Modale onClose={onClose}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[11px] tracking-[0.3em] uppercase">Bonjour {compte.nom}</h2>
          <button onClick={onClose} className="text-stone-400 text-2xl leading-none">×</button>
        </div>
        <p className="text-sm text-stone-400 mb-5">{compte.email}</p>

        {erreur && <p className="text-red-600 text-sm">{erreur}</p>}
        {!data ? <p className="text-stone-400 text-sm py-6 text-center">Chargement…</p> : (
          <>
            <section className="mb-6">
              <h3 className="text-xs uppercase tracking-wider text-stone-400 mb-2">Commande{data.en_cours.length > 1 ? 's' : ''} en cours</h3>
              {data.en_cours.length === 0
                ? <p className="text-sm text-stone-400">Aucune commande en cours.</p>
                : <div className="space-y-2">
                    {data.en_cours.map(c => (
                      <div key={c.id}>
                        <Ligne c={c} />
                        <a href={c.suivi_url} className="text-xs font-semibold inline-block mt-1" style={{ color: OR }}>📍 Suivre ma commande →</a>
                      </div>
                    ))}
                  </div>}
            </section>

            <section>
              <h3 className="text-xs uppercase tracking-wider text-stone-400 mb-2">Historique</h3>
              {data.historique.length === 0
                ? <p className="text-sm text-stone-400">Pas encore de commande passée.</p>
                : <div className="space-y-2">
                    {data.historique.map(c => (
                      <div key={c.id}>
                        <Ligne c={c} />
                        <button onClick={() => onRecommander(c.lignes)}
                                className="text-xs font-semibold mt-1" style={{ color: OR }}>🔁 Recommander</button>
                      </div>
                    ))}
                  </div>}
            </section>
          </>
        )}

        <button onClick={deco} className="w-full mt-8 text-[10px] tracking-[0.25em] uppercase text-stone-500 hover:text-black border border-[#e3e1dd] py-3">
          Se déconnecter
        </button>
      </div>
    </Modale>
  )
}
