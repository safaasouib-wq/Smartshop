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
    avis_2: 'Ma montre dorée livrée en 24 h à Casa, avec la garantie. Rien à redire.',
    avis_3: 'Caftan en satin brodé pour un mariage : coupe parfaite et tissu superbe. Je reviendrai.',
    footer_admin: 'Espace commerçant',
    checkout_titre: 'Votre commande', checkout_vide: 'Votre panier est vide.', checkout_total: 'Total',
    mode_retrait_t: 'Retrait', mode_retrait_s: 'Récupérer en boutique',
    mode_livr_t: 'Livraison', mode_livr_s: 'À domicile',
    ph_nom: 'Votre nom', ph_tel: 'Téléphone (optionnel)', ph_adresse: 'Adresse de livraison',
    carte_hint: 'Cliquez sur la carte pour préciser votre position :',
    pos_ok: 'Position enregistrée ✓', valider: 'Valider la commande', envoi: 'Envoi…',
    ou_1: 'ou commandez via ', ou_lien: 'notre chatbot Telegram',
    err_adresse: 'Indiquez une adresse ou un point sur la carte',
    retour_haut: 'Haut de page',
    annonce_1: 'Livraison offerte à Casablanca en 24 h',
    hero_sur: 'Nouvelle collection', hero_titre: "L'essentiel du vestiaire",
    voir_cat: 'Découvrir', edito_num_1: 'Maroquinerie — 001', edito_num_2: 'Horlogerie — 002',
    foot_menu: 'Navigation', foot_contact: 'Contact',
    foot_txt: 'Une question sur une pièce, une taille ou une livraison ? Écrivez-nous, on répond en quelques minutes.',
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
    avis_2: 'وصلتني الساعة الذهبية في 24 ساعة بالدار البيضاء مع الضمان. ممتاز.',
    avis_3: 'قفطان ساتان مطرز لحفل زفاف: قصة مثالية وقماش رائع. سأعود بالتأكيد.',
    footer_admin: 'فضاء التاجر',
    checkout_titre: 'طلبك', checkout_vide: 'سلتك فارغة.', checkout_total: 'المجموع',
    mode_retrait_t: 'استلام', mode_retrait_s: 'من المتجر',
    mode_livr_t: 'توصيل', mode_livr_s: 'إلى المنزل',
    ph_nom: 'اسمك', ph_tel: 'الهاتف (اختياري)', ph_adresse: 'عنوان التوصيل',
    carte_hint: 'اضغط على الخريطة لتحديد موقعك:',
    pos_ok: 'تم حفظ الموقع ✓', valider: 'تأكيد الطلب', envoi: 'جارٍ الإرسال…',
    ou_1: 'أو اطلب عبر ', ou_lien: 'روبوت تيليغرام',
    err_adresse: 'حدّد عنواناً أو نقطة على الخريطة',
    retour_haut: 'أعلى الصفحة',
    annonce_1: 'التوصيل مجاني بالدار البيضاء خلال 24 ساعة',
    hero_sur: 'مجموعة جديدة', hero_titre: 'أساسيات خزانتك',
    voir_cat: 'اكتشف', edito_num_1: 'جلديات — 001', edito_num_2: 'ساعات — 002',
    foot_menu: 'التنقل', foot_contact: 'اتصل بنا',
    foot_txt: 'سؤال عن قطعة أو مقاس أو التوصيل؟ راسلنا، نجيب في دقائق.',
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
    avis_2: 'My gold watch arrived within 24 h in Casablanca, warranty included. Perfect.',
    avis_3: 'Embroidered satin kaftan for a wedding: perfect cut and gorgeous fabric. I will be back.',
    footer_admin: 'Merchant area',
    checkout_titre: 'Your order', checkout_vide: 'Your cart is empty.', checkout_total: 'Total',
    mode_retrait_t: 'Pickup', mode_retrait_s: 'Collect in store',
    mode_livr_t: 'Delivery', mode_livr_s: 'To your door',
    ph_nom: 'Your name', ph_tel: 'Phone (optional)', ph_adresse: 'Delivery address',
    carte_hint: 'Click the map to set your location:',
    pos_ok: 'Location saved ✓', valider: 'Place order', envoi: 'Sending…',
    ou_1: 'or order via ', ou_lien: 'our Telegram chatbot',
    err_adresse: 'Enter an address or a point on the map',
    retour_haut: 'Back to top',
    annonce_1: 'Free delivery in Casablanca within 24 h',
    hero_sur: 'New collection', hero_titre: 'The essentials of your wardrobe',
    voir_cat: 'Discover', edito_num_1: 'Leather goods — 001', edito_num_2: 'Watches — 002',
    foot_menu: 'Navigation', foot_contact: 'Contact',
    foot_txt: 'A question about a piece, a size or delivery? Write to us, we answer within minutes.',
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
    'Manteau long en laine ivoire': { ar: 'معطف طويل من الصوف عاجي', en: 'Long ivory wool coat' },
    'Caftan satin bleu canard': { ar: 'قفطان ساتان أزرق بترولي', en: 'Teal satin kaftan' },
    'Caftan satin perle': { ar: 'قفطان ساتان لؤلؤي', en: 'Pearl satin kaftan' },
    'Caftan satin prune': { ar: 'قفطان ساتان برقوقي', en: 'Plum satin kaftan' },
    'Robe longue satin cacao': { ar: 'فستان طويل ساتان بني', en: 'Long cocoa satin dress' },
    'Blazer croisé boutons dorés': { ar: 'سترة مزدوجة بأزرار ذهبية', en: 'Double-breasted blazer, gold buttons' },
    'Blazer oversize chocolat': { ar: 'سترة واسعة بلون الشوكولاتة', en: 'Oversized chocolate blazer' },
    'Pull maille bordeaux': { ar: 'بلوزة صوف بوردو', en: 'Burgundy knit top' },
    'Blouse lavallière satin beige': { ar: 'بلوزة ساتان بيج بربطة عنق', en: 'Beige satin pussy-bow blouse' },
    'Blouse lavallière mousseline bordeaux': { ar: 'بلوزة شيفون بوردو بربطة عنق', en: 'Burgundy chiffon pussy-bow blouse' },
    'Cabas cuir marron et twilly': { ar: 'حقيبة كبيرة جلد بني مع وشاح', en: 'Brown leather tote with twilly' },
    'Cabas bordeaux fermoir doré': { ar: 'حقيبة كبيرة بوردو بإبزيم ذهبي', en: 'Burgundy tote, gold clasp' },
    'Sac à main cuir grainé chocolat': { ar: 'حقيبة يد جلد محبب بني', en: 'Chocolate grained leather handbag' },
    'Sac trapèze cuir camel': { ar: 'حقيبة يد جلد كاميل', en: 'Camel leather trapeze bag' },
    'Mini sac bordeaux': { ar: 'حقيبة صغيرة بوردو', en: 'Burgundy mini bag' },
    'Montre joaillière sertie': { ar: 'ساعة مجوهرات مرصعة', en: 'Jewelled pavé watch' },
    'Coffret montre bicolore et jonc': { ar: 'طقم ساعة ثنائية اللون مع إسورة', en: 'Two-tone watch and bangle set' },
    'Montre octogonale dorée': { ar: 'ساعة ذهبية مثمنة', en: 'Gold octagonal watch' },
    'Montre ovale dorée': { ar: 'ساعة ذهبية بيضاوية', en: 'Gold oval watch' },
  },
  description: {
    'Laine mélangée, col tailleur, coupe oversize': { ar: 'صوف مخلوط، ياقة كلاسيكية، قصة واسعة', en: 'Wool blend, tailored collar, oversized fit' },
    'Satin de soie, broderie sfifa ton sur ton': { ar: 'ساتان حريري، تطريز السفيفة بنفس اللون', en: 'Silk satin, tone-on-tone sfifa embroidery' },
    'Satin ivoire, broderie main et boutons akaad': { ar: 'ساتان عاجي، تطريز يدوي وأزرار العقاد', en: 'Ivory satin, hand embroidery and akaad buttons' },
    'Satin prune, plastron brodé et manches évasées': { ar: 'ساتان برقوقي، صدر مطرز وأكمام واسعة', en: 'Plum satin, embroidered panel, flared sleeves' },
    'Satin fluide, encolure bateau, manches évasées': { ar: 'ساتان انسيابي، ياقة قارب، أكمام واسعة', en: 'Fluid satin, boat neck, flared sleeves' },
    'Coupe croisée, boutons dorés, doublure satin': { ar: 'قصة مزدوجة، أزرار ذهبية، بطانة ساتان', en: 'Double-breasted cut, gold buttons, satin lining' },
    'Coupe oversize, revers crantés, un bouton': { ar: 'قصة واسعة، ياقة مشقوقة، زر واحد', en: 'Oversized fit, notch lapels, single button' },
    'Maille côtelée, manches amples, taille large': { ar: 'حياكة مضلعة، أكمام واسعة، خصر عريض', en: 'Ribbed knit, wide sleeves, broad waistband' },
    'Satin beige, col lavallière, manches ballon': { ar: 'ساتان بيج، ربطة عنق، أكمام منفوخة', en: 'Beige satin, pussy-bow collar, balloon sleeves' },
    'Mousseline plissée, col lavallière, poignets boutonnés': { ar: 'شيفون مجعد، ربطة عنق، أساور بأزرار', en: 'Crinkled chiffon, pussy-bow collar, buttoned cuffs' },
    'Cuir souple, twilly en soie, anses longues': { ar: 'جلد ناعم، وشاح حريري، مقابض طويلة', en: 'Soft leather, silk twilly, long handles' },
    'Grand format trapèze, fermoir tourniquet doré': { ar: 'حجم كبير، إبزيم دوار ذهبي', en: 'Large trapeze shape, gold turn-lock' },
    'Cuir grainé, cadenas et clochette dorés': { ar: 'جلد محبب، قفل وجرس ذهبيان', en: 'Grained leather, gold padlock and clochette' },
    'Cuir grainé camel, armature métal, fermoir clic': { ar: 'جلد محبب كاميل، إطار معدني، إغلاق ضغط', en: 'Camel grained leather, metal frame, clasp closure' },
    'Format mini, fermoir tournant doré, nœud en cuir': { ar: 'حجم صغير، إبزيم دوار ذهبي، عقدة جلدية', en: 'Mini size, gold turn-lock, leather knot' },
    'Boîtier et bracelet sertis, cadran pavé, index romains': { ar: 'علبة وسوار مرصعان، مينا مرصعة، أرقام رومانية', en: 'Set case and bracelet, pavé dial, Roman numerals' },
    'Montre ovale bicolore et bracelet jonc nœud, édition limitée': { ar: 'ساعة بيضاوية ثنائية اللون مع إسورة معقودة، إصدار محدود', en: 'Two-tone oval watch and knot bangle, limited edition' },
    'Boîtier octogonal doré, cadran chocolat, jonc assorti': { ar: 'علبة مثمنة ذهبية، مينا بنية، إسورة متناسقة', en: 'Gold octagonal case, chocolate dial, matching bangle' },
    'Boîtier ovale doré, cadran blanc, bracelet maille': { ar: 'علبة بيضاوية ذهبية، مينا بيضاء، سوار شبكي', en: 'Gold oval case, white dial, link bracelet' },
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
