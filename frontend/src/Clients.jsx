// Module Administration · Base de données clients : segmentation, métriques, historique, notes.
import React, { useCallback, useEffect, useState } from 'react'
import { api } from './api.js'

const COULEUR_SEG = {
  VIP: 'bg-amber-100 text-amber-800', 'Fidèle': 'bg-emerald-100 text-emerald-700',
  Inactif: 'bg-gray-200 text-gray-500', Nouveau: 'bg-sky-100 text-sky-700', Client: 'bg-gray-100 text-gray-500',
}
const Seg = ({ s }) => <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${COULEUR_SEG[s] || COULEUR_SEG.Client}`}>{s === 'VIP' ? '⭐ VIP' : s}</span>
const dt = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—'

export function DetailClient({ id, onClose }) {
  const [c, setC] = useState(null)
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)

  const recharger = useCallback(() => api.admin.clients.get(id).then(d => { setC(d); setNotes(d.notes || '') }), [id])
  useEffect(() => { recharger() }, [recharger])
  if (!c) return null

  const sauverNotes = async () => { await api.admin.clients.saveNotes(id, notes); setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl my-8" onClick={ev => ev.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">{c.nom}</h2>
              <p className="text-gray-500 text-sm">{c.canal} · client depuis le {dt(c.date_premier_contact)}</p>
              <p className="text-sm text-gray-400">{c.telephone || '—'} {c.email && '· ' + c.email}</p>
              {c.adresse && <p className="text-sm text-gray-400">📍 {c.adresse}</p>}
            </div>
            <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4 text-center">
            {[['Commandes', c.nb_commandes], ['Total dépensé', `${c.total_depense} DH`], ['Panier moyen', `${c.panier_moyen} DH`]].map(([t, v]) => (
              <div key={t} className="bg-gray-50 rounded-xl p-3">
                <div className="text-xl font-bold">{v}</div><div className="text-xs text-gray-500">{t}</div>
              </div>
            ))}
          </div>

          <section className="mt-5">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mb-2">📝 Notes internes <span className="normal-case font-normal text-xs text-gray-400">(consultables par l'IA)</span></h3>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                      placeholder="Ex : allergie aux amandes, préfère être livré le samedi…"
                      className="w-full border rounded-lg p-2 text-sm" />
            <button onClick={sauverNotes} className="mt-1 bg-emerald-600 text-white text-sm px-3 py-1 rounded-lg">Enregistrer</button>
            {saved && <span className="text-emerald-600 text-sm ml-2">✓ enregistré</span>}
          </section>

          <section className="mt-5">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mb-2">Historique des commandes</h3>
            {c.commandes.length === 0 ? <p className="text-sm text-gray-400">Aucune commande.</p> : (
              <div className="space-y-1">
                {c.commandes.map(cmd => (
                  <div key={cmd.id} className="flex items-center gap-3 text-sm border-b py-1.5">
                    <span className="font-medium">#{cmd.id}</span>
                    <span className="text-gray-400">{dt(cmd.date)}</span>
                    <span className="flex-1 text-gray-500">{cmd.lignes.map(l => `${l.quantite}× ${l.produit}`).join(', ')}</span>
                    <span className="font-semibold">{cmd.total} DH</span>
                    <span className="text-xs text-gray-400">{cmd.statut}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default function Clients() {
  const [clients, setClients] = useState([])
  const [detail, setDetail] = useState(null)
  const [filtre, setFiltre] = useState('Tous')

  useEffect(() => { api.admin.clients.list().then(setClients) }, [])

  const segments = ['Tous', 'VIP', 'Fidèle', 'Nouveau', 'Inactif']
  const visibles = filtre === 'Tous' ? clients : clients.filter(c => c.segments.includes(filtre))
  const compte = (s) => clients.filter(c => c.segments.includes(s)).length

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-bold">🗂️ Clients <span className="text-gray-400 font-normal text-sm">({clients.length})</span></h2>
        <div className="flex gap-1.5 flex-wrap">
          {segments.map(s => (
            <button key={s} onClick={() => setFiltre(s)}
                    className={`text-xs px-3 py-1 rounded-full font-medium ${filtre === s ? 'bg-emerald-600 text-white' : 'bg-white shadow'}`}>
              {s}{s !== 'Tous' && ` (${compte(s)})`}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>{['Client', 'Canal', 'Segments', 'Cmd', 'Total', 'Panier moy.', 'Dernière'].map(h => <th key={h} className="p-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {visibles.map(c => (
              <tr key={c.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => setDetail(c.id)}>
                <td className="p-3 font-medium">{c.nom}</td>
                <td className="p-3 text-gray-500">{c.canal}</td>
                <td className="p-3"><div className="flex gap-1 flex-wrap">{c.segments.map(s => <Seg key={s} s={s} />)}</div></td>
                <td className="p-3">{c.nb_commandes}</td>
                <td className="p-3 font-semibold">{c.total_depense} DH</td>
                <td className="p-3 text-gray-500">{c.panier_moyen} DH</td>
                <td className="p-3 text-gray-400">{dt(c.derniere_commande)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibles.length === 0 && <p className="p-4 text-gray-500">Aucun client dans ce segment.</p>}
      </div>

      {detail && <DetailClient id={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
