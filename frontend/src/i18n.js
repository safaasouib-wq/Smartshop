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
    nav_carte: 'La collection', nav_offres: 'Sélection', connexion: 'Se connecter', panier: 'Panier',
    decouvrir: 'Découvrir', commander: 'Commander',
    rechercher_ph: 'Rechercher une pièce…', tous: 'Tout', trier: 'Trier',
    tri_reco: 'Recommandé', tri_prix_asc: 'Prix croissant', tri_prix_desc: 'Prix décroissant',
    en_stock: 'En stock', resultats: '{n} résultat(s)', aucun_produit: 'Aucune pièce trouvée',
    reinit: 'Réinitialiser',
    ajouter: 'Ajouter', epuise: 'Épuisé', plus_que: 'Plus que {n} !', voir: 'Voir',
    toast_ajoute: 'ajouté au panier ✓',
    fiche_quantite: 'Quantité', fiche_ajouter: 'Ajouter au panier',
    sec_delices: "nos pièces d'exception", sec_carte: 'La collection', sec_delices_n: 'pièces à découvrir',
    sec_offre_sur: 'Maroquinerie', sec_offre_titre: 'Cuirs sélectionnés à la main',
    sec_offre_txt: 'Chaque sac est choisi pièce par pièce chez nos ateliers partenaires. Commandez, puis choisissez le retrait en boutique ou la livraison.',
    sec_aniv_sur: 'Horlogerie', sec_aniv_titre: "Montres d'exception",
    sec_aniv_txt: 'Automatiques, chronographes et modèles sertis. Écrivez-nous sur Telegram pour un conseil personnalisé.',
    offre_cta: 'Commander sur Telegram',
    trust_titre: 'Pourquoi nous choisir',
    trust_paiement_t: 'Paiement à la livraison', trust_paiement_s: 'Payez en espèces à réception',
    trust_maison_t: 'Pièces authentiques', trust_maison_s: 'Sourcées et contrôlées une à une',
    trust_livr_t: 'Livraison suivie', trust_livr_s: 'Suivez le livreur en direct sur la carte',
    trust_support_t: 'Conseil 7j/7', trust_support_s: 'Sur WhatsApp et Telegram',
    best_seller: 'Best-seller', nb_articles: '{n} article(s)',
    avis_sur: 'Ils nous font confiance', avis_titre: 'Ce que disent nos clients',
    avis_1: 'Le sac en cuir grainé est encore plus beau en vrai. Emballage soigné, service impeccable.',
    avis_2: 'Ma montre automatique livrée en 24 h à Casa, avec la garantie. Rien à redire.',
    avis_3: 'Caftan brodé pour un mariage : coupe parfaite et tissu superbe. Je reviendrai.',
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
    nav_carte: 'المجموعة', nav_offres: 'مختارات', connexion: 'تسجيل الدخول', panier: 'السلة',
    decouvrir: 'اكتشف', commander: 'اطلب الآن',
    rechercher_ph: 'ابحث عن قطعة…', tous: 'الكل', trier: 'ترتيب',
    tri_reco: 'موصى به', tri_prix_asc: 'السعر: تصاعدي', tri_prix_desc: 'السعر: تنازلي',
    en_stock: 'متوفر', resultats: '{n} نتيجة', aucun_produit: 'لا توجد قطعة',
    reinit: 'إعادة التعيين',
    ajouter: 'أضف', epuise: 'نفد', plus_que: 'بقي {n} فقط!', voir: 'عرض',
    toast_ajoute: 'أُضيف إلى السلة ✓',
    fiche_quantite: 'الكمية', fiche_ajouter: 'أضف إلى السلة',
    sec_delices: 'قطعنا الاستثنائية', sec_carte: 'المجموعة', sec_delices_n: 'قطعة لاكتشافها',
    sec_offre_sur: 'الجلود', sec_offre_titre: 'جلود مختارة بعناية',
    sec_offre_txt: 'كل حقيبة مختارة قطعة بقطعة من ورشاتنا الشريكة. اطلب، ثم اختر الاستلام من المتجر أو التوصيل.',
    sec_aniv_sur: 'الساعات', sec_aniv_titre: 'ساعات استثنائية',
    sec_aniv_txt: 'أوتوماتيكية، كرونوغراف وموديلات مرصعة. راسلنا على تيليغرام لنصيحة خاصة.',
    offre_cta: 'اطلب عبر تيليغرام',
    trust_titre: 'لماذا نحن',
    trust_paiement_t: 'الدفع عند التوصيل', trust_paiement_s: 'ادفع نقداً عند الاستلام',
    trust_maison_t: 'قطع أصلية', trust_maison_s: 'مُنتقاة ومراقبة واحدة واحدة',
    trust_livr_t: 'توصيل مُتتبَّع', trust_livr_s: 'تابع الموصّل مباشرة على الخريطة',
    trust_support_t: 'استشارة 7/7', trust_support_s: 'عبر واتساب وتيليغرام',
    best_seller: 'الأكثر مبيعاً', nb_articles: '{n} منتج',
    avis_sur: 'يثقون بنا', avis_titre: 'ماذا يقول زبائننا',
    avis_1: 'حقيبة الجلد المحبب أجمل على الواقع. تغليف أنيق وخدمة ممتازة.',
    avis_2: 'وصلتني الساعة الأوتوماتيكية في 24 ساعة بالدار البيضاء مع الضمان. ممتاز.',
    avis_3: 'قفطان مطرز لحفل زفاف: قصة مثالية وقماش رائع. سأعود بالتأكيد.',
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
    nav_carte: 'The collection', nav_offres: 'Selection', connexion: 'Sign in', panier: 'Cart',
    decouvrir: 'Discover', commander: 'Order',
    rechercher_ph: 'Search for a piece…', tous: 'All', trier: 'Sort',
    tri_reco: 'Recommended', tri_prix_asc: 'Price: low to high', tri_prix_desc: 'Price: high to low',
    en_stock: 'In stock', resultats: '{n} result(s)', aucun_produit: 'No piece found',
    reinit: 'Reset',
    ajouter: 'Add', epuise: 'Sold out', plus_que: 'Only {n} left!', voir: 'View',
    toast_ajoute: 'added to cart ✓',
    fiche_quantite: 'Quantity', fiche_ajouter: 'Add to cart',
    sec_delices: 'our exceptional pieces', sec_carte: 'The collection', sec_delices_n: 'pieces to discover',
    sec_offre_sur: 'Leather goods', sec_offre_titre: 'Hand-picked leathers',
    sec_offre_txt: 'Every bag is chosen piece by piece from our partner workshops. Order, then pick in-store collection or delivery.',
    sec_aniv_sur: 'Watchmaking', sec_aniv_titre: 'Exceptional watches',
    sec_aniv_txt: 'Automatics, chronographs and gem-set models. Message us on Telegram for personal advice.',
    offre_cta: 'Order on Telegram',
    trust_titre: 'Why choose us',
    trust_paiement_t: 'Cash on delivery', trust_paiement_s: 'Pay in cash on receipt',
    trust_maison_t: 'Authentic pieces', trust_maison_s: 'Sourced and checked one by one',
    trust_livr_t: 'Tracked delivery', trust_livr_s: 'Follow the courier live on the map',
    trust_support_t: 'Advice 7/7', trust_support_s: 'On WhatsApp and Telegram',
    best_seller: 'Best-seller', nb_articles: '{n} item(s)',
    avis_sur: 'They trust us', avis_titre: 'What our customers say',
    avis_1: 'The grained leather bag is even nicer in person. Careful packaging, flawless service.',
    avis_2: 'My automatic watch arrived within 24 h in Casablanca, warranty included. Perfect.',
    avis_3: 'Embroidered kaftan for a wedding: perfect cut and gorgeous fabric. I will be back.',
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
    'Vêtements': { ar: 'ملابس', en: 'Clothing' },
    'Sacs': { ar: 'حقائب', en: 'Bags' },
    'Montres': { ar: 'ساعات', en: 'Watches' },
  },
  produit: {
    'Trench en cachemire': { ar: 'معطف كشمير', en: 'Cashmere trench coat' },
    'Blazer croisé en laine': { ar: 'سترة صوف مزدوجة', en: 'Double-breasted wool blazer' },
    'Robe de soirée en soie': { ar: 'فستان سهرة حريري', en: 'Silk evening dress' },
    'Caftan brodé main': { ar: 'قفطان مطرز يدوياً', en: 'Hand-embroidered kaftan' },
    'Sac à main cuir grainé': { ar: 'حقيبة يد جلد محبب', en: 'Grained leather handbag' },
    'Cabas en cuir camel': { ar: 'حقيبة كبيرة جلد كاميل', en: 'Camel leather tote' },
    'Pochette de soirée satin': { ar: 'حقيبة سهرة ساتان', en: 'Satin evening clutch' },
    'Sac à dos cuir nappa': { ar: 'حقيبة ظهر جلد نابا', en: 'Nappa leather backpack' },
    'Montre automatique acier': { ar: 'ساعة أوتوماتيكية فولاذية', en: 'Steel automatic watch' },
    'Chronographe or rose': { ar: 'كرونوغراف ذهبي وردي', en: 'Rose gold chronograph' },
    'Montre squelette cuir': { ar: 'ساعة هيكلية بسوار جلد', en: 'Skeleton watch, leather strap' },
    'Montre femme nacre': { ar: 'ساعة نسائية بعرق اللؤلؤ', en: "Mother-of-pearl ladies' watch" },
  },
  description: {
    'Laine et cachemire, coupe droite, ceinture': { ar: 'صوف وكشمير، قصة مستقيمة مع حزام', en: 'Wool and cashmere, straight cut, belted' },
    'Laine vierge, doublure en soie': { ar: 'صوف بكر، بطانة حريرية', en: 'Virgin wool, silk lining' },
    'Soie sauvage, finitions à la main': { ar: 'حرير بري، تشطيب يدوي', en: 'Wild silk, hand-finished' },
    'Brocart et broderie sfifa, pièce unique': { ar: 'بروكار وتطريز السفيفة، قطعة فريدة', en: 'Brocade with sfifa embroidery, one of a kind' },
    'Cuir de veau grainé, fermoir doré': { ar: 'جلد بقري محبب، إبزيم ذهبي', en: 'Grained calfskin, gold clasp' },
    'Grand format, cuir pleine fleur': { ar: 'حجم كبير، جلد طبيعي كامل', en: 'Large format, full-grain leather' },
    'Satin de soie, chaîne amovible': { ar: 'ساتان حريري، سلسلة قابلة للفصل', en: 'Silk satin, removable chain' },
    'Cuir nappa souple, doublure suédine': { ar: 'جلد نابا ناعم، بطانة شامواه', en: 'Soft nappa leather, suede lining' },
    'Mouvement automatique, bracelet acier': { ar: 'حركة أوتوماتيكية، سوار فولاذي', en: 'Automatic movement, steel bracelet' },
    'Chronographe, boîtier plaqué or rose': { ar: 'كرونوغراف، علبة مطلية بالذهب الوردي', en: 'Chronograph, rose gold plated case' },
    'Cadran squelette, bracelet cuir noir': { ar: 'مينا هيكلية، سوار جلد أسود', en: 'Skeleton dial, black leather strap' },
    'Cadran nacre, index sertis': { ar: 'مينا من عرق اللؤلؤ، مؤشرات مرصعة', en: 'Mother-of-pearl dial, set indexes' },
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
