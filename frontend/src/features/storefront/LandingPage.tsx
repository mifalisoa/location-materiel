import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { AnimatePresence, MotionConfig, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { eventCollections, type EventCollection } from './eventCatalog'
import { AnimatedText, Counter, FadeIn, Magnetic, MotionCursor, ReadingProgress, ScrollParallax, StaggerContainer, StaggerItem, TiltCard } from './motion/MotionComponents'
import { smoothEase } from './motion/animations'
import '../../styles/landing.css'

type LandingEvent = EventCollection & { imageUrl?: string | null; articles?: Array<{ id: number; nom: string }> }
type ApiEvent = { id: number; nom: string; slug: string; sousTitre: string | null; description: string | null; imageUrl: string | null; ordre: number; articles: Array<{ id: number; nom: string }> }
type ApiArticle = { id: number; nom: string }

/* ⚠️ À remplacer par vos vraies coordonnées */
const CONTACT = { phone: '+261 00 00 000 00', email: 'contact@materiel.local', hours: 'Lun - Sam : 08h - 18h' }

const faqItems = [
  { question: 'Comment savoir si le matériel est disponible ?', answer: 'Choisissez vos dates dans le catalogue : les quantités disponibles sont recalculées pour la période sélectionnée.' },
  { question: 'Ma demande confirme-t-elle directement la réservation ?', answer: 'Votre demande bloque temporairement le stock. La réservation devient ferme après validation par le loueur.' },
  { question: 'Dois-je créer un compte pour envoyer une demande ?', answer: 'Oui. Vous pouvez parcourir le catalogue sans compte, puis vous connecter ou vous inscrire au moment d’envoyer votre panier.' },
  { question: 'Puis-je demander un événement ou du matériel spécifique ?', answer: 'Contactez le loueur depuis le catalogue. Il peut ajouter de nouveaux événements et équipements à la boutique.' },
]

const features = [
  { title: 'Disponibilités en direct', text: 'Les quantités sont recalculées selon vos dates, sans attente.', icon: 'calendar' },
  { title: 'Demande en ligne', text: 'Composez votre panier et envoyez-le en quelques clics.', icon: 'cart' },
  { title: 'Validation par le loueur', text: 'Votre stock est bloqué le temps de la confirmation.', icon: 'shield' },
]

const steps = [
  { n: '01', title: 'Choisissez la date', text: 'Consultez le calendrier et vérifiez les disponibilités.' },
  { n: '02', title: 'Composez votre matériel', text: 'Ajoutez les articles et les quantités dont vous avez besoin.' },
  { n: '03', title: 'Envoyez votre demande', text: 'Le loueur confirme la disponibilité de votre sélection.' },
]

const navLinks = [
  { label: 'Accueil', href: '#accueil' },
  { label: 'À propos', href: '#a-propos' },
  { label: 'Événements', href: '#univers' },
  { label: 'Le matériel', href: '/catalogue' },
  { label: 'Comment ça marche', href: '#comment-ca-marche' },
  { label: 'Questions', href: '#questions' },
]

const sectionIds = ['accueil', 'a-propos', 'univers', 'comment-ca-marche', 'questions']
const marqueeFallback = ['Mariage', 'Séminaire', 'Gala', 'Anniversaire', 'Fête en plein air', 'Cocktail', 'Conférence']

function Icon({ name }: { name: string }) {
  const p = { width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (name === 'calendar') return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>
  if (name === 'cart') return <svg {...p}><path d="M3 4h2l2.4 11h10.2L20 8H6" /><circle cx="9" cy="19.5" r="1.4" /><circle cx="17" cy="19.5" r="1.4" /></svg>
  if (name === 'shield') return <svg {...p}><path d="M12 3 4 6v6c0 4.5 3.2 8 8 9 4.8-1 8-4.5 8-9V6l-8-3Z" /><path d="m9 12 2.2 2.2L15.5 10" /></svg>
  if (name === 'phone') return <svg {...p} width={16} height={16}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></svg>
  if (name === 'mail') return <svg {...p} width={16} height={16}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m3 8 9 6 9-6" /></svg>
  if (name === 'clock') return <svg {...p} width={16} height={16}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  if (name === 'up') return <svg {...p} width={20} height={20}><path d="M12 19V5M6 11l6-6 6 6" /></svg>
  return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
}

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

function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const reduced = useReducedMotion()
  const active = useActiveSection()
  const { scrollY } = useScroll()
  useMotionValueEvent(scrollY, 'change', (latest) => setScrolled(latest > 24))

  // Verrouille le scroll + Échap + fermeture si on repasse en desktop
  useEffect(() => {
    if (!mobileOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false) }
    const onResize = () => { if (window.innerWidth > 1100) setMobileOpen(false) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [mobileOpen])

  const underlineTarget = hovered ?? navLinks.find((l) => l.href === `#${active}`)?.label ?? null

  return <>
    <div className="landing-topbar">
      <div><span><Icon name="phone" /> {CONTACT.phone}</span><span><Icon name="mail" /> {CONTACT.email}</span></div>
      <span><Icon name="clock" /> {CONTACT.hours}</span>
    </div>
    <motion.header className={`landing-header${scrolled ? ' is-scrolled' : ''}`} initial={reduced ? false : { y: -28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: reduced ? 0 : 0.65, ease: smoothEase }}>
      <a className="landing-brand" href="/" aria-label="Accueil"><motion.span className="landing-mark" whileHover={reduced ? undefined : { rotate: -8, scale: 1.1 }} whileTap={{ scale: 0.92 }}>M</motion.span><span>matériel<span className="landing-dot">.</span></span></a>
      <nav aria-label="Navigation principale" onMouseLeave={() => setHovered(null)}>
        {navLinks.map((link) => {
          const isActive = link.href === `#${active}`
          return <a key={link.label} href={link.href} className={isActive ? 'is-active' : undefined} aria-current={isActive ? 'true' : undefined} onMouseEnter={() => setHovered(link.label)} onFocus={() => setHovered(link.label)}>
            {link.label}
            {underlineTarget === link.label && !reduced && <motion.i className="nav-underline" layoutId="landing-nav-underline" transition={{ type: 'spring', stiffness: 360, damping: 30 }} />}
            {underlineTarget === link.label && reduced && <i className="nav-underline" />}
          </a>
        })}
      </nav>
      <div className="landing-header-actions"><a className="landing-account" href="/catalogue?compte=1">Mon compte</a><Magnetic className="landing-nav-magnetic"><a className="landing-header-cta" href="/catalogue">Réserver</a></Magnetic></div>
      <button className={`landing-menu-toggle${mobileOpen ? ' is-open' : ''}`} aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={mobileOpen} aria-controls="landing-mobile-panel" onClick={() => setMobileOpen((v) => !v)}><span /><span /><span /></button>
    </motion.header>
    <AnimatePresence>
      {mobileOpen && <motion.div id="landing-mobile-panel" className="landing-mobile-panel" initial={reduced ? false : { opacity: 0, clipPath: 'inset(0 0 100% 0)' }} animate={{ opacity: 1, clipPath: 'inset(0 0 0% 0)' }} exit={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }} transition={{ duration: reduced ? 0 : 0.45, ease: smoothEase }}>
        <motion.ul initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: reduced ? 0 : 0.06, delayChildren: 0.15 } } }}>
          {[...navLinks, { label: 'Mon compte', href: '/catalogue?compte=1' }].map((link) => (
            <motion.li key={link.label} variants={{ hidden: { opacity: 0, x: -24 }, show: { opacity: 1, x: 0 } }} transition={{ duration: 0.4, ease: smoothEase }}>
              <a href={link.href} className={link.href === `#${active}` ? 'is-active' : undefined} onClick={() => setMobileOpen(false)}>{link.label}<span>↗</span></a>
            </motion.li>
          ))}
        </motion.ul>
        <a className="landing-btn landing-btn-teal landing-mobile-cta" href="/catalogue" onClick={() => setMobileOpen(false)}>Réserver du matériel</a>
      </motion.div>}
    </AnimatePresence>
  </>
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(0)
  const reduced = useReducedMotion()
  return <section className="landing-faq" id="questions">
    <FadeIn className="landing-faq-heading" direction="left"><p className="landing-tag">Questions fréquentes</p><h2>Les réponses avant le <span className="accent">jour J</span></h2><p>Une question particulière ? Notre équipe vous accompagne.</p><a className="landing-btn landing-btn-outline" href={`mailto:${CONTACT.email}`}>Écrire au loueur</a></FadeIn>
    <div className="landing-faq-list">{faqItems.map((item, index) => <motion.article className={`landing-faq-item${open === index ? ' is-open' : ''}`} key={item.question} initial={reduced ? false : { opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} whileHover={reduced ? undefined : { x: 6 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5, delay: index * 0.09, ease: smoothEase }}>
      <button aria-expanded={open === index} onClick={() => setOpen(open === index ? null : index)}><span>{item.question}</span><motion.i animate={{ rotate: open === index ? 135 : 0, scale: open === index ? 1.1 : 1 }} transition={{ duration: reduced ? 0 : 0.3, ease: smoothEase }}>+</motion.i></button>
      <AnimatePresence initial={false}>{open === index && <motion.div className="landing-faq-answer" initial={reduced ? false : { height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduced ? 0 : 0.35, ease: smoothEase }}><motion.p initial={reduced ? false : { y: -8 }} animate={{ y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>{item.answer}</motion.p></motion.div>}</AnimatePresence>
    </motion.article>)}</div>
  </section>
}

const particles = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 37 + 8) % 96}%`,
  size: 4 + ((i * 5) % 9),
  duration: 9 + ((i * 3) % 9),
  delay: -((i * 1.7) % 10),
}))

export default function LandingPage() {
  const [events, setEvents] = useState<LandingEvent[]>(eventCollections)
  const [materialCount, setMaterialCount] = useState<number | null>(null)
  const [selectedEvent, setSelectedEvent] = useState('')
  const [showTop, setShowTop] = useState(false)
  const reduceMotion = useReducedMotion()
  const heroRef = useRef<HTMLElement>(null)
  const stepsRef = useRef<HTMLDivElement>(null)

  const { scrollY } = useScroll()
  useMotionValueEvent(scrollY, 'change', (latest) => setShowTop(latest > 700))

  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const bgY = useTransform(heroProgress, [0, 1], ['0%', '22%'])
  const copyY = useTransform(heroProgress, [0, 1], [0, -70])
  const copyOpacity = useTransform(heroProgress, [0, 0.75], [1, 0])
  const cardY = useTransform(heroProgress, [0, 1], [0, 90])

  const { scrollYProgress: stepsProgress } = useScroll({ target: stepsRef, offset: ['start 85%', 'end 60%'] })
  const lineScale = useTransform(stepsProgress, [0, 1], [0, 1])

  useEffect(() => {
    let active = true
    fetch('/api/evenements').then((response) => response.ok ? response.json() as Promise<ApiEvent[]> : Promise.reject())
      .then((rows) => {
        if (!active) return
        setEvents(rows.map((row) => {
          const defaults = eventCollections.find((item) => item.id === row.slug)
          return { ...defaults, id: row.slug, databaseId: row.id, number: String(row.ordre).padStart(2, '0'), name: row.nom, slug: row.slug,
            subtitle: row.sousTitre ?? defaults?.subtitle ?? '', description: row.description ?? defaults?.description ?? '', imageUrl: row.imageUrl,
            groups: defaults?.groups ?? [], keywords: defaults?.keywords ?? [], articles: row.articles ?? [] }
        }))
      }).catch(() => undefined)
    fetch('/api/articles').then((response) => response.ok ? response.json() as Promise<ApiArticle[]> : Promise.reject())
      .then((articles) => { if (active) setMaterialCount(articles.length) }).catch(() => undefined)
    return () => { active = false }
  }, [])

  function quickSearch(event: FormEvent) {
    event.preventDefault()
    window.location.href = selectedEvent ? `/catalogue?evenement=${encodeURIComponent(selectedEvent)}` : '/catalogue'
  }

  const ease = smoothEase
  const marqueeItems = events.length ? events.map((e) => e.name) : marqueeFallback
  const marqueeLoop = [...marqueeItems, ...marqueeItems, ...marqueeItems, ...marqueeItems]

  return <MotionConfig reducedMotion="user">
    <motion.div className="landing-page" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.45 }}>
      <ReadingProgress />
      <LandingNav />
      <main id="accueil">
        {/* ============ HERO ============ */}
        <section className="landing-hero" ref={heroRef}>
          <div className="landing-hero-media" aria-hidden="true">
            <motion.div className="landing-hero-bg" style={reduceMotion ? undefined : { y: bgY }} />
            <span className="landing-blob landing-blob-a" />
            <span className="landing-blob landing-blob-b" />
            <div className="landing-particles">{particles.map((p, i) => <span key={i} style={{ left: p.left, width: p.size, height: p.size, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }} />)}</div>
          </div>
          <motion.div className="landing-hero-copy" style={reduceMotion ? undefined : { y: copyY, opacity: copyOpacity }}>
            <motion.p className="landing-tag landing-tag-light landing-tag-pulse" initial={reduceMotion ? false : { opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55, delay: 0.1, ease }}>Votre partenaire de confiance</motion.p>
            <h1><AnimatedText text="Location de matériel" /><br /><span className="accent"><AnimatedText text="événementiel" /></span></h1>
            <motion.p className="landing-hero-description" initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5, ease }}>Mariage, séminaire, gala ou fête en plein air : réservez en ligne le matériel qui donne forme à vos moments.</motion.p>
            <motion.div className="landing-hero-actions" initial={reduceMotion ? false : { opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.63, ease }}>
              <Magnetic><a className="landing-btn landing-btn-light landing-btn-shine" href="#univers">Choisir mon événement</a></Magnetic>
              <a className="landing-btn landing-btn-ghost" href="/catalogue">Voir le catalogue</a>
            </motion.div>
          </motion.div>

          <motion.div className="landing-floating-wrap" style={reduceMotion ? undefined : { y: cardY }}>
            <motion.div className="landing-floating-card" initial={reduceMotion ? false : { opacity: 0, scale: 0.7, rotate: -6 }} animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: 0, y: [0, -12, 0] }} transition={{ opacity: { duration: 0.6, delay: 1 }, scale: { type: 'spring', stiffness: 160, damping: 14, delay: 1 }, rotate: { duration: 0.7, delay: 1 }, y: { duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.6 } }}>
              <b><Counter value={materialCount ?? 0} />+</b><span>articles disponibles<br />à la location</span>
            </motion.div>
          </motion.div>

          <motion.a className="landing-scroll-hint" href="#a-propos" aria-label="Défiler vers le bas" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6, duration: 0.6 }}><i /></motion.a>

          <motion.form className="landing-quick" onSubmit={quickSearch} initial={reduceMotion ? false : { opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.8, ease }}>
            <label>Quel est votre événement ?
              <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}>
                <option value="">Tous les événements</option>
                {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
            </label>
            <button className="landing-btn landing-btn-dark landing-btn-shine" type="submit">Voir le matériel</button>
          </motion.form>
        </section>

        {/* ============ MARQUEE ============ */}
        <div className="landing-marquee" aria-hidden="true">
          <div className="landing-marquee-track">{marqueeLoop.map((name, i) => <span key={`${name}-${i}`}>{name}<i>✦</i></span>)}</div>
        </div>

        {/* ============ AVANTAGES ============ */}
        <StaggerContainer className="landing-features">
          {features.map((f) => <StaggerItem key={f.title}><motion.article whileHover={reduceMotion ? undefined : { y: -8, scale: 1.02 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}><span className="landing-feature-icon"><Icon name={f.icon} /></span><div><h3>{f.title}</h3><p>{f.text}</p></div></motion.article></StaggerItem>)}
        </StaggerContainer>

        {/* ============ À PROPOS ============ */}
        <section className="landing-about" id="a-propos">
          <ScrollParallax className="landing-about-media" distance={reduceMotion ? 0 : 30}>
            <motion.div className="landing-about-photo" initial={reduceMotion ? false : { clipPath: 'inset(0 100% 0 0 round 28px)' }} whileInView={{ clipPath: 'inset(0 0% 0 0 round 28px 28px 120px 28px)' }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 1.1, ease }}>
              <motion.img src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=85" alt="Table dressée pour une réception" loading="lazy" initial={reduceMotion ? false : { scale: 1.25 }} whileInView={{ scale: 1 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 1.6, ease }} />
            </motion.div>
            <motion.div className="landing-about-badge" initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.5 }}>
              <b><Counter value={events.length} /></b><span>univers<br />événementiels</span>
            </motion.div>
          </ScrollParallax>
          <FadeIn className="landing-about-copy" direction="right">
            <p className="landing-tag">À propos</p>
            <h2>Un matériel de qualité pour <span className="accent">chaque occasion</span></h2>
            <p>Du premier choix au jour J, préparez votre événement au même endroit : catalogue, disponibilités et demande de réservation.</p>
            <div className="landing-about-points">
              <motion.div whileHover={reduceMotion ? undefined : { x: 8 }}><span><Icon name="calendar" /></span><div><h3>Dates maîtrisées</h3><p>Les stocks sont calculés pour la période que vous choisissez.</p></div></motion.div>
              <motion.div whileHover={reduceMotion ? undefined : { x: 8 }}><span><Icon name="shield" /></span><div><h3>Réservation fiable</h3><p>Votre demande est validée par le loueur avant confirmation.</p></div></motion.div>
            </div>
            <Magnetic><a className="landing-btn landing-btn-teal landing-btn-shine" href="/catalogue">Découvrir le catalogue</a></Magnetic>
          </FadeIn>
        </section>

        {/* ============ UNIVERS ============ */}
        <section className="landing-univers" id="univers">
          <span className="landing-blob landing-blob-c" aria-hidden="true" />
          <FadeIn className="landing-section-heading"><div><p className="landing-tag landing-tag-light">Nos univers</p><h2>Le bon équipement pour <span className="accent">chaque moment</span></h2></div><p>Choisissez votre occasion, découvrez les essentiels et composez votre sélection.</p></FadeIn>
          <StaggerContainer className="landing-event-grid">
            {events.map((event) => <StaggerItem key={event.id}><TiltCard className="landing-event-tilt"><motion.a className="landing-event-card" href={`/catalogue?evenement=${encodeURIComponent(event.id)}`} whileHover={reduceMotion ? undefined : { y: -6 }} whileTap={{ scale: 0.98 }}>
              <div className="landing-event-image" style={{ '--landing-event-image': event.imageUrl ? `url("${event.imageUrl}")` : 'none' } as CSSProperties}><span className="landing-event-kicker">{event.subtitle}</span></div>
              <div className="landing-event-info">
                <h3>{event.name}</h3>
                <p>{event.description}</p>
                <span className="landing-event-more">{event.articles?.length ? `${event.articles.length} matériel(s) associé(s)` : 'Voir les équipements'}<i><Icon name="arrow" /></i></span>
              </div>
            </motion.a></TiltCard></StaggerItem>)}
          </StaggerContainer>
        </section>

        {/* ============ CHIFFRES ============ */}
        <motion.section className="landing-count-strip" initial={reduceMotion ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 0.65, ease }}>
          <div><b><Counter value={events.length} /></b><span>univers événementiels</span></div>
          <div><b><Counter value={materialCount ?? 0} /></b><span>articles au catalogue</span></div>
          <div><b><Counter value={3} /></b><span>étapes pour votre demande</span></div>
          <a className="landing-btn landing-btn-light landing-btn-shine" href="/catalogue">Composer mon panier</a>
        </motion.section>

        {/* ============ ÉTAPES ============ */}
        <section className="landing-how" id="comment-ca-marche">
          <FadeIn className="landing-how-heading"><p className="landing-tag">Simple à préparer</p><h2>Du projet à <span className="accent">la fête</span></h2></FadeIn>
          <div className="landing-steps-wrap" ref={stepsRef}>
            <div className="landing-steps-line" aria-hidden="true"><motion.span style={reduceMotion ? { transform: 'scaleX(1)' } : { scaleX: lineScale }} /></div>
            <StaggerContainer className="landing-steps">{steps.map((step) => <StaggerItem key={step.n}><motion.article whileHover={reduceMotion ? undefined : { y: -10, rotate: -0.6 }} transition={{ type: 'spring', stiffness: 280, damping: 16 }}><motion.span className="landing-step-n" whileHover={reduceMotion ? undefined : { rotate: 360, scale: 1.1 }} transition={{ duration: 0.6 }}>{step.n}</motion.span><h3>{step.title}</h3><p>{step.text}</p></motion.article></StaggerItem>)}</StaggerContainer>
          </div>
        </section>

        <FAQ />

        {/* ============ CTA FINAL ============ */}
        <motion.section className="landing-final-cta" initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 30 }} whileInView={{ opacity: 1, scale: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 0.75, ease }}>
          <div><p className="landing-tag landing-tag-light">Prêt à célébrer ?</p><h2>Commençons par <span className="accent">votre événement</span></h2></div>
          <Magnetic><motion.a className="landing-btn landing-btn-light landing-pulse landing-btn-shine" href="/catalogue" whileTap={reduceMotion ? undefined : { scale: 0.95 }}>Explorer le matériel</motion.a></Magnetic>
        </motion.section>
      </main>

      <footer className="landing-footer">
        <a className="landing-brand" href="/"><span className="landing-mark">M</span><span>matériel<span className="landing-dot">.</span></span></a>
        <span>Le matériel qui accompagne vos grands moments.</span>
        <a href="/catalogue">Entrer dans la boutique</a>
        <small>© 2026 · Location événementielle</small>
      </footer>

      <AnimatePresence>
        {showTop && <motion.button className="landing-to-top" aria-label="Retour en haut" onClick={() => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })} initial={{ opacity: 0, scale: 0.5, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.5, y: 20 }} whileHover={reduceMotion ? undefined : { y: -4 }} whileTap={{ scale: 0.9 }}><Icon name="up" /></motion.button>}
      </AnimatePresence>
      <MotionCursor />
    </motion.div>
  </MotionConfig>
}