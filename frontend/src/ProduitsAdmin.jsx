// Module Administration · Gestion des produits enrichie : image, catégorie imposée,
// alerte stock faible, activation saisonnière, produits demandés dans les conversations.
import React, { useCallback, useEffect, useState } from 'react'
import { api } from './api.js'

const CATEGORIES = ['Vêtements', 'Sacs', 'Montres']
const VIDE = { nom: '', description: '', prix: 0, stock: 0, seuil_stock: 5, categorie: 'Vêtements', image_url: '', actif: true }

export default function ProduitsAdmin() {
  const [produits, setProduits] = useState([])
  const [alertes, setAlertes] = useState([])
  const [demande, setDemande] = useState({ demandes: [], non_satisfaites: [] })
  const [form, setForm] = useState(null)

  const recharger = useCallback(() => {
    api.produits.list().then(setProduits)
    api.admin.alertesStock().then(setAlertes)
    api.admin.recherchesProduits().then(setDemande)
  }, [])
  useEffect(() => { recharger() }, [recharger])

  const sauver = async () => {
    const d = { ...form, prix: parseFloat(form.prix), stock: parseInt(form.stock), seuil_stock: parseInt(form.seuil_stock) || 5 }
    if (form.id) await api.produits.update(form.id, d)
    else await api.produits.create(d)
    setForm(null); recharger()
  }
  const toggle = async (id) => { await api.admin.produitToggle(id); recharger() }

  return (
    <div>
      {/* Alerte stock faible */}
      {alertes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          <div className="font-semibold text-amber-800 text-sm mb-1">⚠️ À réapprovisionner ({alertes.length})</div>
          <div className="flex flex-wrap gap-2">
            {alertes.map(a => (
              <span key={a.id} className="text-xs bg-white rounded-full px-3 py-1 border border-amber-200">
                {a.nom} : <b className={a.stock === 0 ? 'text-red-600' : 'text-amber-700'}>{a.stock}</b> / seuil {a.seuil_stock}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">📦 Produits <span className="text-gray-400 font-normal text-sm">({produits.length})</span></h2>
        <button onClick={() => setForm({ ...VIDE })} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold">+ Nouveau produit</button>
      </div>

      {form && (
        <div className="bg-white rounded-xl shadow p-4 mb-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          <input placeholder="Nom" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="border rounded-lg p-2 text-sm" />
          <select value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })} className="border rounded-lg p-2 text-sm">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input placeholder="Prix (DH)" type="number" value={form.prix} onChange={e => setForm({ ...form, prix: e.target.value })} className="border rounded-lg p-2 text-sm" />
          <input placeholder="Stock" type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} className="border rounded-lg p-2 text-sm" />
          <input placeholder="Seuil d'alerte stock" type="number" value={form.seuil_stock} onChange={e => setForm({ ...form, seuil_stock: e.target.value })} className="border rounded-lg p-2 text-sm" />
          <input placeholder="URL de l'image" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} className="border rounded-lg p-2 text-sm" />
          <input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="border rounded-lg p-2 text-sm col-span-2 md:col-span-3" />
          {form.image_url && <img src={form.image_url} alt="" className="h-16 w-16 object-cover rounded-lg" />}
          <div className="flex gap-2 items-center col-span-2 md:col-span-3">
            <button onClick={sauver} className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg">Enregistrer</button>
            <button onClick={() => setForm(null)} className="bg-gray-300 px-4 py-1.5 rounded-lg">Annuler</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left"><tr>{['', 'Produit', 'Catégorie', 'Prix', 'Stock', 'État', 'Actions'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead>
          <tbody>
            {produits.map(p => (
              <tr key={p.id} className="border-t">
                <td className="p-2">{p.image_url ? <img src={p.image_url} alt="" className="h-10 w-10 object-cover rounded" /> : <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center">👜</div>}</td>
                <td className="p-3 font-medium">{p.nom}</td>
                <td className="p-3 text-gray-500">{p.categorie}</td>
                <td className="p-3">{p.prix} DH</td>
                <td className={`p-3 ${p.stock <= p.seuil_stock ? 'text-red-600 font-bold' : ''}`}>{p.stock}{p.stock <= p.seuil_stock && ' ⚠️'}</td>
                <td className="p-3">
                  <button onClick={() => toggle(p.id)} className={`text-xs px-2 py-1 rounded-full font-medium ${p.actif ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                    {p.actif ? '● Actif' : '○ Inactif'}
                  </button>
                </td>
                <td className="p-3"><button onClick={() => setForm({ ...p })} className="text-blue-600">Modifier</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Produits demandés dans les conversations */}
      <div className="mt-8">
        <h3 className="font-bold mb-1">🔎 Produits demandés dans les conversations</h3>
        <p className="text-sm text-gray-400 mb-3">Ce que les clients recherchent via l'assistant. Les termes « non vendus » sont des opportunités.</p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Top demandes</div>
            {demande.demandes.length === 0 ? <p className="text-sm text-gray-400">Aucune recherche encore.</p> : demande.demandes.map(d => (
              <div key={d.terme} className="flex justify-between text-sm py-1 border-b last:border-0">
                <span className="capitalize">{d.terme} {!d.trouve && <span className="text-red-500 text-xs">(non vendu)</span>}</span>
                <span className="font-semibold text-gray-500">{d.occurences}×</span>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-amber-400">
            <div className="text-xs uppercase tracking-wide text-amber-600 mb-2">💡 Demande non satisfaite</div>
            {demande.non_satisfaites.length === 0 ? <p className="text-sm text-gray-400">Rien pour l'instant — bon signe !</p> : (
              <div className="flex flex-wrap gap-2">
                {demande.non_satisfaites.map(d => (
                  <span key={d.terme} className="text-sm bg-amber-50 rounded-full px-3 py-1 capitalize">{d.terme} <b>{d.occurences}×</b></span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-3">Des produits recherchés que vous ne vendez pas encore.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
