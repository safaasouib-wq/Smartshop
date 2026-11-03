// Vitrine web publique — direction artistique éditoriale (noir / blanc / photo plein cadre),
// recherche/filtres, fiche produit, panier, comptes, commande en ligne, trilingue FR/AR/EN.
import React, { useEffect, useRef, useState } from 'react'
import { authHeader, getCompte, lirePanier, ecrirePanier } from './clientApi.js'
import { AuthModal, ComptePanel } from './Compte.jsx'
import { ContactFlottant, TELEGRAM_BOT } from './Contact.jsx'
import { CODES, LANGUES, LangContext, dirOf, makeT, tc, useT } from './i18n.js'

const ENCRE = '#0b0b0b'   // noir d'encre — texte, boutons, pied de page
const CRAIE = '#f4f2ef'   // blanc cassé — fonds d'image et sections alternées
const LIGNE = '#e3e1dd'   // filets de séparation (1 px)
const GRIS = '#8d8a85'    // texte secondaire
const L = window.L
const CASA = [33.5731, -7.6298] // centre Casablanca (carte de checkout)
const SEUIL_STOCK = 5           // en dessous : badge « plus que X »

// Petites icônes au trait (pas d'emoji : la DA reste monochrome).
function Icone({ nom, taille = 17 }) {
  const traces = {
    recherche: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></>,
    compte: <><path d="M20 21v-1.8a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4V21" /><circle cx="12" cy="7" r="4" /></>,
    panier: <><path d="M6 2 4 6v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6l-2-4Z" /><path d="M4 6h16" /><path d="M16 10a4 4 0 0 1-8 0" /></>,
    fleche: <><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></>,
    gauche: <path d="m14 6-6 6 6 6" />,
    droite: <path d="m10 6 6 6-6 6" />,
    haut: <><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></>,
  }
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {traces[nom]}
    </svg>
  )
}

function Tg({ children, className = '', style }) {
  return (
    <a href={TELEGRAM_BOT} target="_blank" rel="noreferrer" style={style}
       className={`inline-flex items-center justify-center gap-2 transition-colors ${className}`}>
      {children}
    </a>
  )
}

// Surtitre minuscule très espacé — la signature typographique de la vitrine.
function Surtitre({ children, className = '', style }) {
  return <p style={style} className={`text-[10px] tracking-[0.32em] uppercase ${className}`}>{children}</p>
}

// Titre de section : capitales larges, graisse légère.
function Titre({ children, className = '', taille = 'text-3xl md:text-[42px]' }) {
  return <h2 className={`${taille} font-light tracking-[0.14em] uppercase leading-tight ${className}`}>{children}</h2>
}

// Apparition en fondu au défilement (respecte prefers-reduced-motion).
function Reveal({ children, className = '', delay = 0, tag: Tag = 'div' }) {
  const ref = useRef(null)
  const [vu, setVu] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const el = ref.current
    if (!el || vu) return
    // Filet de sécurité : ce qui est déjà à l'écran (ou au-dessus) s'affiche tout de suite,
    // pour ne jamais laisser une section bloquée invisible (ex. saut via une ancre).
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) { setVu(true); return }
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVu(true); obs.disconnect() }
    }, { threshold: 0.1, rootMargin: '0px 0px -8% 0px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [vu])
  return (
    <Tag ref={ref} style={{ transitionDelay: `${delay}ms` }}
         className={`transition-all duration-700 ease-out ${vu ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'} ${className}`}>
      {children}
    </Tag>
  )
}

function BadgeStock({ p }) {
  const { t } = useT()
  if (p.stock <= 0)
    return <span className="absolute top-3 left-3 bg-black text-white text-[9px] tracking-[0.25em] uppercase px-2.5 py-1">{t('epuise')}</span>
  if (p.stock <= SEUIL_STOCK)
    return <span className="absolute top-3 left-3 bg-white text-black text-[9px] tracking-[0.25em] uppercase px-2.5 py-1">{t('plus_que', { n: p.stock })}</span>
  return null
}

function CarteProduit({ p, onAdd, onOpen }) {
  const { t, lang } = useT()
  const epuise = p.stock <= 0
  return (
    <div className="group flex flex-col border-r border-b" style={{ borderColor: LIGNE }}>
      <button onClick={() => onOpen(p)} className="relative block w-full overflow-hidden" style={{ background: CRAIE }}>
        <div className="aspect-[4/5] overflow-hidden">
          {p.image_url
            ? <img src={p.image_url} alt={p.nom} loading="lazy"
                   className={`w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04] ${epuise ? 'grayscale opacity-60' : ''}`} />
            : <div className="w-full h-full" style={{ background: CRAIE }} />}
        </div>
        <BadgeStock p={p} />
        {p.best_seller && (
          <span className="absolute top-3 right-3 bg-black text-white text-[9px] tracking-[0.25em] uppercase px-2.5 py-1">{t('best_seller')}</span>
        )}
      </button>
      <div className="px-4 sm:px-5 py-5 flex flex-col gap-1.5" style={{ textAlign: 'start' }}>
        <span className="block h-px w-10" style={{ background: ENCRE }} />
        <h3 className="mt-2 text-[11px] tracking-[0.2em] uppercase leading-relaxed">{tc(lang, 'produit', p.nom)}</h3>
        <p className="text-[11px] tracking-[0.12em] uppercase" style={{ color: GRIS }}>
          {epuise ? t('epuise') : `${p.prix} DH`}
        </p>
        {!epuise && (
          <button onClick={() => onAdd(p)}
                  className="mt-2 self-start text-[10px] tracking-[0.28em] uppercase border-b border-transparent hover:border-black transition-colors">
            {t('ajouter')}
          </button>
        )}
      </div>
    </div>
  )
}

// Aperçu rapide d'un produit (modale).
function FicheProduit({ p, onAdd, onClose }) {
  const { t, lang } = useT()
  const [qty, setQty] = useState(1)
  const epuise = p.stock <= 0
  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-4xl max-h-[92vh] overflow-y-auto grid md:grid-cols-2 animate-[fadeIn_.25s_ease]" onClick={e => e.stopPropagation()}>
        <div className="relative aspect-[4/5] md:aspect-auto" style={{ background: CRAIE }}>
          {p.image_url && <img src={p.image_url} alt={p.nom} className="w-full h-full object-cover" />}
          <BadgeStock p={p} />
        </div>
        <div className="p-8 sm:p-10 flex flex-col" style={{ textAlign: 'start' }}>
          <button onClick={onClose} className="self-end text-xl leading-none hover:opacity-50" style={{ color: GRIS }}>×</button>
          <Surtitre style={{ color: GRIS }} className="mt-2" >{tc(lang, 'categorie', p.categorie)}</Surtitre>
          <Titre taille="text-2xl md:text-3xl" className="mt-4">{tc(lang, 'produit', p.nom)}</Titre>
          <p className="mt-4 text-sm tracking-[0.18em] uppercase">{p.prix} DH</p>
          {p.description && (
            <p className="mt-6 text-sm leading-loose" style={{ color: GRIS }}>{tc(lang, 'description', p.description)}</p>
          )}
          <div className="mt-auto pt-10">
            {epuise ? (
              <p className="text-center text-[11px] tracking-[0.25em] uppercase border py-4" style={{ borderColor: LIGNE, color: GRIS }}>{t('epuise')}</p>
            ) : (
              <>
                <div className="flex items-center justify-between border-y py-4 mb-6" style={{ borderColor: LIGNE }}>
                  <Surtitre style={{ color: GRIS }}>{t('fiche_quantite')}</Surtitre>
                  <div className="flex items-center gap-5 text-sm">
                    <button onClick={() => setQty(q => Math.max(1, q - 1))} className="hover:opacity-50">−</button>
                    <span className="w-5 text-center">{qty}</span>
                    <button onClick={() => setQty(q => Math.min(p.stock, q + 1))} className="hover:opacity-50">+</button>
                  </div>
                </div>
                <button onClick={() => { onAdd(p, qty); onClose() }}
                        className="w-full bg-black text-white text-[10px] tracking-[0.3em] uppercase py-4 hover:opacity-85 transition-opacity">
                  {t('fiche_ajouter')} — {p.prix * qty} DH
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Fond du hero : boucle vidéo muette (16:9) avec repli sur la photo
// si le mouvement est désactivé par le système ou si la vidéo ne charge pas.
function FondHero({ video, image }) {
  const [fige, setFige] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false)
  if (fige || !video) {
    return <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />
  }
  return (
    <video src={video} poster={image} autoPlay muted loop playsInline preload="auto"
           onError={() => setFige(true)} aria-hidden="true"
           className="absolute inset-0 w-full h-full object-cover" />
  )
}

// Bandeau d'annonces défilantes, tout en haut de la page.
function Annonce({ commerce }) {
  const { t } = useT()
  const msgs = [t('annonce_1'), commerce.horaires, commerce.telephone].filter(Boolean)
  const [i, setI] = useState(0)
  useEffect(() => {
    if (msgs.length < 2) return
    const id = setInterval(() => setI(x => (x + 1) % msgs.length), 5000)
    return () => clearInterval(id)
  }, [msgs.length])
  const bouger = (d) => setI(x => (x + d + msgs.length) % msgs.length)
  return (
    <div className="bg-white border-b" style={{ borderColor: LIGNE }}>
      <div className="max-w-[1400px] mx-auto px-4 h-9 flex items-center justify-center gap-6">
        <button onClick={() => bouger(-1)} aria-label="‹" className="opacity-40 hover:opacity-100 transition-opacity"><Icone nom="gauche" taille={14} /></button>
        <Surtitre className="truncate">{msgs[i]}</Surtitre>
        <button onClick={() => bouger(1)} aria-label="›" className="opacity-40 hover:opacity-100 transition-opacity"><Icone nom="droite" taille={14} /></button>
      </div>
    </div>
  )
}

// Catégorie en pleine largeur (bande de 3), label centré sur la photo.
function TuileCategorie({ image, titre, onClick }) {
  const { t } = useT()
  return (
    <button onClick={onClick} className="group relative block w-full h-[46vh] min-h-[260px] overflow-hidden" style={{ background: CRAIE }}>
      {image && <img src={image} alt={titre} loading="lazy"
                     className="absolute inset-0 w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105" />}
      <span className="absolute inset-0 bg-black/25 group-hover:bg-black/35 transition-colors" />
      <span className="relative flex flex-col items-center justify-center h-full text-white gap-3">
        <span className="text-lg sm:text-xl font-light tracking-[0.3em] uppercase">{titre}</span>
        <span className="flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase opacity-90">
          {t('voir_cat')} <Icone nom="fleche" taille={13} />
        </span>
      </span>
    </button>
  )
}

// Bande éditoriale plein cadre : photo + bloc de texte aligné au début de ligne.
function Edito({ image, numero, titre, texte, cta }) {
  return (
    <section className="relative h-[70vh] min-h-[380px] overflow-hidden" style={{ background: CRAIE }}>
      {image && <img src={image} alt={titre} className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/10" />
      <div className="relative h-full max-w-[1400px] mx-auto px-6 sm:px-10 flex items-center">
        <div className="max-w-md text-white" style={{ textAlign: 'start' }}>
          <Surtitre className="opacity-80">{numero}</Surtitre>
          <Titre className="mt-4">{titre}</Titre>
          <p className="mt-5 text-sm leading-loose text-white/85">{texte}</p>
          <Tg className="mt-8 border border-white/80 px-10 py-3.5 text-[10px] tracking-[0.3em] uppercase hover:bg-white hover:text-black">
            {cta}
          </Tg>
        </div>
      </div>
    </section>
  )
}

// Bande de réassurance, numérotée 01 → 04.
function BandeConfiance() {
  const { t } = useT()
  const items = [
    [t('trust_paiement_t'), t('trust_paiement_s')],
    [t('trust_maison_t'), t('trust_maison_s')],
    [t('trust_livr_t'), t('trust_livr_s')],
    [t('trust_support_t'), t('trust_support_s')],
  ]
  return (
    <section className="border-y" style={{ borderColor: LIGNE }}>
      <div className="max-w-[1400px] mx-auto grid grid-cols-2 lg:grid-cols-4">
        {items.map(([titre, sous], i) => (
          <Reveal key={titre} delay={i * 70}
                  className="px-6 sm:px-8 py-12 border-r last:border-r-0" >
            <div style={{ textAlign: 'start' }}>
              <Surtitre style={{ color: GRIS }}>{String(i + 1).padStart(2, '0')}</Surtitre>
              <h4 className="mt-4 text-[11px] tracking-[0.22em] uppercase">{titre}</h4>
              <p className="mt-2 text-xs leading-loose" style={{ color: GRIS }}>{sous}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

// Avis clients (réassurance sociale). Contenu d'exemple — à remplacer par de vrais témoignages.
function BandeAvis() {
  const { t } = useT()
  const avis = [['Sara B.', t('avis_1')], ['Youssef M.', t('avis_2')], ['Amina K.', t('avis_3')]]
  return (
    <section className="max-w-[1400px] mx-auto px-6 sm:px-10 py-24">
      <div style={{ textAlign: 'start' }}>
        <Surtitre style={{ color: GRIS }}>{t('avis_sur')}</Surtitre>
        <Titre className="mt-4">{t('avis_titre')}</Titre>
      </div>
      <div className="grid md:grid-cols-3 gap-px mt-14" style={{ background: LIGNE }}>
        {avis.map(([nom, txt], i) => (
          <Reveal key={nom} delay={i * 80} className="bg-white">
            <div className="p-8 sm:p-10 h-full flex flex-col" style={{ textAlign: 'start' }}>
              <p className="text-sm leading-loose flex-1" style={{ color: GRIS }}>« {txt} »</p>
              <Surtitre className="mt-8">{nom}</Surtitre>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

// Barre recherche + filtres + tri.
function BarreFiltres({ q, setQ, cat, setCat, sort, setSort, categories }) {
  const { t, lang } = useT()
  const chip = (val, label) => (
    <button key={val} onClick={() => setCat(val)}
            className={`px-5 py-2 text-[10px] tracking-[0.25em] uppercase border transition-colors ${cat === val ? 'bg-black text-white border-black' : 'bg-white hover:border-black'}`}
            style={cat === val ? {} : { borderColor: LIGNE }}>{label}</button>
  )
  return (
    <div className="flex flex-col lg:flex-row lg:items-end gap-6 mb-12">
      <div className="flex flex-wrap gap-2 flex-1">
        {chip('all', t('tous'))}
        {categories.map(c => chip(c, tc(lang, 'categorie', c)))}
      </div>
      <div className="flex items-end gap-6">
        <label className="flex items-center gap-2 border-b pb-2 min-w-[180px]" style={{ borderColor: LIGNE }}>
          <Icone nom="recherche" taille={15} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('rechercher_ph')}
                 className="w-full bg-transparent text-[11px] tracking-[0.12em] uppercase focus:outline-none placeholder:normal-case placeholder:tracking-normal" />
        </label>
        <select value={sort} onChange={e => setSort(e.target.value)}
                className="bg-transparent border-b pb-2 text-[10px] tracking-[0.2em] uppercase focus:outline-none cursor-pointer"
                style={{ borderColor: LIGNE }}>
          <option value="reco">{t('tri_reco')}</option>
          <option value="asc">{t('tri_prix_asc')}</option>
          <option value="desc">{t('tri_prix_desc')}</option>
        </select>
      </div>
    </div>
  )
}

// Mini-carte Leaflet pour positionner l'adresse de livraison.
function MiniCarte({ onPick }) {
  const div = useRef(null); const map = useRef(null); const mk = useRef(null)
  useEffect(() => {
    if (!L || !div.current || map.current) return
    map.current = L.map(div.current, { attributionControl: false }).setView(CASA, 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map.current)
    map.current.on('click', (e) => {
      const { lat, lng } = e.latlng
      if (!mk.current) mk.current = L.marker([lat, lng]).addTo(map.current)
      else mk.current.setLatLng([lat, lng])
      onPick(lat, lng)
    })
    setTimeout(() => map.current.invalidateSize(), 100)
  }, [])
  return <div ref={div} style={{ height: 200, borderColor: LIGNE }} className="overflow-hidden border" />
}

function Checkout({ panier, setPanier, onClose, compte }) {
  const { t, lang } = useT()
  const [mode, setMode] = useState('retrait')
  const [nom, setNom] = useState(compte?.nom || '')
  const [tel, setTel] = useState(compte?.telephone || '')
  const [adresse, setAdresse] = useState(compte?.adresse || '')
  const [pin, setPin] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  const total = panier.reduce((s, i) => s + i.prix * i.qty, 0)
  const setQty = (id, d) => setPanier(p => p.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + d) } : i))
  const retirer = (id) => setPanier(p => p.filter(i => i.id !== id))

  const champ = 'w-full bg-transparent border-b pb-2 text-sm focus:outline-none focus:border-black transition-colors'

  const valider = async () => {
    setErreur('')
    if (mode === 'livraison' && !pin && !adresse.trim()) { setErreur(t('err_adresse')); return }
    setEnvoi(true)
    try {
      const body = {
        lignes: panier.map(i => ({ produit: i.nom, quantite: i.qty })),
        mode, nom: nom || 'Client web', telephone: tel, adresse,
        lat: pin?.[0] ?? null, lng: pin?.[1] ?? null,
      }
      const r = await fetch('/api/commander', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Erreur')
      localStorage.removeItem('panier') // commande passée → on vide le panier persistant
      window.location.href = d.suivi_url // → page de suivi
    } catch (e) { setErreur(e.message); setEnvoi(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()} style={{ textAlign: 'start' }}>
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <Surtitre>{t('checkout_titre')}</Surtitre>
            <button onClick={onClose} className="text-xl leading-none hover:opacity-50" style={{ color: GRIS }}>×</button>
          </div>

          {panier.length === 0 ? (
            <p className="py-10 text-center text-[11px] tracking-[0.2em] uppercase" style={{ color: GRIS }}>{t('checkout_vide')}</p>
          ) : (
            <>
              <div className="border-t" style={{ borderColor: LIGNE }}>
                {panier.map(i => (
                  <div key={i.id} className="flex items-center gap-3 text-xs py-4 border-b" style={{ borderColor: LIGNE }}>
                    <span className="flex-1 tracking-[0.12em] uppercase">{tc(lang, 'produit', i.nom)}</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setQty(i.id, -1)} className="hover:opacity-50">−</button>
                      <span className="w-4 text-center">{i.qty}</span>
                      <button onClick={() => setQty(i.id, +1)} className="hover:opacity-50">+</button>
                    </div>
                    <span className="w-20 text-right">{i.prix * i.qty} DH</span>
                    <button onClick={() => retirer(i.id)} className="hover:opacity-50" style={{ color: GRIS }}>×</button>
                  </div>
                ))}
              </div>
              <div className="flex justify-between py-5 text-[11px] tracking-[0.2em] uppercase">
                <span>{t('checkout_total')}</span><span>{total} DH</span>
              </div>

              <div className="grid grid-cols-2 gap-px mb-8" style={{ background: LIGNE }}>
                {[['retrait', t('mode_retrait_t'), t('mode_retrait_s')], ['livraison', t('mode_livr_t'), t('mode_livr_s')]].map(([v, ti, s]) => (
                  <button key={v} onClick={() => setMode(v)}
                          className={`p-4 transition-colors ${mode === v ? 'bg-black text-white' : 'bg-white hover:bg-stone-50'}`}
                          style={{ textAlign: 'start' }}>
                    <div className="text-[10px] tracking-[0.22em] uppercase">{ti}</div>
                    <div className={`text-[11px] mt-1 ${mode === v ? 'text-white/70' : ''}`} style={mode === v ? {} : { color: GRIS }}>{s}</div>
                  </button>
                ))}
              </div>

              <div className="space-y-6">
                <input value={nom} onChange={e => setNom(e.target.value)} placeholder={t('ph_nom')} className={champ} style={{ borderColor: LIGNE }} />
                <input value={tel} onChange={e => setTel(e.target.value)} placeholder={t('ph_tel')} className={champ} style={{ borderColor: LIGNE }} />
                {mode === 'livraison' && (
                  <>
                    <input value={adresse} onChange={e => setAdresse(e.target.value)} placeholder={t('ph_adresse')} className={champ} style={{ borderColor: LIGNE }} />
                    <div>
                      <p className="text-[10px] tracking-[0.18em] uppercase mb-3" style={{ color: GRIS }}>{t('carte_hint')}</p>
                      <MiniCarte onPick={(lat, lng) => setPin([lat, lng])} />
                      {pin && <p className="text-[10px] tracking-[0.18em] uppercase mt-2">{t('pos_ok')}</p>}
                    </div>
                  </>
                )}
              </div>

              {erreur && <p className="text-red-600 text-xs mt-5">{erreur}</p>}

              <button onClick={valider} disabled={envoi}
                      className="w-full mt-8 bg-black text-white text-[10px] tracking-[0.3em] uppercase py-4 disabled:opacity-50 hover:opacity-85 transition-opacity">
                {envoi ? t('envoi') : `${t('valider')} — ${total} DH`}
              </button>
              <p className="text-center text-[10px] tracking-[0.15em] uppercase mt-5" style={{ color: GRIS }}>
                {t('ou_1')}<a href={TELEGRAM_BOT} target="_blank" rel="noreferrer" className="underline">{t('ou_lien')}</a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Sélecteur de langue (FR / العربية / EN).
function SelecteurLangue({ clair }) {
  const { lang, setLang } = useT()
  return (
    <div className="flex items-center gap-2.5 text-[10px] tracking-[0.2em] uppercase">
      {LANGUES.map(l => (
        <button key={l.code} onClick={() => setLang(l.code)}
                className={`transition-opacity ${lang === l.code ? 'opacity-100 underline underline-offset-4' : 'opacity-50 hover:opacity-100'}`}>
          {l.label}
        </button>
      ))}
    </div>
  )
}

// Barre de navigation : transparente sur le héros, blanche une fois la page défilée.
function Nav({ commerce, clair, nbPanier, compte, onCompte, onPanier, onRecherche }) {
  const { t } = useT()
  const lien = 'text-[10px] tracking-[0.25em] uppercase hover:opacity-60 transition-opacity'
  return (
    <div className={`w-full ${clair ? 'text-white' : 'text-black bg-white border-b'}`} style={clair ? {} : { borderColor: LIGNE }}>
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 h-16 flex items-center gap-4">
        <nav className="flex-1 flex items-center gap-6">
          <a href="#carte" className={`${lien} hidden sm:inline`}>{t('nav_carte')}</a>
          <a href="#offre" className={`${lien} hidden md:inline`}>{t('nav_offres')}</a>
        </nav>
        <a href="/" className="text-sm sm:text-base font-light tracking-[0.42em] uppercase whitespace-nowrap">
          {commerce.nom}
        </a>
        <div className="flex-1 flex items-center justify-end gap-5">
          <div className="hidden sm:block"><SelecteurLangue clair={clair} /></div>
          <button onClick={onRecherche} aria-label={t('rechercher_ph')} className="hover:opacity-60 transition-opacity"><Icone nom="recherche" /></button>
          <button onClick={onCompte} aria-label={t('connexion')} className="hover:opacity-60 transition-opacity"><Icone nom="compte" /></button>
          <button onClick={onPanier} aria-label={t('panier')} className="relative hover:opacity-60 transition-opacity">
            <Icone nom="panier" />
            {nbPanier > 0 && <span className="absolute -top-2 -right-2 text-[9px] tracking-normal">{nbPanier}</span>}
          </button>
        </div>
      </div>
    </div>
  )
}

function VitrineContenu({ data, panier, setPanier, compte, setCompte }) {
  const { t, lang } = useT()
  const [checkout, setCheckout] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showCompte, setShowCompte] = useState(false)
  const [fiche, setFiche] = useState(null)
  const [toast, setToast] = useState(null)
  const [showTop, setShowTop] = useState(false)
  const [colle, setColle] = useState(false)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [sort, setSort] = useState('reco')
  const toastTimer = useRef(null)
  const rechercheRef = useRef(null)

  useEffect(() => { ecrirePanier(panier) }, [panier])
  useEffect(() => {
    const onScroll = () => { setShowTop(window.scrollY > 600); setColle(window.scrollY > 420) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const ajouter = (p, qty = 1) => {
    setPanier(prev => {
      const ex = prev.find(i => i.id === p.id)
      if (ex) return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + qty } : i)
      return [...prev, { id: p.id, nom: p.nom, prix: p.prix, qty }]
    })
    setToast(`${tc(lang, 'produit', p.nom)} ${t('toast_ajoute')}`)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }

  const { commerce, produits } = data
  const nbPanier = panier.reduce((s, i) => s + i.qty, 0)
  const totalPanier = panier.reduce((s, i) => s + i.prix * i.qty, 0)

  const recommander = (lignes) => {
    setPanier(prev => {
      const np = prev.map(i => ({ ...i }))
      for (const l of lignes) {
        const p = produits.find(x => x.nom === l.produit)
        if (!p || p.stock <= 0) continue
        const ex = np.find(i => i.id === p.id)
        if (ex) ex.qty += l.quantite
        else np.push({ id: p.id, nom: p.nom, prix: p.prix, qty: l.quantite })
      }
      return np
    })
    setShowCompte(false); setCheckout(true)
  }

  const categories = []; const parCat = {}
  for (const p of produits) {
    const c = p.categorie || 'Autres'
    if (!parCat[c]) { parCat[c] = []; categories.push(c) }
    parCat[c].push(p)
  }
  // Décors de la vitrine (photos servies depuis /public, sans dépendance réseau).
  const heroVideo = '/hero.mp4'          // boucle 16:9 muette du hero
  const heroImg = '/hero-poster.jpg'     // 1re image : affiche de la vidéo + repli sans animation
  const offreImg = '/products/cabas-cuir-marron.jpg'
  const anivImg = '/products/montre-octogonale-doree.jpg'

  // Filtrage / tri
  const filtreActif = q.trim() !== '' || cat !== 'all' || sort !== 'reco'
  let filtres = produits
  const terme = q.trim().toLowerCase()
  if (terme) filtres = filtres.filter(p => `${p.nom} ${p.description || ''} ${p.categorie || ''} ${tc(lang, 'produit', p.nom)} ${tc(lang, 'categorie', p.categorie)} ${tc(lang, 'description', p.description || '')}`.toLowerCase().includes(terme))
  if (cat !== 'all') filtres = filtres.filter(p => (p.categorie || 'Autres') === cat)
  if (sort === 'asc') filtres = [...filtres].sort((a, b) => a.prix - b.prix)
  else if (sort === 'desc') filtres = [...filtres].sort((a, b) => b.prix - a.prix)
  const reinit = () => { setQ(''); setCat('all'); setSort('reco') }
  const allerCarte = () => document.getElementById('carte')?.scrollIntoView({ behavior: 'smooth' })
  const allerCategorie = (c) => { setCat(c); setQ(''); setTimeout(allerCarte, 60) }
  const ouvrirRecherche = () => {
    allerCarte()
    setTimeout(() => rechercheRef.current?.querySelector('input')?.focus(), 500)
  }

  const navProps = {
    commerce, nbPanier, compte,
    onCompte: () => compte ? setShowCompte(true) : setShowAuth(true),
    onPanier: () => setCheckout(true),
    onRecherche: ouvrirRecherche,
  }

  return (
    <div dir={dirOf(lang)} className="min-h-screen bg-white text-black">
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>

      <Annonce commerce={commerce} />

      {/* NAV FIXE : apparaît au défilement */}
      <div className={`fixed inset-x-0 top-0 z-40 transition-transform duration-300 ${colle ? 'translate-y-0' : '-translate-y-full'}`}>
        <Nav {...navProps} clair={false} />
      </div>

      {/* HERO plein cadre, nav transparente par-dessus */}
      <header className="relative h-[88vh] min-h-[520px] overflow-hidden" style={{ background: CRAIE }}>
        <FondHero video={heroVideo} image={heroImg} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-black/50" />
        <div className="relative z-10"><Nav {...navProps} clair /></div>
        <div className="absolute inset-x-0 bottom-0">
          <div className="max-w-[1400px] mx-auto px-6 sm:px-10 pb-16 sm:pb-20 text-white" style={{ textAlign: 'start' }}>
            <Surtitre className="opacity-80">{t('hero_sur')}</Surtitre>
            <Titre taille="text-4xl md:text-6xl" className="mt-4 max-w-2xl">{t('hero_titre')}</Titre>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <button onClick={allerCarte}
                      className="bg-white text-black px-12 py-4 text-[10px] tracking-[0.3em] uppercase hover:opacity-85 transition-opacity">
                {t('decouvrir')}
              </button>
              <button onClick={() => setCheckout(true)}
                      className="border border-white/80 px-12 py-4 text-[10px] tracking-[0.3em] uppercase hover:bg-white hover:text-black transition-colors">
                {t('commander')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* BANDE CATÉGORIES plein cadre */}
      <section className="grid md:grid-cols-3 gap-px" style={{ background: LIGNE }}>
        {categories.slice(0, 3).map(c => (
          <TuileCategorie key={c} image={parCat[c][0]?.image_url} titre={tc(lang, 'categorie', c)}
                          onClick={() => allerCategorie(c)} />
        ))}
      </section>

      {/* CATALOGUE */}
      <section id="carte" className="max-w-[1400px] mx-auto px-6 sm:px-10 pt-24 pb-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6" style={{ textAlign: 'start' }}>
          <div>
            <Surtitre style={{ color: GRIS }}>{t('sec_delices')}</Surtitre>
            <Titre className="mt-4">{t('sec_carte')}</Titre>
          </div>
          {commerce.message_accueil && (
            <p className="max-w-sm text-xs leading-loose" style={{ color: GRIS }}>{commerce.message_accueil}</p>
          )}
        </div>
      </section>
      <section className="max-w-[1400px] mx-auto px-6 sm:px-10 pb-24">
        <div ref={rechercheRef}>
          <BarreFiltres q={q} setQ={setQ} cat={cat} setCat={setCat} sort={sort} setSort={setSort} categories={categories} />
        </div>

        {filtreActif ? (
          filtres.length ? (
            <>
              <Surtitre className="mb-5" style={{ color: GRIS }}>{t('resultats', { n: filtres.length })}</Surtitre>
              <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-l" style={{ borderColor: LIGNE }}>
                {filtres.map(p => <CarteProduit key={p.id} p={p} onAdd={ajouter} onOpen={setFiche} />)}
              </div>
            </>
          ) : (
            <div className="py-24 text-center">
              <Surtitre style={{ color: GRIS }}>{t('aucun_produit')}</Surtitre>
              <button onClick={reinit} className="mt-6 bg-black text-white px-10 py-3.5 text-[10px] tracking-[0.3em] uppercase hover:opacity-85 transition-opacity">
                {t('reinit')}
              </button>
            </div>
          )
        ) : (
          categories.map(c => (
            <Reveal key={c} className="mb-20">
              <div className="flex items-baseline gap-5 mb-6" style={{ textAlign: 'start' }}>
                <Surtitre>{tc(lang, 'categorie', c)}</Surtitre>
                <span className="flex-1 h-px" style={{ background: LIGNE }} />
                <Surtitre style={{ color: GRIS }}>{parCat[c].length}</Surtitre>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-l" style={{ borderColor: LIGNE }}>
                {parCat[c].map(p => <CarteProduit key={p.id} p={p} onAdd={ajouter} onOpen={setFiche} />)}
              </div>
            </Reveal>
          ))
        )}
      </section>

      {/* ÉDITORIAL — MAROQUINERIE */}
      <div id="offre">
        <Edito image={offreImg} numero={t('edito_num_1')} titre={t('sec_offre_titre')}
               texte={t('sec_offre_txt')} cta={t('offre_cta')} />
      </div>

      <BandeConfiance />

      {/* ÉDITORIAL — HORLOGERIE */}
      <Edito image={anivImg} numero={t('edito_num_2')} titre={t('sec_aniv_titre')}
             texte={t('sec_aniv_txt')} cta={t('offre_cta')} />

      <BandeAvis />

      {/* PIED DE PAGE */}
      <footer className="bg-black text-white">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 py-20 grid md:grid-cols-3 gap-14" style={{ textAlign: 'start' }}>
          <div>
            <p className="text-base font-light tracking-[0.42em] uppercase">{commerce.nom}</p>
            <div className="mt-6 space-y-1.5 text-xs leading-loose text-white/60">
              {commerce.adresse && <p>{commerce.adresse}</p>}
              {commerce.telephone && <p>{commerce.telephone}</p>}
              {commerce.horaires && <p>{commerce.horaires}</p>}
            </div>
          </div>
          <div>
            <Surtitre className="text-white/50">{t('foot_menu')}</Surtitre>
            <ul className="mt-6 space-y-3 text-[11px] tracking-[0.2em] uppercase">
              <li><a href="#carte" className="hover:opacity-60 transition-opacity">{t('nav_carte')}</a></li>
              <li><a href="#offre" className="hover:opacity-60 transition-opacity">{t('nav_offres')}</a></li>
              <li><a href={TELEGRAM_BOT} target="_blank" rel="noreferrer" className="hover:opacity-60 transition-opacity">Telegram</a></li>
              <li><a href="/admin" className="hover:opacity-60 transition-opacity">{t('footer_admin')}</a></li>
            </ul>
          </div>
          <div>
            <Surtitre className="text-white/50">{t('foot_contact')}</Surtitre>
            <p className="mt-6 text-xs leading-loose text-white/60 max-w-xs">{t('foot_txt')}</p>
            <Tg className="mt-7 border border-white/40 px-10 py-3.5 text-[10px] tracking-[0.3em] uppercase hover:bg-white hover:text-black">
              {t('offre_cta')}
            </Tg>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-[1400px] mx-auto px-6 sm:px-10 py-6 flex flex-wrap items-center justify-between gap-4">
            <Surtitre className="text-white/40">© {new Date().getFullYear()} {commerce.nom}</Surtitre>
            <div className="text-white/60"><SelecteurLangue /></div>
          </div>
        </div>
      </footer>

      {/* Toast ajout au panier */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-black text-white text-[10px] tracking-[0.2em] uppercase px-6 py-3.5 animate-[fadeIn_.25s_ease]">
          {toast}
        </div>
      )}

      {/* Retour en haut */}
      {showTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label={t('retour_haut')}
                className={`fixed left-5 z-40 w-11 h-11 bg-white border text-black hover:bg-black hover:text-white transition-colors flex items-center justify-center ${nbPanier > 0 ? 'bottom-24 sm:bottom-5' : 'bottom-5'}`}
                style={{ borderColor: LIGNE }}>
          <Icone nom="haut" />
        </button>
      )}

      {/* Barre panier collante (mobile) */}
      {nbPanier > 0 && !checkout && (
        <div className="sm:hidden fixed inset-x-0 bottom-0 z-40 bg-white border-t px-5 py-3 flex items-center gap-4" style={{ borderColor: LIGNE }}>
          <div className="flex-1 leading-tight" style={{ textAlign: 'start' }}>
            <Surtitre style={{ color: GRIS }}>{t('nb_articles', { n: nbPanier })}</Surtitre>
            <div className="text-xs tracking-[0.18em] uppercase mt-1">{totalPanier} DH</div>
          </div>
          <button onClick={() => setCheckout(true)}
                  className="bg-black text-white text-[10px] tracking-[0.28em] uppercase px-8 py-3.5">{t('commander')}</button>
        </div>
      )}

      {/* Contact flottant : Telegram + WhatsApp */}
      <ContactFlottant decale={nbPanier > 0} />

      {fiche && <FicheProduit p={fiche} onAdd={ajouter} onClose={() => setFiche(null)} />}
      {checkout && <Checkout panier={panier} setPanier={setPanier} compte={compte} onClose={() => setCheckout(false)} />}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onAuth={(c) => { setCompte(c); setShowCompte(true) }} />}
      {showCompte && compte && <ComptePanel compte={compte} onClose={() => setShowCompte(false)}
                                            onLogout={() => { setCompte(null); setShowCompte(false) }}
                                            onRecommander={recommander} />}
    </div>
  )
}

export default function Vitrine() {
  const [data, setData] = useState(null)
  const [erreur, setErreur] = useState('')
  const [panier, setPanier] = useState(lirePanier())
  const [compte, setCompte] = useState(getCompte())
  const [lang, setLang] = useState(() => { const s = localStorage.getItem('lang'); return CODES.includes(s) ? s : 'fr' })

  useEffect(() => {
    fetch('/api/vitrine', { headers: { 'ngrok-skip-browser-warning': 'true' } })
      .then(r => { if (!r.ok) throw new Error('Chargement impossible'); return r.json() })
      .then(setData).catch(e => setErreur(e.message))
  }, [])
  useEffect(() => { localStorage.setItem('lang', lang) }, [lang])

  const ctx = { lang, setLang, t: makeT(lang) }

  return (
    <LangContext.Provider value={ctx}>
      {erreur ? (
        <div className="min-h-screen flex items-center justify-center text-[11px] tracking-[0.2em] uppercase">{erreur}</div>
      ) : !data ? (
        <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-white">
          <div className="w-8 h-8 border border-stone-200 border-t-black rounded-full animate-spin" />
          <span className="text-[10px] tracking-[0.3em] uppercase" style={{ color: GRIS }}>Chargement</span>
        </div>
      ) : (
        <VitrineContenu data={data} panier={panier} setPanier={setPanier} compte={compte} setCompte={setCompte} />
      )}
    </LangContext.Provider>
  )
}
