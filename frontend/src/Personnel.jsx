// Module Administration · Gestion du personnel (RH) : employés, congés, absences, PDF, planning.
import React, { useCallback, useEffect, useState } from 'react'
import { api } from './api.js'

const EMPLOYE_VIDE = { nom: '', cin: '', fonction: '', telephone: '', email: '', horaire_travail: '', droit_conge_annuel: 18 }
const auj = () => new Date().toISOString().slice(0, 10)

function SoldeBadge({ e }) {
  const cls = e.negatif ? 'bg-red-100 text-red-700' : e.solde <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>Solde congés : {e.solde}/{e.droit} j{e.negatif && ' ⚠️'}</span>
}

function DetailEmploye({ id, onClose, onChange }) {
  const [e, setE] = useState(null)
  const [conge, setConge] = useState({ date_debut: auj(), date_fin: auj(), motif: '' })
  const [abs, setAbs] = useState({ date: auj(), justifiee: true, motif: '' })

  const recharger = useCallback(() => api.admin.employes.get(id).then(setE), [id])
  useEffect(() => { recharger() }, [recharger])
  if (!e) return null

  const majTout = () => { recharger(); onChange() }
  const ajoutConge = async () => { await api.admin.employes.addConge(id, conge); setConge({ date_debut: auj(), date_fin: auj(), motif: '' }); majTout() }
  const ajoutAbs = async () => { await api.admin.employes.addAbsence(id, abs); setAbs({ date: auj(), justifiee: true, motif: '' }); majTout() }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl my-8" onClick={ev => ev.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">{e.nom}</h2>
              <p className="text-gray-500">{e.fonction} · CIN {e.cin || '—'}</p>
              <p className="text-sm text-gray-400">{e.telephone} {e.email && '· ' + e.email}</p>
              <p className="text-sm text-gray-400">🕒 {e.horaire_travail || '—'}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <SoldeBadge e={e} />
            <button onClick={() => api.admin.telechargerPdf(`/admin/employes/${id}/attestation.pdf`, `attestation_${e.nom}.pdf`)}
                    className="text-sm bg-gray-800 text-white px-3 py-1 rounded-lg">📄 Attestation de travail</button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Droit annuel {e.droit} j · consommé {e.consomme} j</p>

          {/* Congés */}
          <section className="mt-5">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mb-2">Congés</h3>
            <div className="flex flex-wrap items-end gap-2 mb-3 bg-gray-50 rounded-lg p-3">
              <label className="text-xs text-gray-500">Du<input type="date" value={conge.date_debut} onChange={ev => setConge({ ...conge, date_debut: ev.target.value })} className="block border rounded p-1 text-sm" /></label>
              <label className="text-xs text-gray-500">Au<input type="date" value={conge.date_fin} onChange={ev => setConge({ ...conge, date_fin: ev.target.value })} className="block border rounded p-1 text-sm" /></label>
              <input placeholder="Motif" value={conge.motif} onChange={ev => setConge({ ...conge, motif: ev.target.value })} className="border rounded p-1 text-sm flex-1 min-w-[120px]" />
              <button onClick={ajoutConge} className="bg-emerald-600 text-white text-sm px-3 py-1.5 rounded-lg">+ Congé</button>
            </div>
            {e.conges.length === 0 ? <p className="text-sm text-gray-400">Aucun congé.</p> : (
              <div className="space-y-1">
                {e.conges.map(c => (
                  <div key={c.id} className="flex items-center gap-3 text-sm border-b py-1">
                    <span className="flex-1">{c.date_debut} → {c.date_fin} · <b>{c.nb_jours} j</b> {c.motif && `· ${c.motif}`}</span>
                    <button onClick={() => api.admin.telechargerPdf(`/admin/conges/${c.id}/ordre.pdf`, `ordre_conge_${e.nom}.pdf`)} className="text-blue-600 text-xs">📄 Ordre</button>
                    <button onClick={async () => { await api.admin.congeRemove(c.id); majTout() }} className="text-red-500 text-xs">Suppr.</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Absences */}
          <section className="mt-5">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mb-2">Absences <span className="normal-case font-normal text-xs text-gray-400">(justifiée = 0 j · non justifiée = −1 j)</span></h3>
            <div className="flex flex-wrap items-end gap-2 mb-3 bg-gray-50 rounded-lg p-3">
              <label className="text-xs text-gray-500">Date<input type="date" value={abs.date} onChange={ev => setAbs({ ...abs, date: ev.target.value })} className="block border rounded p-1 text-sm" /></label>
              <label className="text-xs text-gray-500 flex items-center gap-1 mt-4"><input type="checkbox" checked={abs.justifiee} onChange={ev => setAbs({ ...abs, justifiee: ev.target.checked })} />Justifiée</label>
              <input placeholder="Motif" value={abs.motif} onChange={ev => setAbs({ ...abs, motif: ev.target.value })} className="border rounded p-1 text-sm flex-1 min-w-[120px]" />
              <button onClick={ajoutAbs} className="bg-emerald-600 text-white text-sm px-3 py-1.5 rounded-lg">+ Absence</button>
            </div>
            {e.absences.length === 0 ? <p className="text-sm text-gray-400">Aucune absence.</p> : (
              <div className="space-y-1">
                {e.absences.map(a => (
                  <div key={a.id} className="flex items-center gap-3 text-sm border-b py-1">
                    <span className="flex-1">{a.date} · {a.justifiee ? <span className="text-emerald-600">Justifiée</span> : <span className="text-red-600">Non justifiée (−1 j)</span>} {a.motif && `· ${a.motif}`}</span>
                    <button onClick={async () => { await api.admin.absenceRemove(a.id); majTout() }} className="text-red-500 text-xs">Suppr.</button>
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

export default function Personnel() {
  const [employes, setEmployes] = useState([])
  const [form, setForm] = useState(null)
  const [detail, setDetail] = useState(null)

  const recharger = useCallback(() => api.admin.employes.list().then(setEmployes), [])
  useEffect(() => { recharger() }, [recharger])

  const enregistrer = async () => {
    const d = { ...form, droit_conge_annuel: parseInt(form.droit_conge_annuel) || 18 }
    if (form.id) await api.admin.employes.update(form.id, d)
    else await api.admin.employes.create(d)
    setForm(null); recharger()
  }

  const negatifs = employes.filter(e => e.negatif)

  return (
    <div>
      {negatifs.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
          ⚠️ <b>{negatifs.length}</b> employé(s) en solde de congés négatif : {negatifs.map(e => e.nom).join(', ')}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">👥 Personnel <span className="text-gray-400 font-normal text-sm">({employes.length})</span></h2>
        <button onClick={() => setForm({ ...EMPLOYE_VIDE })} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold">+ Nouvel employé</button>
      </div>

      {form && (
        <div className="bg-white rounded-xl shadow p-4 mb-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          {[['nom', 'Nom'], ['fonction', 'Fonction'], ['cin', 'CIN'], ['telephone', 'Téléphone'], ['email', 'Email'], ['horaire_travail', 'Horaire (ex: Lun-Sam 9h-18h)'], ['droit_conge_annuel', 'Droit congés/an']].map(([k, ph]) => (
            <input key={k} placeholder={ph} value={form[k] ?? ''} onChange={e => setForm({ ...form, [k]: e.target.value })} className="border rounded-lg p-2 text-sm" />
          ))}
          <div className="flex gap-2 col-span-2 md:col-span-3">
            <button onClick={enregistrer} className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg">Enregistrer</button>
            <button onClick={() => setForm(null)} className="bg-gray-300 px-4 py-1.5 rounded-lg">Annuler</button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {employes.map(e => (
          <div key={e.id} className="bg-white rounded-xl shadow p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold">{e.nom} {!e.actif && <span className="text-gray-400 text-sm">(inactif)</span>}</div>
                <div className="text-sm text-gray-500">{e.fonction || '—'}</div>
                <div className="text-xs text-gray-400 mt-0.5">🕒 {e.horaire_travail || '—'}</div>
              </div>
              <SoldeBadge e={e} />
            </div>
            <div className="flex gap-2 mt-3 text-sm">
              <button onClick={() => setDetail(e.id)} className="bg-emerald-600 text-white px-3 py-1 rounded-lg">Gérer</button>
              <button onClick={() => setForm({ ...e })} className="text-blue-600">Modifier</button>
              <button onClick={async () => { if (confirm(`Supprimer ${e.nom} ?`)) { await api.admin.employes.remove(e.id); recharger() } }} className="text-red-500">Supprimer</button>
            </div>
          </div>
        ))}
        {employes.length === 0 && <p className="text-gray-500">Aucun employé. Ajoutez-en un.</p>}
      </div>

      {/* Planning hebdomadaire simple */}
      {employes.length > 0 && (
        <div className="mt-8">
          <h3 className="font-bold mb-3">🗓️ Planning de l'équipe</h3>
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left"><tr>{['Employé', 'Fonction', 'Horaire de travail'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead>
              <tbody>
                {employes.filter(e => e.actif).map(e => (
                  <tr key={e.id} className="border-t">
                    <td className="p-3 font-medium">{e.nom}</td>
                    <td className="p-3 text-gray-500">{e.fonction || '—'}</td>
                    <td className={`p-3 ${e.horaire_travail ? '' : 'text-red-500'}`}>{e.horaire_travail || '⚠️ non défini'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detail && <DetailEmploye id={detail} onClose={() => setDetail(null)} onChange={recharger} />}
    </div>
  )
}
