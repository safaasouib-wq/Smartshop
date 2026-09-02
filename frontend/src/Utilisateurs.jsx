// Module Administration · Gestion des utilisateurs & droits (réservé à l'admin).
import React, { useCallback, useEffect, useState } from 'react'
import { api } from './api.js'

const VIDE = { email: '', nom: '', mot_de_passe: '', role: 'vendeur', permissions: [] }

export default function Utilisateurs() {
  const [users, setUsers] = useState([])
  const [perms, setPerms] = useState([])
  const [form, setForm] = useState(null)
  const [erreur, setErreur] = useState('')

  const recharger = useCallback(() => api.admin.utilisateurs.list().then(setUsers), [])
  useEffect(() => { recharger(); api.admin.permissionsList().then(setPerms) }, [recharger])

  const togglePerm = (cle) => setForm(f => ({
    ...f, permissions: f.permissions.includes(cle) ? f.permissions.filter(p => p !== cle) : [...f.permissions, cle],
  }))

  const enregistrer = async () => {
    setErreur('')
    try {
      if (form.id) await api.admin.utilisateurs.update(form.id, form)
      else await api.admin.utilisateurs.create(form)
      setForm(null); recharger()
    } catch (e) { setErreur(e.message) }
  }
  const supprimer = async (u) => {
    if (!confirm(`Supprimer ${u.email} ?`)) return
    try { await api.admin.utilisateurs.remove(u.id); recharger() } catch (e) { alert(e.message) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">🔐 Utilisateurs & droits <span className="text-gray-400 font-normal text-sm">({users.length})</span></h2>
        <button onClick={() => setForm({ ...VIDE })} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold">+ Nouvel utilisateur</button>
      </div>

      {form && (
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <input placeholder="Email" value={form.email} disabled={!!form.id} onChange={e => setForm({ ...form, email: e.target.value })} className="border rounded-lg p-2 text-sm disabled:bg-gray-100" />
            <input placeholder="Nom" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="border rounded-lg p-2 text-sm" />
            <input placeholder={form.id ? 'Nouveau mot de passe (option.)' : 'Mot de passe'} type="password" value={form.mot_de_passe} onChange={e => setForm({ ...form, mot_de_passe: e.target.value })} className="border rounded-lg p-2 text-sm" />
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="border rounded-lg p-2 text-sm">
              <option value="vendeur">Vendeur (droits limités)</option>
              <option value="admin">Administrateur (tous droits)</option>
            </select>
          </div>
          {form.role === 'vendeur' && (
            <div className="mb-3">
              <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Modules autorisés</div>
              <div className="flex flex-wrap gap-2">
                {perms.map(p => (
                  <label key={p.cle} className={`text-sm px-3 py-1.5 rounded-full cursor-pointer border ${form.permissions.includes(p.cle) ? 'bg-emerald-600 text-white border-transparent' : 'bg-white border-gray-200'}`}>
                    <input type="checkbox" className="hidden" checked={form.permissions.includes(p.cle)} onChange={() => togglePerm(p.cle)} />
                    {form.permissions.includes(p.cle) ? '✓ ' : ''}{p.libelle}
                  </label>
                ))}
              </div>
            </div>
          )}
          {form.role === 'admin' && <p className="text-sm text-emerald-700 mb-3">✓ Un administrateur a accès à tous les modules.</p>}
          {erreur && <p className="text-red-600 text-sm mb-2">{erreur}</p>}
          <div className="flex gap-2">
            <button onClick={enregistrer} className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg">Enregistrer</button>
            <button onClick={() => setForm(null)} className="bg-gray-300 px-4 py-1.5 rounded-lg">Annuler</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left"><tr>{['Email', 'Nom', 'Rôle', 'Modules autorisés', 'Actions'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t">
                <td className="p-3 font-medium">{u.email}</td>
                <td className="p-3 text-gray-500">{u.nom || '—'}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'}`}>
                    {u.role === 'admin' ? '👑 Admin' : 'Vendeur'}
                  </span>
                </td>
                <td className="p-3">
                  {u.role === 'admin' ? <span className="text-gray-400 text-xs">Tous les modules</span> :
                    <div className="flex flex-wrap gap-1">
                      {u.permissions.length === 0 ? <span className="text-red-400 text-xs">Aucun</span> :
                        u.permissions.map(p => <span key={p} className="text-xs bg-gray-100 rounded-full px-2 py-0.5">{p}</span>)}
                    </div>}
                </td>
                <td className="p-3">
                  <button onClick={() => setForm({ id: u.id, email: u.email, nom: u.nom, mot_de_passe: '', role: u.role, permissions: [...u.permissions] })} className="text-blue-600 mr-2">Modifier</button>
                  <button onClick={() => supprimer(u)} className="text-red-500">Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
