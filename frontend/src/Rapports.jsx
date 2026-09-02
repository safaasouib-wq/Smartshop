// Module Administration · Rapports d'activité : KPIs, top produits, ventes par catégorie/semaine,
// heures de pointe, export PDF.
import React, { useEffect, useState } from 'react'
import { api } from './api.js'

const CAT_COULEUR = { Moderne: '#f472b6', Traditionnel: '#c2a15a', 'Petit-déjeuner': '#34d399', Autre: '#94a3b8' }

// Barre horizontale simple (proportion valeur/max).
function BarreH({ label, valeur, max, suffixe = '', couleur = '#10b981' }) {
  const pct = max ? Math.max(3, (valeur / max) * 100) : 0
  return (
    <div className="flex items-center gap-2 text-sm my-1">
      <div className="w-32 truncate text-gray-600">{label}</div>
      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
        <div className="h-4 rounded-full" style={{ width: pct + '%', background: couleur }} />
      </div>
      <div className="w-24 text-right font-medium">{valeur}{suffixe}</div>
    </div>
  )
}

// Barres verticales (ventes par semaine / heures).
function BarresV({ data, cle, labelCle, suffixe = '' }) {
  const max = Math.max(1, ...data.map(d => d[cle]))
  return (
    <div className="flex items-end gap-2 h-40">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
          <div className="text-[10px] text-gray-400">{d[cle] || ''}</div>
          <div className="w-full rounded-t bg-emerald-500" style={{ height: `${(d[cle] / max) * 100}%`, minHeight: d[cle] ? 4 : 0 }} />
          <div className="text-[10px] text-gray-500 mt-1 text-center">{d[labelCle]}</div>
        </div>
      ))}
    </div>
  )
}

export default function Rapports() {
  const [periode, setPeriode] = useState('mois')
  const [d, setD] = useState(null)

  useEffect(() => { setD(null); api.admin.rapports(periode).then(setD) }, [periode])

  const heures = d ? d.heures_pointe.map((n, h) => ({ h: `${h}h`, n })).filter((x, i) => d.heures_pointe.some(v => v) ) : []
  const heurePointe = d ? d.heures_pointe.indexOf(Math.max(...d.heures_pointe)) : 0
  const maxTop = d && d.top_produits.length ? d.top_produits[0].quantite : 1
  const maxCat = d && d.categories.length ? Math.max(...d.categories.map(c => c.ca)) : 1

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-bold">📈 Rapports d'activité</h2>
        <div className="flex gap-2 items-center">
          {['semaine', 'mois'].map(p => (
            <button key={p} onClick={() => setPeriode(p)}
                    className={`text-sm px-3 py-1 rounded-full font-medium ${periode === p ? 'bg-emerald-600 text-white' : 'bg-white shadow'}`}>
              {p === 'semaine' ? '7 jours' : '30 jours'}
            </button>
          ))}
          <button onClick={() => api.admin.telechargerPdf(`/admin/rapports/pdf?periode=${periode}`, `rapport_${periode}.pdf`)}
                  className="text-sm bg-gray-800 text-white px-3 py-1.5 rounded-lg font-semibold">📄 Exporter PDF</button>
        </div>
      </div>

      {!d ? <p className="text-gray-400">Chargement…</p> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[['💰', 'Chiffre d\'affaires', `${d.ca} DH`], ['🧾', 'Commandes', d.nb_commandes],
              ['🛒', 'Panier moyen', `${d.panier_moyen} DH`], ['⏰', 'Heure de pointe', `${heurePointe}h`]].map(([ic, t, v]) => (
              <div key={t} className="bg-white rounded-xl shadow p-4">
                <div className="text-2xl">{ic}</div>
                <div className="text-2xl font-bold">{v}</div>
                <div className="text-gray-500 text-sm">{t}</div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-bold mb-3">🏆 Produits les plus vendus</h3>
              {d.top_produits.length === 0 ? <p className="text-sm text-gray-400">Aucune vente.</p> :
                d.top_produits.map(p => <BarreH key={p.nom} label={p.nom} valeur={p.quantite} max={maxTop} suffixe=" vendus" />)}
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-bold mb-3">🍰 Ventes par catégorie</h3>
              {d.categories.length === 0 ? <p className="text-sm text-gray-400">Aucune vente.</p> :
                d.categories.map(c => <BarreH key={c.categorie} label={c.categorie} valeur={c.ca} max={maxCat} suffixe=" DH" couleur={CAT_COULEUR[c.categorie] || '#94a3b8'} />)}
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-bold mb-3">📅 Ventes par semaine (DH)</h3>
              <BarresV data={d.ventes_semaine} cle="ca" labelCle="label" />
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-bold mb-3">💬 Heures de pointe des conversations</h3>
              {heures.every(x => x.n === 0) ? <p className="text-sm text-gray-400">Pas assez de données.</p> :
                <BarresV data={d.heures_pointe.map((n, h) => ({ h: `${h}h`, n })).filter(x => parseInt(x.h) >= 7 && parseInt(x.h) <= 22)} cle="n" labelCle="h" />}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
