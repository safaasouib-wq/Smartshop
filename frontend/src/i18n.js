// Internationalisation de la vitrine — Français / العربية / English.
// L'arabe s'affiche en droite-à-gauche (voir dirOf) ; aucune dépendance externe.
import { createContext, useContext } from 'react'

export const LANGUES = [
  { code: 'fr', label: 'FR' },
  { code: 'ar', label: 'ع' },
  { code: 'en', label: 'EN' },
]

export const CODES = LANGUES.map(l => l.code)
export const dirOf = (lang) => (lang === 'ar' ? 'rtl' : 'ltr')

const TR = {
  fr: {
    nav_carte: 'Notre carte', nav_offres: 'Offres', connexion: 'Se connecter', panier: 'Panier',
    decouvrir: 'Découvrir', commander: 'Commander',
    rechercher_ph: 'Rechercher une douceur…', tous: 'Tous', trier: 'Trier',
    tri_reco: 'Recommandé', tri_prix_asc: 'Prix croissant', tri_prix_desc: 'Prix décroissant',
    en_stock: 'En stock', resultats: '{n} résultat(s)', aucun_produit: 'Aucune douceur trouvée 😔',
    reinit: 'Réinitialiser',
    ajouter: 'Ajouter', epuise: 'Épuisé', plus_que: 'Plus que {n} !', voir: 'Voir',
    toast_ajoute: 'ajouté au panier ✓',
    fiche_quantite: 'Quantité', fiche_ajouter: 'Ajouter au panier',
    sec_delices: 'nos délices pour vous', sec_carte: 'Notre carte', sec_delices_n: 'douceurs à découvrir',
    sec_offre_sur: 'Douceurs du jour', sec_offre_titre: 'Faits maison chaque matin',
    sec_offre_txt: 'Nos pâtisseries traditionnelles sont préparées quotidiennement. Commandez, puis choisissez retrait ou livraison.',
    sec_aniv_sur: 'Sur commande', sec_aniv_titre: "Gâteaux d'anniversaire",
    sec_aniv_txt: 'Personnalisez votre gâteau pour vos grandes occasions. Contactez-nous sur Telegram.',
    offre_cta: 'Commander sur Telegram',
    trust_titre: 'Pourquoi nous choisir',
    trust_paiement_t: 'Paiement à la livraison', trust_paiement_s: 'Payez en espèces à réception',
    trust_maison_t: 'Fait maison', trust_maison_s: 'Préparé chaque jour, à la marocaine',
    trust_livr_t: 'Livraison suivie', trust_livr_s: 'Suivez le livreur en direct sur la carte',
    trust_support_t: 'Support 7j/7', trust_support_s: 'Sur WhatsApp et Telegram',
    best_seller: 'Best-seller', nb_articles: '{n} article(s)',
    avis_sur: 'Ils nous aiment', avis_titre: 'Ce que disent nos clients',
    avis_1: 'Les cornes de gazelle sont exactement comme celles de ma grand-mère. Livraison rapide et soignée !',
    avis_2: "Commandé pour l'anniversaire de ma fille : gâteau magnifique et vraiment délicieux. Merci !",
    avis_3: 'Msemen chauds livrés le matin, un pur bonheur. Je recommande les yeux fermés.',
    footer_admin: 'Espace commerçant',
    checkout_titre: 'Votre commande', checkout_vide: 'Votre panier est vide.', checkout_total: 'Total',
    mode_retrait_t: '🏪 Retrait', mode_retrait_s: 'Récupérer en boutique',
    mode_livr_t: '🛵 Livraison', mode_livr_s: 'À domicile',
    ph_nom: 'Votre nom', ph_tel: 'Téléphone (optionnel)', ph_adresse: 'Adresse de livraison',
    carte_hint: '📍 Cliquez sur la carte pour préciser votre position :',
    pos_ok: 'Position enregistrée ✓', valider: 'Valider la commande', envoi: 'Envoi…',
    ou_1: 'ou commandez via ', ou_lien: 'notre chatbot Telegram',
    err_adresse: 'Indiquez une adresse ou un point sur la carte',
    retour_haut: 'Haut de page',
  },
  ar: {
    nav_carte: 'قائمتنا', nav_offres: 'عروض', connexion: 'تسجيل الدخول', panier: 'السلة',
    decouvrir: 'اكتشف', commander: 'اطلب الآن',
    rechercher_ph: 'ابحث عن حلوى…', tous: 'الكل', trier: 'ترتيب',
    tri_reco: 'موصى به', tri_prix_asc: 'السعر: تصاعدي', tri_prix_desc: 'السعر: تنازلي',
    en_stock: 'متوفر', resultats: '{n} نتيجة', aucun_produit: 'لا يوجد منتج 😔',
    reinit: 'إعادة التعيين',
    ajouter: 'أضف', epuise: 'نفد', plus_que: 'بقي {n} فقط!', voir: 'عرض',
    toast_ajoute: 'أُضيف إلى السلة ✓',
    fiche_quantite: 'الكمية', fiche_ajouter: 'أضف إلى السلة',
    sec_delices: 'حلوياتنا لكم', sec_carte: 'قائمتنا', sec_delices_n: 'حلويات لاكتشافها',
    sec_offre_sur: 'حلوى اليوم', sec_offre_titre: 'طازجة كل صباح',
    sec_offre_txt: 'حلوياتنا التقليدية تُحضَّر يومياً. اطلب، ثم اختر الاستلام أو التوصيل.',
    sec_aniv_sur: 'حسب الطلب', sec_aniv_titre: 'كعك أعياد الميلاد',
    sec_aniv_txt: 'خصّص كعكتك لمناسباتك الخاصة. تواصل معنا عبر تيليغرام.',
    offre_cta: 'اطلب عبر تيليغرام',
    trust_titre: 'لماذا نحن',
    trust_paiement_t: 'الدفع عند التوصيل', trust_paiement_s: 'ادفع نقداً عند الاستلام',
    trust_maison_t: 'صنع منزلي', trust_maison_s: 'يُحضَّر كل يوم بطريقة تقليدية',
    trust_livr_t: 'توصيل مُتتبَّع', trust_livr_s: 'تابع الموصّل مباشرة على الخريطة',
    trust_support_t: 'دعم 7/7', trust_support_s: 'عبر واتساب وتيليغرام',
    best_seller: 'الأكثر مبيعاً', nb_articles: '{n} منتج',
    avis_sur: 'يحبّوننا', avis_titre: 'ماذا يقول زبائننا',
    avis_1: 'كعب الغزال تماماً مثل الذي تحضّره جدتي. توصيل سريع وأنيق!',
    avis_2: 'طلبت كعكة لعيد ميلاد ابنتي: رائعة ولذيذة حقاً. شكراً!',
    avis_3: 'مسمّن ساخن يصل صباحاً، متعة حقيقية. أنصح به بلا تردد.',
    footer_admin: 'فضاء التاجر',
    checkout_titre: 'طلبك', checkout_vide: 'سلتك فارغة.', checkout_total: 'المجموع',
    mode_retrait_t: '🏪 استلام', mode_retrait_s: 'من المتجر',
    mode_livr_t: '🛵 توصيل', mode_livr_s: 'إلى المنزل',
    ph_nom: 'اسمك', ph_tel: 'الهاتف (اختياري)', ph_adresse: 'عنوان التوصيل',
    carte_hint: '📍 اضغط على الخريطة لتحديد موقعك:',
    pos_ok: 'تم حفظ الموقع ✓', valider: 'تأكيد الطلب', envoi: 'جارٍ الإرسال…',
    ou_1: 'أو اطلب عبر ', ou_lien: 'روبوت تيليغرام',
    err_adresse: 'حدّد عنواناً أو نقطة على الخريطة',
    retour_haut: 'أعلى الصفحة',
  },
  en: {
    nav_carte: 'Our menu', nav_offres: 'Offers', connexion: 'Sign in', panier: 'Cart',
    decouvrir: 'Discover', commander: 'Order',
    rechercher_ph: 'Search for a treat…', tous: 'All', trier: 'Sort',
    tri_reco: 'Recommended', tri_prix_asc: 'Price: low to high', tri_prix_desc: 'Price: high to low',
    en_stock: 'In stock', resultats: '{n} result(s)', aucun_produit: 'No treats found 😔',
    reinit: 'Reset',
    ajouter: 'Add', epuise: 'Sold out', plus_que: 'Only {n} left!', voir: 'View',
    toast_ajoute: 'added to cart ✓',
    fiche_quantite: 'Quantity', fiche_ajouter: 'Add to cart',
    sec_delices: 'our treats for you', sec_carte: 'Our menu', sec_delices_n: 'treats to discover',
    sec_offre_sur: "Today's treats", sec_offre_titre: 'Homemade every morning',
    sec_offre_txt: 'Our traditional pastries are made fresh daily. Order, then choose pickup or delivery.',
    sec_aniv_sur: 'Made to order', sec_aniv_titre: 'Birthday cakes',
    sec_aniv_txt: 'Customize your cake for your special occasions. Contact us on Telegram.',
    offre_cta: 'Order on Telegram',
    trust_titre: 'Why choose us',
    trust_paiement_t: 'Cash on delivery', trust_paiement_s: 'Pay in cash on receipt',
    trust_maison_t: 'Homemade', trust_maison_s: 'Made fresh daily, the Moroccan way',
    trust_livr_t: 'Tracked delivery', trust_livr_s: 'Follow the courier live on the map',
    trust_support_t: '7/7 support', trust_support_s: 'On WhatsApp and Telegram',
    best_seller: 'Best-seller', nb_articles: '{n} item(s)',
    avis_sur: 'They love us', avis_titre: 'What our customers say',
    avis_1: "The gazelle horns taste exactly like my grandmother's. Fast, careful delivery!",
    avis_2: "Ordered a cake for my daughter's birthday: gorgeous and truly delicious. Thank you!",
    avis_3: 'Warm msemen delivered in the morning — pure joy. Highly recommend.',
    footer_admin: 'Merchant area',
    checkout_titre: 'Your order', checkout_vide: 'Your cart is empty.', checkout_total: 'Total',
    mode_retrait_t: '🏪 Pickup', mode_retrait_s: 'Collect in store',
    mode_livr_t: '🛵 Delivery', mode_livr_s: 'To your door',
    ph_nom: 'Your name', ph_tel: 'Phone (optional)', ph_adresse: 'Delivery address',
    carte_hint: '📍 Click the map to set your location:',
    pos_ok: 'Location saved ✓', valider: 'Place order', envoi: 'Sending…',
    ou_1: 'or order via ', ou_lien: 'our Telegram chatbot',
    err_adresse: 'Enter an address or a point on the map',
    retour_haut: 'Back to top',
  },
}

// --- Traduction du CONTENU (données venant de la base, en français) ---
// Repli automatique sur la valeur française si aucune traduction n'existe
// (ex. un produit ajouté plus tard par le commerçant reste lisible).
const CONTENU = {
  categorie: {
    'Traditionnel': { ar: 'تقليدي', en: 'Traditional' },
    'Moderne': { ar: 'عصري', en: 'Modern' },
    'Petit-déjeuner': { ar: 'فطور', en: 'Breakfast' },
  },
  produit: {
    'Cornes de gazelle': { ar: 'كعب الغزال', en: 'Gazelle horns' },
    'Chebakia': { ar: 'الشباكية', en: 'Chebakia' },
    'Briouates aux amandes': { ar: 'بريوات باللوز', en: 'Almond briouats' },
    'Tarte au citron': { ar: 'تارت الليمون', en: 'Lemon tart' },
    "Gâteau d'anniversaire": { ar: 'كعكة عيد ميلاد', en: 'Birthday cake' },
    'Macarons assortis': { ar: 'ماكرون منوّع', en: 'Assorted macarons' },
    'Msemen': { ar: 'مسمّن', en: 'Msemen' },
    'Baghrir': { ar: 'بغرير', en: 'Baghrir' },
  },
  description: {
    'Boîte de 12 pièces aux amandes': { ar: 'علبة 12 قطعة باللوز', en: 'Box of 12, with almonds' },
    'Boîte de 500g, miel et sésame': { ar: 'علبة 500غ، عسل وسمسم', en: '500g box, honey & sesame' },
    'Boîte de 10 pièces': { ar: 'علبة 10 قطع', en: 'Box of 10' },
    'Tarte 6 personnes': { ar: 'تارت لـ 6 أشخاص', en: 'Tart for 6' },
    'Génoise personnalisable 8 personnes': { ar: 'كعكة قابلة للتخصيص لـ 8 أشخاص', en: 'Customizable sponge, serves 8' },
    'Boîte de 12 macarons': { ar: 'علبة 12 ماكرون', en: 'Box of 12 macarons' },
    'Paquet de 5 pièces': { ar: 'علبة 5 قطع', en: 'Pack of 5' },
    'Paquet de 6 pièces (mille trous)': { ar: 'علبة 6 قطع (ألف ثقب)', en: 'Pack of 6 (thousand holes)' },
  },
}

// Traduit une valeur de contenu (type: 'produit' | 'categorie' | 'description').
export function tc(lang, type, valeur) {
  if (lang === 'fr' || !valeur) return valeur
  return (CONTENU[type]?.[valeur]?.[lang]) || valeur
}

// Fabrique une fonction de traduction t(cle, vars) pour la langue donnée.
export function makeT(lang) {
  const dico = TR[lang] || TR.fr
  return (cle, vars) => {
    let s = dico[cle] ?? TR.fr[cle] ?? cle
    if (vars) for (const k in vars) s = s.replace(`{${k}}`, vars[k])
    return s
  }
}

export const LangContext = createContext({ lang: 'fr', setLang: () => {}, t: makeT('fr') })
export const useT = () => useContext(LangContext)
