import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { AnimatePresence, MotionConfig, motion, useMotionValueEvent, useScroll, useSpring } from 'framer-motion'
import '../../styles/app.css'
import '../../styles/enhancements.css'
import '../../styles/industrial.css'
import '../../styles/communications.css'
import '../../styles/storefront-motion.css'
import DatePicker from '../../components/ui/DatePicker'
import NotificationsBell from '../../components/ui/NotificationsBell'
import ReservationMessages from '../../components/ui/ReservationMessages'
import ReservationPaymentSummary from '../../components/ui/ReservationPaymentSummary'
import { useCartStore, type CartArticle } from '../cart/cartStore'
import { eventCollections, normalizeSearch, type EventId } from './eventCatalog'

type Category = { id: number; nom: string; slug: string }
type Article = CartArticle
type Availability = { articleId: number; quantiteDisponible: number }
type EventRow = { id: number; nom: string; slug: string; sousTitre: string | null; description: string | null; imageUrl: string | null; ordre: number; articles: Article[] }
type AuthMode = 'connexion' | 'inscription'

const money = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const toInputDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const today = () => toInputDate(new Date())
const tomorrow = () => { const date = new Date(); date.setDate(date.getDate() + 1); return toInputDate(date) }

const ease = [0.22, 1, 0.36, 1] as const
const navLinks = [
  { label: 'Nos événements', href: '#evenements', id: 'evenements' },
  { label: 'Le matériel', href: '#catalogue', id: 'catalogue' },
  { label: 'Comment ça marche', href: '#comment-ca-marche', id: 'comment-ca-marche' },
]
const sectionIds = ['accueil', 'evenements', 'catalogue', 'comment-ca-marche']
const marqueeFallback = ['Mariage', 'Séminaire', 'Gala', 'Fête privée', 'Festival', 'Concert']
const particles = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 41 + 6) % 96}%`,
  size: 4 + ((i * 5) % 9),
  duration: 10 + ((i * 3) % 9),
  delay: -((i * 1.9) % 11),
}))

function useActiveSection() {
  const [active, setActive] = useState('accueil')
  useEffect(() => {
    const elements = sectionIds.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el)
    if (!elements.length || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setActive(entry.target.id) })
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 })
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
  return active
}

function Storefront() {
  const [categories, setCategories] = useState<Category[]>([])
  const [events, setEvents] = useState(eventCollections)
  const [articles, setArticles] = useState<Article[]>([])
  const [availability, setAvailability] = useState<Record<number, number>>({})
  const cart = useCartStore((state) => state.cart)
  const addCartArticle = useCartStore((state) => state.add)
  const changeCartQuantity = useCartStore((state) => state.changeQuantity)
  const clearCart = useCartStore((state) => state.clear)
  const [category, setCategory] = useState<number | 'all'>('all')
  const [selectedEvent, setSelectedEvent] = useState<EventId | 'all'>(() => new URLSearchParams(window.location.search).get('evenement') ?? 'all')
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState(today())
  const [to, setTo] = useState(tomorrow())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [authMode, setAuthMode] = useState<AuthMode | null>(() => new URLSearchParams(window.location.search).get('compte') === '1' ? 'connexion' : null)
  const [showOrders, setShowOrders] = useState(false)
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('location-token') ?? '')
  const [busy, setBusy] = useState(false)
  const [showCart, setShowCart] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showTop, setShowTop] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const active = useActiveSection()

  const { scrollY, scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.4 })
  useMotionValueEvent(scrollY, 'change', (latest) => { setScrolled(latest > 24); setShowTop(latest > 700) })

  // Menu mobile : scroll verrouillé, Échap, fermeture au passage en desktop
  useEffect(() => {
    if (!mobileOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false) }
    const onResize = () => { if (window.innerWidth > 900) setMobileOpen(false) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [mobileOpen])

  useEffect(() => {
    Promise.all([fetch('/api/catalogue/categories').then(readJson<Category[]>), fetch('/api/articles').then(readJson<Article[]>)]).then(([cats, items]) => {
      setCategories(cats); setArticles(items)
    }).catch(() => setError('Le catalogue est momentanément indisponible. Vérifiez que le serveur est démarré, puis réessayez.'))
      .finally(() => setLoading(false))
    fetch('/api/evenements').then(readJson<EventRow[]>).then((rows) => {
      setEvents(rows.map((row) => {
        const defaults = eventCollections.find((event) => event.id === row.slug)
        return {
          ...defaults,
          id: row.slug,
          databaseId: row.id,
          number: String(row.ordre).padStart(2, '0'),
          name: row.nom,
          slug: row.slug,
          subtitle: row.sousTitre ?? defaults?.subtitle ?? '',
          description: row.description ?? defaults?.description ?? '',
          imageUrl: row.imageUrl,
          groups: defaults?.groups ?? [],
          keywords: defaults?.keywords ?? [],
          articles: row.articles ?? [],
        }
      }))
    }).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!from || !to || to < from) return
    fetch(`/api/disponibilite?debut=${from}&fin=${to}`).then(readJson<Availability[]>)
      .then((rows) => setAvailability(Object.fromEntries(rows.map((row) => [row.articleId, row.quantiteDisponible]))))
      .catch(() => setAvailability({}))
  }, [from, to])

  const visibleArticles = useMemo(() => articles.filter((article) => {
    const categoryName = categories.find((item) => item.id === article.categorieId)?.nom ?? article.categorie?.nom ?? ''
    const searchableArticle = normalizeSearch(`${article.nom} ${article.description ?? ''} ${categoryName}`)
    const eventCollection = events.find((item) => item.id === selectedEvent)
    const eventTerms = eventCollection ? [...(eventCollection.keywords ?? []), ...(eventCollection.groups ?? []).map((group) => group.name)] : []
    const eventMatches = selectedEvent === 'all' || (eventCollection?.articles?.length
      ? eventCollection.articles.some((item) => item.id === article.id)
      : eventTerms.some((term) => {
      const normalizedTerm = normalizeSearch(term)
      return normalizedTerm.length <= 3
        ? new RegExp(`(^|[^a-z0-9])${normalizedTerm}([^a-z0-9]|$)`).test(searchableArticle)
        : searchableArticle.includes(normalizedTerm)
      }))
    return eventMatches && (category === 'all' || article.categorieId === category)
      && searchableArticle.includes(normalizeSearch(query.trim()))
  }), [articles, categories, category, events, query, selectedEvent])
  const days = Math.max(1, Math.floor((Date.parse(`${to}T00:00:00`) - Date.parse(`${from}T00:00:00`)) / 86_400_000) + 1)
  const count = cart.reduce((sum, line) => sum + line.quantite, 0)
  const total = cart.reduce((sum, line) => sum + line.article.prixJour * days * line.quantite, 0)

  function add(article: Article) {
    const stock = availability[article.id] ?? article.quantiteTotale
    addCartArticle(article, stock)
    setNotice(`${article.nom} ajouté au panier`)
    window.setTimeout(() => setNotice(''), 2200)
  }

  function changeQuantity(id: number, amount: number) {
    changeCartQuantity(id, amount, availability[id] ?? cart.find((line) => line.article.id === id)?.article.quantiteTotale ?? 0)
  }

  function browseEvent(eventId: EventId) {
    setSelectedEvent(eventId)
    setCategory('all')
    document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth' })
  }

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!authMode) return
    setBusy(true); setError('')
    const data = new FormData(event.currentTarget)
    const body = authMode === 'inscription'
      ? { email: data.get('email'), motDePasse: data.get('password'), nom: data.get('nom'), prenom: data.get('prenom'), telephone: data.get('telephone') }
      : { email: data.get('email'), motDePasse: data.get('password') }
    try {
      const result = await readJson<{ accessToken: string }>(await fetch(`/api/auth/${authMode === 'inscription' ? 'inscription' : 'connexion'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      }))
      localStorage.setItem('location-token', result.accessToken); setAuthToken(result.accessToken); setAuthMode(null)
      setNotice('Connexion réussie. Votre demande peut être envoyée.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Connexion impossible') }
    finally { setBusy(false) }
  }

  async function sendReservation() {
    if (!cart.length) return
    if (!authToken) { setAuthMode('connexion'); return }
    setBusy(true); setError('')
    try {
      const reservation = await readJson<{ reference: string }>(await fetch('/api/reservations', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ dateDebut: from, dateFin: to, articles: cart.map(({ article, quantite }) => ({ articleId: article.id, quantite })) }),
      }))
      clearCart(); setShowCart(false); setNotice(`Demande ${reservation.reference} envoyée. Elle attend la confirmation du loueur.`)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Envoi impossible'
      if (/authentification|jeton/i.test(message)) { localStorage.removeItem('location-token'); setAuthToken(''); setAuthMode('connexion') }
      else setError(message)
    } finally { setBusy(false) }
  }

  const underlineTarget = hovered ?? navLinks.find((link) => link.id === active)?.id ?? null
  const marqueeItems = events.length ? events.map((item) => item.name) : marqueeFallback
  const marqueeLoop = [...marqueeItems, ...marqueeItems, ...marqueeItems, ...marqueeItems]

  return <MotionConfig reducedMotion="user"><div className="site-shell">
    <motion.div className="sf-progress" style={{ scaleX: progress }} aria-hidden="true" />
    <motion.header className={`topbar${scrolled ? ' is-scrolled' : ''}`} initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease }}>
      <a className="brand" href="/"><motion.span className="brand-mark" whileHover={{ rotate: -8, scale: 1.1 }} whileTap={{ scale: 0.92 }}>M</motion.span><span>matériel<span className="brand-dot">.</span></span></a>
      <nav className="main-nav" aria-label="Navigation principale" onMouseLeave={() => setHovered(null)}>
        {navLinks.map((link) => <a key={link.id} href={link.href} className={active === link.id ? 'is-active' : undefined} aria-current={active === link.id ? 'true' : undefined} onMouseEnter={() => setHovered(link.id)} onFocus={() => setHovered(link.id)}>
          {link.label}{underlineTarget === link.id && <motion.i className="sf-underline" layoutId="storefront-nav-underline" transition={{ type: 'spring', stiffness: 360, damping: 30 }} />}
        </a>)}
      </nav>
      <div className="top-actions">{authToken && <span className="sf-bell"><NotificationsBell token={authToken} /></span>}<button className="account-link" onClick={() => authToken ? setShowOrders(true) : setAuthMode('connexion')}>{authToken ? 'Mes réservations' : 'Mon compte'}</button>
        <motion.button className="cart-button" whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }} onClick={() => setShowCart(true)} aria-label={`Ouvrir le panier, ${count} article(s)`}><span className="bag-icon">▱</span><span className="cart-label">Mon panier</span><motion.span key={count} className="cart-count" initial={{ scale: 1.7 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 14 }}>{count}</motion.span></motion.button>
        <button className={`sf-burger${mobileOpen ? ' is-open' : ''}`} aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={mobileOpen} aria-controls="sf-mobile-panel" onClick={() => setMobileOpen((v) => !v)}><span /><span /><span /></button></div>
    </motion.header>
    <AnimatePresence>
      {mobileOpen && <motion.div id="sf-mobile-panel" className="sf-mobile-panel" initial={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }} animate={{ opacity: 1, clipPath: 'inset(0 0 0% 0)' }} exit={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }} transition={{ duration: 0.45, ease }}>
        <motion.ul initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } } }}>
          {[{ label: 'Accueil', href: '#accueil', id: 'accueil' }, ...navLinks].map((link) => <motion.li key={link.id} variants={{ hidden: { opacity: 0, x: -24 }, show: { opacity: 1, x: 0 } }} transition={{ duration: 0.4, ease }}>
            <a href={link.href} className={active === link.id ? 'is-active' : undefined} onClick={() => setMobileOpen(false)}>{link.label}<span>↗</span></a>
          </motion.li>)}
        </motion.ul>
        <div className="sf-mobile-actions">
          <button className="sf-mobile-account" onClick={() => { setMobileOpen(false); if (authToken) setShowOrders(true); else setAuthMode('connexion') }}>{authToken ? 'Mes réservations' : 'Mon compte'}</button>
          <button className="primary-button sf-mobile-cta" onClick={() => { setMobileOpen(false); setShowCart(true) }}>Voir mon panier ({count}) <span>↗</span></button>
        </div>
      </motion.div>}
    </AnimatePresence>

    <main>
      <motion.section className="hero-section" id="accueil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
        <div className="sf-particles" aria-hidden="true">{particles.map((p, i) => <span key={i} style={{ left: p.left, width: p.size, height: p.size, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }} />)}</div>
        <motion.div className="hero-copy" initial={{ opacity: 0, x: -32 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.15, ease }}><p className="eyebrow"><span className="eyebrow-line" /> LOCATION DE MATÉRIEL ÉVÉNEMENTIEL</p>
          <h1><span className="sf-line"><motion.span initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ duration: 0.8, delay: 0.3, ease }}>Vos événements.</motion.span></span><span className="sf-line"><motion.em initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ duration: 0.8, delay: 0.46, ease }}>Nos équipements.</motion.em></span></h1>
          <motion.p className="hero-description" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.7, ease }}>Mariage, séminaire, gala, fête privée ou festival : trouvez le matériel qui donne vie à votre événement.</motion.p>
          <motion.a className="primary-button hero-cta sf-shine" href="#evenements" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.85, ease }} whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>Choisir mon événement <span>↘</span></motion.a>
          <motion.div className="hero-proof" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1, ease }}><div className="proof-avatars"><i>♥</i><i>♫</i><i>✦</i></div><span><b>5 univers événementiels</b><br />à composer selon vos envies</span><span className="proof-star">✳</span></motion.div>
        </motion.div>
        <motion.div className="hero-art" aria-label="Matériel prêt à la location" initial={{ opacity: 0, scale: .94, x: 24 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ duration: .8, delay: .25, ease }}><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-sun" />
          <motion.div className="equipment-card event-hero-card" animate={{ y: [0, -9, 0], rotate: [1, 0, 1] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}><div className="equipment-top"><span className="equipment-label">À CÉLÉBRER</span><span className="equipment-number">01 / 05</span></div>
            <div className="event-hero-symbol" aria-hidden="true"><span>✦</span><i>♫</i><b>♥</b><small>✧</small></div>
            <div className="equipment-caption"><div><span>VOTRE MOMENT, VOTRE AMBIANCE</span><h3>Tout commence<br />par le bon décor.</h3></div><span className="caption-arrow">↗</span></div></motion.div>
          <motion.div className="floating-note" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }} transition={{ opacity: { delay: 1.1, duration: 0.5 }, scale: { type: 'spring', stiffness: 200, damping: 14, delay: 1.1 }, y: { duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1.6 } }}><span className="note-spark">✦</span><span>De la cérémonie<br /><b>au dernier morceau</b></span></motion.div><div className="hero-index">MARIAGE · GALA · FESTIVAL</div>
        </motion.div>
        <div className="hero-bottom"><span>01 — 03</span><div className="hero-progress"><i /></div><span>FAITES-LE AVEC LE BON OUTIL</span></div>
      </motion.section>

      <motion.section className="booking-bar" aria-label="Dates de location" initial={{ opacity: 0, y: 26, filter: 'blur(5px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, amount: 0.18 }} transition={{ duration: 0.6, ease }}><div className="booking-intro"><span className="booking-icon">⌑</span><div><b>La date de votre événement</b><small>Vérifiez le matériel disponible</small></div></div>
        <label className="date-field"><span>RETRAIT</span><DatePicker value={from} min={today()} label="Date de retrait" onChange={(value) => { setFrom(value); if (to < value) setTo(value) }} /></label><span className="date-divider">→</span>
        <label className="date-field"><span>RETOUR</span><DatePicker value={to} min={from} label="Date de retour" onChange={setTo} /></label>
        <div className="booking-duration"><span className="duration-dot" /><motion.b key={days} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3 }}>{days}</motion.b>&nbsp;jour{days > 1 ? 's' : ''}</div><a href="#catalogue" className="booking-submit sf-shine">Voir les disponibilités <span>↗</span></a>
      </motion.section>

      <div className="sf-marquee" aria-hidden="true"><div className="sf-marquee-track">{marqueeLoop.map((name, i) => <span key={`${name}-${i}`}>{name}<i>✦</i></span>)}</div></div>

      <motion.section className="events-section" id="evenements" initial="hidden" whileInView="visible" viewport={{ once: true, amount: .22 }} variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.09 } } }}>
        <div className="events-heading"><div><p className="eyebrow"><span className="eyebrow-line" /> À CHAQUE OCCASION SON UNIVERS</p><h2>Quel événement<br /><em>préparez-vous ?</em></h2></div><p>Des essentiels de réception aux équipements de scène : composez une ambiance qui vous ressemble.</p></div>
        <div className="event-grid">{events.map((event) => <motion.article className={`event-card event-${event.id}`} key={event.id} variants={{ hidden: { opacity: 0, y: 36, scale: 0.97 }, visible: { opacity: 1, y: 0, scale: 1 } }} transition={{ duration: .6, ease }} whileHover={{ y: -8 }}>
          <div className="event-cover" style={{ '--event-image': event.imageUrl ? `url("${event.imageUrl}")` : 'none' } as CSSProperties}><span className="event-number">{event.number} / {String(events.length).padStart(2, '0')}</span><span className="event-subtitle">{event.subtitle}</span><h3>{event.name}</h3></div>
          <div className="event-card-content"><p>{event.description}</p><ul>{event.groups?.length ? event.groups.map((group) => <li key={group.name}><b>{group.name}</b><span>{group.items}</span></li>) : <li><b>Matériel associé</b><span>{event.articles?.length ? event.articles.map((item) => item.nom).join(', ') : 'Aucun matériel associé pour le moment'}</span></li>}</ul><button type="button" onClick={() => browseEvent(event.id)}>Voir le matériel <span>↗</span></button></div>
        </motion.article>)}</div>
      </motion.section>

      <motion.section className="catalog-section" id="catalogue" initial={{ opacity: 0, y: 26, filter: 'blur(5px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.6, ease }}><div className="section-heading"><div><p className="eyebrow"><span className="eyebrow-line" /> À LOUER POUR VOTRE OCCASION</p><h2>{selectedEvent === 'all' ? <>Le matériel<br /><em>à votre mesure.</em></> : <>Pour votre<br /><em>{events.find((item) => item.id === selectedEvent)?.name}.</em></>}</h2></div><p className="section-note">Choisissez vos dates, vérifiez les disponibilités et composez votre sélection pour le jour J.</p></div>
        <AnimatePresence>{selectedEvent !== 'all' && <motion.div className="selected-event-filter" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><span>Univers : <b>{events.find((item) => item.id === selectedEvent)?.name}</b></span><button onClick={() => setSelectedEvent('all')}>Afficher tout le matériel <span>×</span></button></motion.div>}</AnimatePresence>
        <div className="catalog-tools"><div className="category-tabs"><motion.button whileTap={{ scale: 0.95 }} className={category === 'all' ? 'active' : ''} onClick={() => { setCategory('all'); setSelectedEvent('all') }}>Tout le matériel <span>{articles.length}</span></motion.button>{categories.map((item) => <motion.button whileTap={{ scale: 0.95 }} key={item.id} className={category === item.id ? 'active' : ''} onClick={() => { setCategory(item.id); setSelectedEvent('all') }}>{item.nom}</motion.button>)}</div>
          <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un outil..." /></label></div>
        {error && !authMode && <div className="inline-error" role="alert">{error}<button onClick={() => setError('')}>×</button></div>}
        {loading ? <div className="loading-state"><span className="loader" />Chargement du catalogue…</div> : visibleArticles.length === 0 ? <div className="empty-catalog"><span>✦</span><h3>{selectedEvent !== 'all' ? 'Les articles arrivent bientôt' : articles.length ? 'Aucun matériel trouvé' : 'Le catalogue prend forme'}</h3><p>{selectedEvent !== 'all' ? 'Ajoutez des articles à cet événement depuis l’espace admin.' : articles.length ? 'Essayez une autre recherche ou catégorie.' : 'Les articles apparaîtront ici dès que le loueur les aura ajoutés.'}</p></div> :
          <motion.div className="product-grid" layout>{visibleArticles.map((article, index) => {
            const stock = availability[article.id] ?? article.quantiteTotale
            const selected = cart.find((line) => line.article.id === article.id)?.quantite ?? 0
            return <motion.article className="product-card" key={article.id} layout initial={{ opacity: 0, y: 28, scale: 0.96 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, amount: .15 }} transition={{ duration: .5, delay: Math.min(index * .06, .3), ease }} whileHover={{ y: -7 }}><div className={`product-visual visual-${index % 4}`}>
              {article.imageUrl ? <img src={article.imageUrl} alt={article.nom} /> : <div className="tool-art" aria-hidden="true"><span className="tool-shape">{toolSymbol(article.categorie?.nom ?? '')}</span><span className="tool-shadow" /></div>}
              <span className="product-category">{article.categorie?.nom ?? 'Matériel'}</span><motion.button whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.12 }} className="quick-add" onClick={() => add(article)} disabled={stock < 1 || selected >= stock} aria-label={`Ajouter ${article.nom} au panier`}>{selected ? `+${selected}` : '+'}</motion.button></div>
              <div className="product-info"><div className="product-name-line"><h3>{article.nom}</h3><span className="stock-status"><i className={stock > 0 ? 'available' : ''} />{stock > 0 ? `${stock} disponible${stock > 1 ? 's' : ''}` : 'Indisponible'}</span></div>
                <p>{article.description || 'Un équipement fiable et vérifié, prêt à vous accompagner.'}</p><div className="product-footer"><div><strong>{money.format(article.prixJour)} <small>Ar</small></strong><span>/ jour · caution {money.format(article.caution)} Ar</span></div><motion.button whileTap={{ scale: 0.94 }} onClick={() => add(article)} disabled={stock < 1 || selected >= stock}>{stock < 1 ? 'Indisponible' : selected ? 'Ajouter encore' : 'Ajouter'} <span>↗</span></motion.button></div></div>
            </motion.article>
          })}</motion.div>}
        <div className="catalog-footer"><span>UNE QUESTION SUR UN ARTICLE ?</span><a href="mailto:contact@materiel.local">Parlons de votre projet <span>↗</span></a></div>
      </motion.section>

      <section className="promise-section" id="comment-ca-marche"><motion.div className="promise-head" initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .5 }}><p className="eyebrow"><span className="eyebrow-line" /> DE LA PRÉPARATION AU JOUR J</p><h2>Votre événement,<br /><em>en toute simplicité.</em></h2></motion.div><div className="promise-grid">
        {[
          { n: '01', icon: '✦', title: 'Choisissez votre univers', text: 'Mariage, conférence, gala, fête privée ou concert : trouvez les équipements adaptés.' },
          { n: '02', icon: '↗', title: 'Composez votre sélection', text: 'Vérifiez les dates, les quantités disponibles et le montant estimé de votre location.' },
          { n: '03', icon: '⌂', title: 'Profitez du jour J', text: 'Envoyez votre demande et suivez sa confirmation par l’équipe de location.' },
        ].map((item, index) => <motion.div className="promise-item" key={item.n} initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .55, delay: index * 0.12, ease }} whileHover={{ y: -8 }}><span className="promise-number">{item.n}</span><motion.div className="promise-icon" whileHover={{ rotate: 360, scale: 1.1 }} transition={{ duration: 0.6 }}>{item.icon}</motion.div><h3>{item.title}</h3><p>{item.text}</p></motion.div>)}
      </div></section>
      <motion.section className="closing-banner" initial={{ opacity: 0, y: 30, scale: 0.97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, amount: 0.18 }} transition={{ duration: 0.7, ease }}><div><p className="eyebrow"><span className="eyebrow-line" /> VOTRE PROCHAIN PROJET COMMENCE ICI</p><h2>Alors, on s’y met ?</h2></div><a href="#catalogue" className="primary-button sf-shine">Trouver mon matériel <span>↗</span></a><span className="banner-spark">✳</span></motion.section>
    </main>

    <motion.footer className="footer" initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.55 }}><a className="brand" href="/"><span className="brand-mark">M</span><span>matériel<span className="brand-dot">.</span></span></a><span>Le bon matériel, pour vos idées.</span><span>© 2026 · FAIT POUR FAIRE</span></motion.footer>

    <AnimatePresence>{notice && <motion.div key="toast" className="toast" role="status" initial={{ opacity: 0, filter: 'blur(6px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, filter: 'blur(6px)' }} transition={{ duration: 0.3 }}><span>✓</span>{notice}</motion.div>}</AnimatePresence>

    <AnimatePresence>{showTop && <motion.button key="top" className="sf-to-top" aria-label="Retour en haut" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} whileHover={{ y: -4 }} whileTap={{ scale: 0.9 }}>↑</motion.button>}</AnimatePresence>

    <AnimatePresence>{showCart && <motion.div key="cart" className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCart(false) }}><motion.aside className="cart-drawer" aria-label="Votre panier" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.4, ease }}>
      <div className="drawer-head"><div><p className="eyebrow">VOTRE SÉLECTION</p><h2>Le panier<span className="brand-dot">.</span></h2></div><button className="close-button" onClick={() => setShowCart(false)} aria-label="Fermer">×</button></div>
      <div className="drawer-dates"><span>⌑</span><div><b>{new Date(`${from}T12:00:00`).toLocaleDateString('fr-FR')} — {new Date(`${to}T12:00:00`).toLocaleDateString('fr-FR')}</b><small>{days} jour{days > 1 ? 's' : ''} de location</small></div></div>
      <div className="cart-lines"><AnimatePresence initial={false}>{cart.length ? cart.map(({ article, quantite }) => <motion.div className="cart-line" key={article.id} layout initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}><div className="cart-product-mark">{toolSymbol(article.categorie?.nom ?? '')}</div><div className="cart-line-name"><b>{article.nom}</b><small>{money.format(article.prixJour)} Ar / jour</small><div className="quantity-control"><button onClick={() => changeQuantity(article.id, -1)} aria-label="Retirer une unité">−</button><motion.span key={quantite} initial={{ scale: 1.4 }} animate={{ scale: 1 }}>{quantite}</motion.span><button onClick={() => changeQuantity(article.id, 1)} aria-label="Ajouter une unité">+</button></div></div><strong>{money.format(article.prixJour * days * quantite)} <small>Ar</small></strong></motion.div>) : <div className="cart-empty"><span>▱</span><b>Votre panier est vide</b><p>Choisissez du matériel pour votre projet.</p><button onClick={() => setShowCart(false)}>Voir le catalogue ↗</button></div>}</AnimatePresence></div>
      {cart.length > 0 && <div className="drawer-summary"><div className="summary-row"><span>Location · {days} jour{days > 1 ? 's' : ''}</span><b>{money.format(total)} Ar</b></div><div className="summary-row"><span>Caution (à prévoir)</span><b>{money.format(cart.reduce((sum, line) => sum + line.article.caution * line.quantite, 0))} Ar</b></div><p>Le montant final sera confirmé par le loueur.</p><button className="primary-button checkout-button sf-shine" onClick={sendReservation} disabled={busy}>{busy ? 'Envoi…' : 'Envoyer ma demande'} <span>↗</span></button><small>Votre demande reste provisoire jusqu’à confirmation.</small></div>}
    </motion.aside></motion.div>}</AnimatePresence>

    <AnimatePresence>{showOrders && <OrdersPanel key="orders" token={authToken} onClose={() => setShowOrders(false)} onLogout={() => { localStorage.removeItem('location-token'); setAuthToken(''); setShowOrders(false) }} />}</AnimatePresence>

    <AnimatePresence>{authMode && <motion.div key="auth" className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthMode(null) }}><motion.section className="auth-modal" initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.97 }} transition={{ duration: 0.4, ease }}>
      <button className="close-button auth-close" onClick={() => setAuthMode(null)} aria-label="Fermer">×</button><span className="brand-mark auth-mark">M</span><p className="eyebrow">VOTRE ESPACE CLIENT</p><h2>{authMode === 'connexion' ? 'Heureux de vous revoir.' : 'On fait connaissance ?'}</h2>
      <p className="auth-intro">{authMode === 'connexion' ? 'Connectez-vous pour envoyer votre demande de réservation.' : 'Créez votre compte pour envoyer et suivre vos demandes.'}</p>
      <form onSubmit={authenticate}>{authMode === 'inscription' && <div className="auth-name-fields"><label>Prénom<input name="prenom" autoComplete="given-name" required /></label><label>Nom<input name="nom" autoComplete="family-name" required /></label></div>}
        <label>Adresse e-mail<input type="email" name="email" autoComplete="email" required /></label><label>Mot de passe<input type="password" name="password" autoComplete={authMode === 'connexion' ? 'current-password' : 'new-password'} minLength={8} required /></label>
        {authMode === 'inscription' && <label>Téléphone<input name="telephone" type="tel" autoComplete="tel" required /></label>}{error && <p className="form-error">{error}</p>}
        <button className="primary-button auth-submit sf-shine" disabled={busy}>{busy ? 'Patientez…' : authMode === 'connexion' ? 'Me connecter' : 'Créer mon compte'} <span>↗</span></button></form>
      <p className="auth-switch">{authMode === 'connexion' ? 'Pas encore de compte ?' : 'Déjà inscrit ?'} <button onClick={() => { setError(''); setAuthMode(authMode === 'connexion' ? 'inscription' : 'connexion') }}>{authMode === 'connexion' ? 'Créer un compte' : 'Me connecter'}</button></p>
    </motion.section></motion.div>}</AnimatePresence>
  </div></MotionConfig>
}

function OrdersPanel({ token, onClose, onLogout }: { token: string; onClose: () => void; onLogout: () => void }) {
  const [orders, setOrders] = useState<Array<{ id: number; reference: string; statut: string; dateDebut: string; dateFin: string; total: number; expireLe: string | null; lignes: Array<{ quantite: number; article?: { nom: string } }> }>>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [openMessages, setOpenMessages] = useState<number | null>(null)
  useEffect(() => {
    fetch('/api/reservations/moi', { headers: { Authorization: `Bearer ${token}` } }).then(readJson<typeof orders>).then(setOrders)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Chargement impossible')).finally(() => setLoading(false))
  }, [token])
  async function cancel(order: (typeof orders)[number]) {
    try {
      await readJson(await fetch(`/api/reservations/${order.id}/annuler`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }))
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, statut: 'ANNULEE' } : item))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Annulation impossible') }
  }
  async function downloadInvoice(orderId: number) {
    try {
      const response = await fetch(`/api/reservations/${orderId}/facture`, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new Error('Facture indisponible pour cette réservation.')
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a'); link.href = url; link.download = `facture-reservation-${orderId}.pdf`; link.click(); URL.revokeObjectURL(url)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Téléchargement impossible') }
  }
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><motion.section className="orders-modal" aria-label="Mes réservations" initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.98 }} transition={{ duration: 0.4, ease }}>
    <div className="drawer-head"><div><p className="eyebrow">VOTRE ESPACE CLIENT</p><h2>Mes réservations<span className="brand-dot">.</span></h2></div><button className="close-button" onClick={onClose} aria-label="Fermer">×</button></div>
    {loading ? <div className="loading-state"><span className="loader" />Chargement…</div> : error ? <div className="inline-error">{error}<button onClick={onLogout}>Se reconnecter</button></div> : orders.length ? <div className="orders-list">{orders.map((order, index) => <motion.article className="order-card" key={order.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: Math.min(index * 0.07, 0.35), ease }}><div className="order-head"><b>{order.reference}</b><span className={`status-pill status-${order.statut.toLowerCase()}`}>{statusName(order.statut)}</span></div><p>{new Date(`${order.dateDebut}T12:00:00`).toLocaleDateString('fr-FR')} — {new Date(`${order.dateFin}T12:00:00`).toLocaleDateString('fr-FR')}</p><div className="order-items">{order.lignes.map((line, lineIndex) => <span key={lineIndex}>{line.quantite} × {line.article?.nom ?? 'Matériel'}</span>)}</div><div className="order-total"><span>Total de location</span><b>{money.format(order.total)} Ar</b></div>{order.expireLe && order.statut === 'PROVISOIRE' && <small className="expiry-note">En attente de confirmation du loueur</small>}<div className="order-tools"><button type="button" onClick={() => setOpenMessages((current) => current === order.id ? null : order.id)}>{openMessages === order.id ? 'Masquer les messages' : 'Écrire au loueur'} <span>↗</span></button>{['FERME', 'EN_COURS', 'TERMINEE'].includes(order.statut) && <button type="button" onClick={() => void downloadInvoice(order.id)}>Télécharger la facture PDF <span>↓</span></button>}{['PROVISOIRE', 'FERME'].includes(order.statut) && <button type="button" className="cancel-order" onClick={() => void cancel(order)}>Annuler la réservation</button>}</div>{openMessages === order.id && <ReservationMessages reservationId={order.id} token={token} />}</motion.article>)}</div> : <div className="cart-empty orders-empty"><span>▦</span><b>Pas encore de réservation</b><p>Vos demandes apparaîtront ici dès leur envoi.</p><button onClick={onClose}>Continuer le catalogue ↗</button></div>}
    {orders.length > 0 && <section className="client-payments-board"><div><p className="eyebrow">SUIVI DES RÈGLEMENTS</p><h3>Soldes et cautions</h3></div>{orders.map((order) => <article key={order.id}><b>{order.reference}</b><ReservationPaymentSummary reservationId={order.id} token={token} /></article>)}</section>}
    <button className="orders-logout" onClick={onLogout}>Se déconnecter</button>
  </motion.section></motion.div>
}

async function readJson<T>(response: Response): Promise<T> {
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'message' in body ? body.message : 'Une erreur est survenue'
    throw new Error(Array.isArray(message) ? message.join(', ') : String(message))
  }
  return body as T
}

function toolSymbol(category: string) {
  const name = normalizeSearch(category)
  if (name.includes('son') || name.includes('audio') || name.includes('micro')) return '♫'
  if (name.includes('eclair') || name.includes('lumiere') || name.includes('decor')) return '✦'
  if (name.includes('mobilier') || name.includes('chaise') || name.includes('table')) return '▤'
  if (name.includes('structure') || name.includes('tente') || name.includes('scene')) return '⌂'
  if (name.includes('vaisselle') || name.includes('cocktail') || name.includes('buffet')) return '◒'
  return '✧'
}

function statusName(status: string) {
  return ({ PROVISOIRE: 'En attente', FERME: 'Confirmée', EN_COURS: 'En cours', TERMINEE: 'Terminée', REFUSEE: 'Refusée', EXPIREE: 'Expirée', ANNULEE: 'Annulée' } as Record<string, string>)[status] ?? status
}

export default Storefront
