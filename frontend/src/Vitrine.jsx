// Vitrine web publique — design éditorial pâtisserie, recherche/filtres, fiche produit,
// animations, panier, comptes, commande en ligne, bilingue FR/Darija.
import React, { useEffect, useRef, useState } from 'react'
import { authHeader, getCompte, lirePanier, ecrirePanier } from './clientApi.js'
import { AuthModal, ComptePanel } from './Compte.jsx'
import { ContactFlottant, TELEGRAM_BOT } from './Contact.jsx'
import { CODES, LANGUES, LangContext, dirOf, makeT, tc, useT } from './i18n.js'

const OR = '#8a5a34'      // brun caramel — accents, prix, boutons
const BRUN = '#4a3527'    // brun foncé — barre supérieure, pieds
const ROSE = '#c98a76'    // terracotta doux — bandeau promo
const L = window.L
const CASA = [33.5731, -7.6298] // centre Casablanca (carte de checkout)
const SEUIL_STOCK = 5           // en dessous : badge « plus que X »

function Tg({ children, className = '', style }) {
  return (
    <a href={TELEGRAM_BOT} target="_blank" rel="noreferrer" style={style}
       className={`inline-flex items-center justify-center gap-2 transition-all hover:opacity-90 ${className}`}>
      {children}
    </a>
  )
}

function Ornement({ color = OR }) {
  return (
    <div className="flex items-center justify-center gap-3 my-4">
      <span className="h-px w-10" style={{ background: color }} />
      <span className="rotate-45 w-1.5 h-1.5" style={{ background: color }} />
      <span className="h-px w-10" style={{ background: color }} />
    </div>
  )
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
         className={`transition-all duration-700 ease-out ${vu ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}>
      {children}
    </Tag>
  )
}

function BadgeStock({ p }) {
  const { t } = useT()
  if (p.stock <= 0)
    return <span className="absolute top-2 left-2 bg-stone-800/80 text-white text-[10px] tracking-wider uppercase px-2 py-1 rounded-full">{t('epuise')}</span>
  if (p.stock <= SEUIL_STOCK)
    return <span className="absolute top-2 left-2 text-white text-[10px] font-semibold tracking-wide px-2 py-1 rounded-full animate-pulse" style={{ background: '#c0473b' }}>{t('plus_que', { n: p.stock })}</span>
  return null
}

function CarteProduit({ p, onAdd, onOpen }) {
  const { t, lang } = useT()
  const epuise = p.stock <= 0
  return (
    <div className="group text-center">
      <button onClick={() => onOpen(p)} className="block w-full text-left relative bg-white shadow-sm overflow-hidden rounded-sm">
        <div className="aspect-square overflow-hidden bg-[#efe3d3] relative">
          {p.image_url
            ? <img src={p.image_url} alt={p.nom} loading="lazy"
                   className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${epuise ? 'grayscale opacity-60' : ''}`} />
            : <div className="w-full h-full flex items-center justify-center text-5xl">🧁</div>}
          <BadgeStock p={p} />
          {p.best_seller && (
            <span className="absolute top-2 right-2 text-white text-[10px] font-semibold tracking-wide px-2 py-1 rounded-full shadow-sm" style={{ background: OR }}>🔥 {t('best_seller')}</span>
          )}
          <span className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-[11px] tracking-[0.2em] uppercase border border-white/80 px-4 py-2">
              {t('voir')}
            </span>
          </span>
        </div>
      </button>
      <h3 className="mt-4 text-sm font-semibold tracking-[0.15em] uppercase text-stone-800">{tc(lang, 'produit', p.nom)}</h3>
      <p className="font-cormorant italic text-stone-400">{tc(lang, 'categorie', p.categorie)}</p>
      <p className="mt-1 font-serif-display text-lg" style={{ color: OR }}>
        {epuise ? <span className="text-stone-400 text-base">{t('epuise')}</span> : `${p.prix} DH`}
      </p>
      {!epuise && (
        <button onClick={() => onAdd(p)}
                className="mt-2 text-[11px] tracking-[0.2em] uppercase font-semibold text-white px-4 py-1.5 hover:brightness-110 active:scale-95 transition"
                style={{ background: OR }}>{t('ajouter')}</button>
      )}
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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto grid md:grid-cols-2 animate-[fadeIn_.25s_ease]" onClick={e => e.stopPropagation()}>
        <div className="relative aspect-square md:aspect-auto bg-[#efe3d3]">
          {p.image_url
            ? <img src={p.image_url} alt={p.nom} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-7xl">🧁</div>}
          <BadgeStock p={p} />
          {p.best_seller && (
            <span className="absolute top-2 right-2 text-white text-[10px] font-semibold tracking-wide px-2 py-1 rounded-full shadow-sm" style={{ background: OR }}>🔥 {t('best_seller')}</span>
          )}
        </div>
        <div className="p-7 flex flex-col">
          <button onClick={onClose} className="self-end text-stone-400 text-2xl leading-none hover:text-stone-700">×</button>
          <p className="font-cormorant italic text-stone-400">{tc(lang, 'categorie', p.categorie)}</p>
          <h2 className="font-serif-display text-3xl text-stone-800 mt-1">{tc(lang, 'produit', p.nom)}</h2>
          <p className="mt-2 font-serif-display text-2xl" style={{ color: OR }}>{p.prix} DH</p>
          {p.description && <p className="mt-4 text-stone-500 leading-relaxed text-sm">{tc(lang, 'description', p.description)}</p>}
          <div className="mt-auto pt-6">
            {epuise ? (
              <p className="text-center text-stone-400 border border-stone-200 rounded-xl py-3">{t('epuise')}</p>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-xs uppercase tracking-wider text-stone-500">{t('fiche_quantite')}</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200">−</button>
                    <span className="w-6 text-center font-medium">{qty}</span>
                    <button onClick={() => setQty(q => Math.min(p.stock, q + 1))} className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200">+</button>
                  </div>
                </div>
                <button onClick={() => { onAdd(p, qty); onClose() }}
                        className="w-full text-white font-semibold py-3 rounded-xl tracking-wide hover:brightness-110 active:scale-[.98] transition"
                        style={{ background: OR }}>
                  {t('fiche_ajouter')} · {p.prix * qty} DH
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CarteVisuel({ image, titre, texte, onClick }) {
  return (
    <button onClick={onClick} className="group text-center block w-full cursor-pointer">
      <div className="overflow-hidden shadow-sm rounded-sm">
        <div className="h-56 bg-[#efe3d3] overflow-hidden">
          {image
            ? <img src={image} alt={titre} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            : <div className="w-full h-full flex items-center justify-center text-5xl">🍰</div>}
        </div>
      </div>
      <h3 className="mt-5 text-base font-semibold tracking-[0.18em] uppercase text-stone-800 group-hover:text-[#8a5a34] transition-colors">{titre}</h3>
      <p className="font-cormorant italic text-stone-500 mt-1 px-4">{texte}</p>
    </button>
  )
}

function Banniere({ image, surtitre, titre, texte, cta, droite, rose }) {
  return (
    <div className="grid md:grid-cols-2 overflow-hidden shadow-sm bg-white rounded-sm">
      <div className={`h-64 md:h-auto md:min-h-[320px] bg-[#efe3d3] overflow-hidden ${droite ? 'md:order-2' : ''}`}>
        {image && <img src={image} alt={titre} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />}
      </div>
      <div className="flex flex-col items-center justify-center text-center p-10" style={rose ? { background: ROSE } : {}}>
        {surtitre && <p className="font-script text-3xl" style={{ color: rose ? '#fff' : OR }}>{surtitre}</p>}
        <h3 className={`font-serif-display text-3xl mt-1 ${rose ? 'text-white' : 'text-stone-800'}`}>{titre}</h3>
        <Ornement color={rose ? '#ffffff' : OR} />
        <p className={`font-cormorant italic max-w-sm text-lg ${rose ? 'text-white/90' : 'text-stone-500'}`}>{texte}</p>
        <Tg className={`mt-6 text-xs tracking-[0.2em] uppercase font-semibold px-8 py-3 hover:brightness-110 ${rose ? 'bg-white' : 'text-white'}`}
            style={rose ? { color: BRUN } : { background: OR }}>{cta}</Tg>
      </div>
    </div>
  )
}

// Bande de réassurance (arguments de confiance).
function BandeConfiance() {
  const { t } = useT()
  const items = [
    ['💳', t('trust_paiement_t'), t('trust_paiement_s')],
    ['👩‍🍳', t('trust_maison_t'), t('trust_maison_s')],
    ['🛵', t('trust_livr_t'), t('trust_livr_s')],
    ['💬', t('trust_support_t'), t('trust_support_s')],
  ]
  return (
    <section className="bg-white border-y border-stone-200/70">
      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        {items.map(([ico, titre, sous], i) => (
          <Reveal key={titre} delay={i * 80} className="text-center">
            <div className="text-3xl">{ico}</div>
            <h4 className="mt-3 text-sm font-semibold tracking-wider uppercase text-stone-800">{titre}</h4>
            <p className="mt-1 text-sm text-stone-500 font-cormorant italic">{sous}</p>
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
    <section className="max-w-6xl mx-auto px-4 py-16">
      <p className="text-center font-script text-3xl" style={{ color: OR }}>{t('avis_sur')}</p>
      <h3 className="text-center font-serif-display text-3xl text-stone-800 mt-1">{t('avis_titre')}</h3>
      <Ornement />
      <div className="grid md:grid-cols-3 gap-6 mt-6">
        {avis.map(([nom, txt], i) => (
          <Reveal key={nom} delay={i * 90}>
            <div className="bg-white rounded-sm shadow-sm p-8 h-full flex flex-col">
              <div className="text-base tracking-widest" style={{ color: OR }}>★★★★★</div>
              <p className="mt-3 font-cormorant italic text-lg text-stone-600 leading-relaxed flex-1">« {txt} »</p>
              <div className="mt-5 flex items-center gap-3">
                <span className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0" style={{ background: ROSE }}>{nom[0]}</span>
                <span className="text-sm font-semibold tracking-wide text-stone-700">{nom}</span>
              </div>
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
            className={`px-4 py-1.5 rounded-full text-[11px] tracking-[0.15em] uppercase transition ${cat === val ? 'text-white' : 'bg-white text-stone-500 border border-stone-200 hover:border-stone-400'}`}
            style={cat === val ? { background: OR } : {}}>{label}</button>
  )
  return (
    <div className="flex flex-col gap-4 mb-10">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">🔍</span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('rechercher_ph')}
                 className="w-full pl-9 pr-3 py-2.5 rounded-full border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#8a5a34]/40" />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)}
                className="py-2.5 px-3 rounded-full border border-stone-200 bg-white text-sm text-stone-600 focus:outline-none">
          <option value="reco">{t('trier')} · {t('tri_reco')}</option>
          <option value="asc">{t('tri_prix_asc')}</option>
          <option value="desc">{t('tri_prix_desc')}</option>
        </select>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {chip('all', t('tous'))}
        {categories.map(c => chip(c, tc(lang, 'categorie', c)))}
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
  return <div ref={div} style={{ height: 200 }} className="rounded-lg overflow-hidden border border-stone-200" />
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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif-display text-2xl">{t('checkout_titre')}</h2>
            <button onClick={onClose} className="text-stone-400 text-2xl leading-none hover:text-stone-700">×</button>
          </div>

          {panier.length === 0 ? (
            <p className="text-stone-500 py-8 text-center">{t('checkout_vide')}</p>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {panier.map(i => (
                  <div key={i.id} className="flex items-center gap-3 text-sm">
                    <span className="flex-1">{tc(lang, 'produit', i.nom)}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setQty(i.id, -1)} className="w-6 h-6 rounded-full bg-stone-100 hover:bg-stone-200">−</button>
                      <span className="w-5 text-center">{i.qty}</span>
                      <button onClick={() => setQty(i.id, +1)} className="w-6 h-6 rounded-full bg-stone-100 hover:bg-stone-200">+</button>
                    </div>
                    <span className="w-16 text-right font-medium">{i.prix * i.qty} DH</span>
                    <button onClick={() => retirer(i.id)} className="text-stone-300 hover:text-red-500">🗑</button>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-semibold border-t border-stone-100 pt-2 mb-5">
                <span>{t('checkout_total')}</span><span style={{ color: OR }}>{total} DH</span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {[['retrait', t('mode_retrait_t'), t('mode_retrait_s')], ['livraison', t('mode_livr_t'), t('mode_livr_s')]].map(([v, ti, s]) => (
                  <button key={v} onClick={() => setMode(v)}
                          className={`rounded-xl border-2 p-3 text-left transition ${mode === v ? 'border-transparent text-white' : 'border-stone-200 bg-white hover:border-stone-300'}`}
                          style={mode === v ? { background: OR } : {}}>
                    <div className="font-semibold text-sm">{ti}</div>
                    <div className={`text-xs ${mode === v ? 'text-white/80' : 'text-stone-400'}`}>{s}</div>
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <input value={nom} onChange={e => setNom(e.target.value)} placeholder={t('ph_nom')}
                       className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8a5a34]/40" />
                <input value={tel} onChange={e => setTel(e.target.value)} placeholder={t('ph_tel')}
                       className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8a5a34]/40" />
                {mode === 'livraison' && (
                  <>
                    <input value={adresse} onChange={e => setAdresse(e.target.value)} placeholder={t('ph_adresse')}
                           className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8a5a34]/40" />
                    <div>
                      <p className="text-xs text-stone-400 mb-1">{t('carte_hint')}</p>
                      <MiniCarte onPick={(lat, lng) => setPin([lat, lng])} />
                      {pin && <p className="text-xs text-emerald-600 mt-1">{t('pos_ok')}</p>}
                    </div>
                  </>
                )}
              </div>

              {erreur && <p className="text-red-600 text-sm mt-3">{erreur}</p>}

              <button onClick={valider} disabled={envoi}
                      className="w-full mt-5 text-white font-semibold py-3 rounded-xl tracking-wide disabled:opacity-60 hover:brightness-110 active:scale-[.98] transition"
                      style={{ background: OR }}>
                {envoi ? t('envoi') : `${t('valider')} · ${total} DH`}
              </button>
              <p className="text-center text-xs text-stone-400 mt-3">
                {t('ou_1')}<a href={TELEGRAM_BOT} target="_blank" rel="noreferrer" className="underline">{t('ou_lien')}</a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Sélecteur de langue (FR / Darija).
function SelecteurLangue() {
  const { lang, setLang } = useT()
  return (
    <div className="flex items-center rounded-full border border-stone-200 overflow-hidden text-[10px] font-semibold">
      {LANGUES.map(l => (
        <button key={l.code} onClick={() => setLang(l.code)}
                className={`px-2 py-1 transition ${lang === l.code ? 'text-white' : 'text-stone-500 hover:text-stone-800'}`}
                style={lang === l.code ? { background: OR } : {}}>{l.label}</button>
      ))}
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
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [sort, setSort] = useState('reco')
  const toastTimer = useRef(null)

  useEffect(() => { ecrirePanier(panier) }, [panier])
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600)
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
  const img = (pred) => (produits.find(pred) || {}).image_url
  const heroImg = img(p => /macaron/i.test(p.nom)) || (produits[0] || {}).image_url
  const offreImg = img(p => /chebakia/i.test(p.nom)) || (produits[1] || {}).image_url
  const anivImg = img(p => /gâteau|gateau|anniversaire/i.test(p.nom))

  // Filtrage / tri
  const filtreActif = q.trim() !== '' || cat !== 'all' || sort !== 'reco'
  let filtres = produits
  const terme = q.trim().toLowerCase()
  if (terme) filtres = filtres.filter(p => `${p.nom} ${p.description || ''} ${p.categorie || ''} ${tc(lang, 'produit', p.nom)} ${tc(lang, 'categorie', p.categorie)} ${tc(lang, 'description', p.description || '')}`.toLowerCase().includes(terme))
  if (cat !== 'all') filtres = filtres.filter(p => (p.categorie || 'Autres') === cat)
  if (sort === 'asc') filtres = [...filtres].sort((a, b) => a.prix - b.prix)
  else if (sort === 'desc') filtres = [...filtres].sort((a, b) => b.prix - a.prix)
  const reinit = () => { setQ(''); setCat('all'); setSort('reco') }
  const allerCategorie = (c) => {
    setCat(c); setQ('')
    setTimeout(() => document.getElementById('carte')?.scrollIntoView({ behavior: 'smooth' }), 60)
  }

  return (
    <div dir={dirOf(lang)} className="min-h-screen bg-[#f7efe3] text-stone-800">
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>

      {/* BARRE SUPÉRIEURE */}
      <div className="text-[11px] tracking-wide" style={{ background: BRUN, color: '#e9dccb' }}>
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
          <span className="truncate">🕐 {commerce.horaires || commerce.description}</span>
          {commerce.telephone && <span className="hidden sm:flex items-center gap-1.5 shrink-0">☎ {commerce.telephone}</span>}
        </div>
      </div>

      {/* NAV */}
      <nav className="border-b border-[#e6d6c0] bg-[#f7efe3]/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-4 sm:gap-6 text-[11px] tracking-[0.2em] uppercase text-stone-600">
            <a href="#carte" className="hover:text-stone-900">{t('nav_carte')}</a>
            <a href="#offre" className="hidden sm:inline hover:text-stone-900">{t('nav_offres')}</a>
          </div>
          <a href="/" className="text-2xl shrink-0">🕊️</a>
          <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3">
            <SelecteurLangue />
            <button onClick={() => compte ? setShowCompte(true) : setShowAuth(true)}
                    className="text-[11px] tracking-[0.15em] uppercase text-stone-600 hover:text-stone-900 flex items-center gap-1 whitespace-nowrap">
              👤 <span className="hidden md:inline">{compte ? compte.nom.split(' ')[0] : t('connexion')}</span>
            </button>
            <button onClick={() => setCheckout(true)}
                    className="text-[11px] tracking-[0.2em] uppercase font-semibold text-white px-4 sm:px-5 py-2 rounded-full flex items-center gap-2 hover:brightness-110 transition"
                    style={{ background: OR }}>🛒<span className="hidden sm:inline">{t('panier')}</span>{nbPanier > 0 && <span className="bg-white/25 rounded-full px-1.5">{nbPanier}</span>}</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="relative h-[70vh] min-h-[460px] flex items-center justify-center overflow-hidden">
        {heroImg && <img src={heroImg} alt="" className="absolute inset-0 w-full h-full object-cover scale-105" />}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-black/40" />
        <div className="relative text-center text-white px-4">
          <p className="font-script text-6xl md:text-8xl drop-shadow-lg">{commerce.nom}</p>
          <p className="mt-3 tracking-[0.3em] uppercase text-xs md:text-sm">{commerce.description || 'Pâtisserie fine'}</p>
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            <a href="#carte" className="border border-white/80 rounded-full px-8 py-3 text-xs tracking-[0.25em] uppercase hover:bg-white hover:text-stone-800 transition-colors">{t('decouvrir')}</a>
            <button onClick={() => setCheckout(true)} className="rounded-full px-8 py-3 text-xs tracking-[0.25em] uppercase text-white hover:brightness-110 transition" style={{ background: OR }}>{t('commander')}</button>
          </div>
        </div>
      </header>

      {/* 3 CARTES VISUELS */}
      <section className="max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-3 gap-8">
        {categories.slice(0, 3).map((c, i) => (
          <Reveal key={c} delay={i * 90}>
            <CarteVisuel image={parCat[c][0]?.image_url} titre={tc(lang, 'categorie', c)}
              texte={`${parCat[c].length} ${t('sec_delices_n')}`} onClick={() => allerCategorie(c)} />
          </Reveal>
        ))}
      </section>

      {/* BANNIERE OFFRE */}
      <section id="offre" className="max-w-6xl mx-auto px-4 pb-16">
        <Reveal>
          <Banniere image={offreImg} surtitre={t('sec_offre_sur')} titre={t('sec_offre_titre')}
            texte={t('sec_offre_txt')} cta={t('offre_cta')} />
        </Reveal>
      </section>

      {/* CARTE : titre + filtres + produits */}
      <section id="carte" className="max-w-6xl mx-auto px-4 pb-4 text-center">
        <p className="font-script text-4xl" style={{ color: OR }}>{t('sec_delices')}</p>
        <h2 className="font-serif-display text-4xl text-stone-800 mt-1">{t('sec_carte')}</h2>
        <Ornement />
        {commerce.message_accueil && <p className="font-cormorant italic text-stone-500 max-w-xl mx-auto text-lg">{commerce.message_accueil}</p>}
      </section>
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <BarreFiltres q={q} setQ={setQ} cat={cat} setCat={setCat} sort={sort} setSort={setSort} categories={categories} />

        {filtreActif ? (
          filtres.length ? (
            <>
              <p className="text-center text-xs tracking-[0.2em] uppercase text-stone-400 mb-6">{t('resultats', { n: filtres.length })}</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                {filtres.map(p => <CarteProduit key={p.id} p={p} onAdd={ajouter} onOpen={setFiche} />)}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <p className="font-cormorant italic text-xl text-stone-400">{t('aucun_produit')}</p>
              <button onClick={reinit} className="mt-4 text-[11px] tracking-[0.2em] uppercase text-white px-6 py-2 rounded-full" style={{ background: OR }}>{t('reinit')}</button>
            </div>
          )
        ) : (
          categories.map(c => (
            <Reveal key={c} className="mb-14">
              <h3 className="text-center text-sm tracking-[0.3em] uppercase text-stone-400 mb-8">{tc(lang, 'categorie', c)}</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                {parCat[c].map(p => <CarteProduit key={p.id} p={p} onAdd={ajouter} onOpen={setFiche} />)}
              </div>
            </Reveal>
          ))
        )}
      </section>

      {/* CONFIANCE */}
      <BandeConfiance />

      {/* AVIS CLIENTS */}
      <BandeAvis />

      {/* BANNIERE ANNIVERSAIRE */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <Reveal>
          <Banniere image={anivImg} droite rose surtitre={t('sec_aniv_sur')} titre={t('sec_aniv_titre')}
            texte={t('sec_aniv_txt')} cta={t('offre_cta')} />
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-stone-200 py-14">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="text-3xl">🕊️</div>
          <h4 className="font-serif-display text-2xl text-stone-800 mt-2">{commerce.nom}</h4>
          <Ornement />
          <div className="font-cormorant text-stone-500 text-lg space-y-0.5">
            {commerce.adresse && <p>{commerce.adresse}</p>}
            {commerce.telephone && <p>{commerce.telephone}</p>}
            {commerce.horaires && <p>{commerce.horaires}</p>}
          </div>
          <p className="mt-8 text-[11px] tracking-[0.15em] uppercase text-stone-400">
            {t('footer_admin')} : <a href="/admin" className="underline hover:text-stone-600">/admin</a>
          </p>
        </div>
      </footer>

      {/* Toast ajout au panier */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-stone-900 text-white text-sm px-5 py-3 rounded-full shadow-xl animate-[fadeIn_.25s_ease]">
          {toast}
        </div>
      )}

      {/* Retour en haut */}
      {showTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label={t('retour_haut')}
                className={`fixed left-5 z-40 w-11 h-11 rounded-full bg-white shadow-lg border border-stone-200 text-stone-600 hover:text-stone-900 hover:-translate-y-0.5 transition flex items-center justify-center ${nbPanier > 0 ? 'bottom-24 sm:bottom-5' : 'bottom-5'}`}>
          ↑
        </button>
      )}

      {/* Bouton panier flottant (desktop / tablette) */}
      {nbPanier > 0 && (
        <button onClick={() => setCheckout(true)}
                className="fixed bottom-5 right-5 z-40 text-white rounded-full shadow-xl px-5 py-4 hidden sm:flex items-center gap-3 font-semibold hover:brightness-110 transition"
                style={{ background: OR }}>
          🛒 <span>{nbPanier}</span><span className="opacity-70">·</span><span>{totalPanier} DH</span>
        </button>
      )}

      {/* Barre panier collante (mobile) */}
      {nbPanier > 0 && !checkout && (
        <div className="sm:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-[#e6d6c0] px-4 py-3 flex items-center gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="flex-1 leading-tight">
            <div className="text-[11px] uppercase tracking-wider text-stone-500">{t('nb_articles', { n: nbPanier })}</div>
            <div className="font-serif-display text-lg" style={{ color: OR }}>{totalPanier} DH</div>
          </div>
          <button onClick={() => setCheckout(true)}
                  className="text-white text-xs font-semibold tracking-[0.15em] uppercase px-6 py-3 rounded-full flex items-center gap-2 hover:brightness-110 active:scale-95 transition"
                  style={{ background: OR }}>🛒 {t('commander')}</button>
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
    fetch('/api/vitrine')
      .then(r => { if (!r.ok) throw new Error('Chargement impossible'); return r.json() })
      .then(setData).catch(e => setErreur(e.message))
  }, [])
  useEffect(() => { localStorage.setItem('lang', lang) }, [lang])

  const ctx = { lang, setLang, t: makeT(lang) }

  return (
    <LangContext.Provider value={ctx}>
      {erreur ? (
        <div className="min-h-screen flex items-center justify-center text-stone-500">😔 {erreur}</div>
      ) : !data ? (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f7efe3]">
          <div className="w-10 h-10 border-2 border-stone-300 border-t-[#8a5a34] rounded-full animate-spin" />
          <span className="font-cormorant italic text-stone-400 text-xl">Chargement de la boutique…</span>
        </div>
      ) : (
        <VitrineContenu data={data} panier={panier} setPanier={setPanier} compte={compte} setCompte={setCompte} />
      )}
    </LangContext.Provider>
  )
}
