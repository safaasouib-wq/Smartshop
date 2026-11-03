// Page de suivi de commande — timeline des étapes + carte Leaflet live (livraison).
import React, { useEffect, useRef, useState } from 'react'
import { ContactFlottant } from './Contact.jsx'

const OR = '#0b0b0b'
const L = window.L

function icone(emoji, taille = 34) {
  return L.divIcon({
    html: `<div style="font-size:${taille}px;line-height:1;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">${emoji}</div>`,
    className: '', iconSize: [taille, taille], iconAnchor: [taille / 2, taille],
  })
}

function Timeline({ etapes, mode }) {
  return (
    <ol className="relative border-l-2 border-stone-200 ml-3">
      {etapes.map((e, i) => {
        const actif = e.faite
        const courant = e.faite && (i === etapes.length - 1 || !etapes[i + 1].faite)
        return (
          <li key={i} className="ml-6 pb-6 last:pb-0">
            <span className={`absolute -left-[11px] flex items-center justify-center w-5 h-5 rounded-full ${actif ? 'text-white' : 'bg-stone-200'}`}
                  style={actif ? { background: OR } : {}}>
              {actif ? '✓' : ''}
            </span>
            <p className={`text-sm ${courant ? 'font-bold text-stone-900' : actif ? 'text-stone-600' : 'text-stone-400'}`}>
              {e.label}{courant && <span className="ml-2 text-xs animate-pulse" style={{ color: OR }}>● en cours</span>}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

export default function Suivi() {
  const id = new URLSearchParams(window.location.search).get('id')
  const [data, setData] = useState(null)
  const [erreur, setErreur] = useState('')

  const mapDiv = useRef(null)
  const map = useRef(null)
  const marqueurs = useRef({})
  const trace = useRef(null)

  // Polling de l'état
  useEffect(() => {
    if (!id) { setErreur('Aucune commande spécifiée'); return }
    let stop = false
    const charger = () => fetch(`/api/commande/${id}/suivi`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
      .then(r => { if (!r.ok) throw new Error('Commande introuvable'); return r.json() })
      .then(d => { if (!stop) setData(d) })
      .catch(e => { if (!stop) setErreur(e.message) })
    charger()
    const t = setInterval(charger, 3000)
    return () => { stop = true; clearInterval(t) }
  }, [id])

  // Carte Leaflet (livraison uniquement)
  useEffect(() => {
    if (!data || data.mode !== 'livraison' || !data.client.lat || !mapDiv.current || !L) return

    if (!map.current) {
      map.current = L.map(mapDiv.current, { zoomControl: true, attributionControl: false })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map.current)
      marqueurs.current.boutique = L.marker([data.boutique.lat, data.boutique.lng], { icon: icone('🏪') })
        .addTo(map.current).bindPopup(data.boutique.nom)
      marqueurs.current.client = L.marker([data.client.lat, data.client.lng], { icon: icone('🏠') })
        .addTo(map.current).bindPopup('Vous')
      trace.current = L.polyline([], { color: OR, weight: 4, opacity: 0.8, dashArray: '6 8' }).addTo(map.current)
      map.current.fitBounds([[data.boutique.lat, data.boutique.lng], [data.client.lat, data.client.lng]], { padding: [50, 50] })
    }

    // Marqueur livreur
    if (data.livreur) {
      const pos = [data.livreur.lat, data.livreur.lng]
      if (!marqueurs.current.livreur) {
        marqueurs.current.livreur = L.marker(pos, { icon: icone('🛵', 38), zIndexOffset: 1000 }).addTo(map.current)
      } else {
        marqueurs.current.livreur.setLatLng(pos)
      }
      trace.current.addLatLng(pos)
    }
  }, [data])

  if (erreur) return <Centre>😔 {erreur} — <a href="/" className="underline">retour à la boutique</a></Centre>
  if (!data) return <Centre><span className="text-[10px] tracking-[0.3em] uppercase text-stone-400">Chargement du suivi…</span></Centre>

  const livree = data.suivi_livraison === 'livree' || data.statut === 'recuperee'

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-sm font-light tracking-[0.42em] uppercase">Maison Noor</a>
          <span className="text-[10px] tracking-[0.25em] uppercase text-stone-500">Commande #{data.id}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <p className="text-[10px] tracking-[0.32em] uppercase text-stone-500">
            {livree ? 'Merci !' : data.mode === 'livraison' ? 'En route vers vous' : 'Votre commande'}
          </p>
          <h1 className="text-2xl font-light tracking-[0.14em] uppercase mt-4">
            {data.mode === 'livraison' ? 'Livraison à domicile' : 'Retrait en boutique'}
          </h1>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Étapes + récap */}
          <div className="bg-white border border-[#e3e1dd] p-7">
            <h2 className="font-semibold text-stone-700 mb-4 uppercase tracking-wider text-xs">Suivi</h2>
            <Timeline etapes={data.etapes} mode={data.mode} />
            <div className="mt-6 pt-4 border-t border-stone-100">
              <h3 className="text-xs uppercase tracking-wider text-stone-400 mb-2">Votre commande</h3>
              {data.lignes.map((l, i) => (
                <div key={i} className="flex justify-between text-sm text-stone-600">
                  <span>{l.quantite}× {l.produit}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold mt-2 pt-2 border-t border-stone-100">
                <span>Total</span><span style={{ color: OR }}>{data.total} DH</span>
              </div>
              {data.mode === 'retrait' && !livree && (
                <p className="mt-4 text-xs leading-loose text-stone-600 border border-[#e3e1dd] p-4">
                  Vous serez notifié dès que votre commande est prête — pas de file d'attente.
                </p>
              )}
            </div>
          </div>

          {/* Carte (livraison) */}
          {data.mode === 'livraison' ? (
            <div className="bg-white border border-[#e3e1dd] overflow-hidden">
              <div ref={mapDiv} style={{ height: '100%', minHeight: 360 }} />
            </div>
          ) : (
            <div className="bg-white border border-[#e3e1dd] p-7 flex flex-col items-center justify-center text-center">
                            <p className="text-sm leading-loose text-stone-500">
                Récupérez votre commande à la boutique dès qu'elle est prête.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Contact flottant : Telegram + WhatsApp */}
      <ContactFlottant />
    </div>
  )
}

function Centre({ children }) {
  return <div className="min-h-screen flex items-center justify-center text-stone-500 bg-[#f7efe3] px-4 text-center">{children}</div>
}
