import { useCallback, useEffect, useState, type FormEvent } from 'react'
import BrandLogo from '../../components/BrandLogo'
import { MotionConfig, motion } from 'framer-motion'
import CustomSelect from '../../components/ui/CustomSelect'
import DatePicker from '../../components/ui/DatePicker'
import LoginPage from '../auth/LoginPage'
import '../../styles/communications.css'
import NotificationsBell from '../../components/ui/NotificationsBell'
import ReservationMessages from '../../components/ui/ReservationMessages'
import ReservationOperations from '../../components/ui/ReservationOperations'

type Category = { id: number; nom: string; slug: string; ordre: number }
type Article = { id: number; categorieId: number; nom: string; prixJour: number; caution: number; quantiteTotale: number; actif: boolean }
type Client = { id: number; nom: string; prenom: string; telephone: string; email: string | null; societe: string | null; notesAdmin: string | null }
type ReservationLine = { id: number; articleId: number; quantite: number; article?: { nom: string } }
type Reservation = { id: number; reference: string; clientId: number; statut: string; source: string; dateDebut: string; dateFin: string; expireLe: string | null; total: number; cautionTotale: number; motifRefus: string | null; lignes: ReservationLine[] }
type Unavailability = { id: number; articleId: number; quantite: number; dateDebut: string; dateFin: string | null; motif: string }
type EventItem = { id: number; nom: string; slug: string; sousTitre: string | null; description: string | null; imageUrl: string | null; ordre: number; actif: boolean; articles: Article[] }
type EventForm = { id: number | null; nom: string; sousTitre: string; description: string; imageUrl: string; articleIds: number[] }
type Tab = 'reservations' | 'catalogue' | 'clients'
type ManualLine = { articleId: string; quantite: number }
const cash = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const read = async <T,>(response: Response): Promise<T> => {
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(Array.isArray(body?.message) ? body.message.join(', ') : body?.message ?? 'Une erreur est survenue')
  return body as T
}
const slug = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const date = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
const emptyEventForm = (): EventForm => ({ id: null, nom: '', sousTitre: '', description: '', imageUrl: '', articleIds: [] })

export default function AdminApp() {
  // CHANGÉ : lit le token dans localStorage (rester connecté) ou sessionStorage (session seulement)
  const [token, setToken] = useState(() => localStorage.getItem('location-token') ?? sessionStorage.getItem('location-token') ?? '')
  const [tab, setTab] = useState<Tab>('reservations')
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [eventForm, setEventForm] = useState<EventForm>(emptyEventForm)
  const [clients, setClients] = useState<Client[]>([])
  const [clientNotes, setClientNotes] = useState<Record<number, string>>({})
  const [unavailabilities, setUnavailabilities] = useState<Unavailability[]>([])
  const [stock, setStock] = useState<Record<number, number>>({})
  const [prices, setPrices] = useState<Record<number, number>>({})
  const [cautions, setCautions] = useState<Record<number, number>>({})
  const [manualLines, setManualLines] = useState<ManualLine[]>([{ articleId: '', quantite: 1 }])
  const [manualDateStart, setManualDateStart] = useState('')
  const [manualDateEnd, setManualDateEnd] = useState('')
  const [unavailableDateStart, setUnavailableDateStart] = useState('')
  const [unavailableDateEnd, setUnavailableDateEnd] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(0)
  const [openConversation, setOpenConversation] = useState<number | null>(null)
  const [openOperations, setOpenOperations] = useState<number | null>(null)
  const isAdmin = (() => { try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'ADMIN' } catch { return false } })()

  const api = useCallback(async <T,>(path: string, init: RequestInit = {}) => {
    const legacyStatus = path.match(/^\/reservations\/(\d+)\/status$/)
    if (legacyStatus && init.method === 'PATCH') { setOpenOperations(Number(legacyStatus[1])); return undefined as T }
    return read<T>(await fetch(`/api${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } }))
  }, [token])
  const refresh = useCallback(async () => {
    if (!isAdmin) return
    try {
      const [r, a, c, u, cat, e] = await Promise.all([
        api<Reservation[]>('/reservations'), api<Article[]>('/admin/catalogue/articles'), api<Client[]>('/admin/clients'), api<Unavailability[]>('/admin/indisponibilites'),
        fetch('/api/catalogue/categories').then(read<Category[]>), api<EventItem[]>('/admin/evenements'),
      ])
      setReservations(r); setArticles(a); setClients(c); setUnavailabilities(u); setCategories(cat); setEvents(e)
      setClientNotes(Object.fromEntries(c.map((client) => [client.id, client.notesAdmin ?? ''])))
      setStock(Object.fromEntries(a.map((item) => [item.id, item.quantiteTotale])))
      setPrices(Object.fromEntries(a.map((item) => [item.id, item.prixJour])))
      setCautions(Object.fromEntries(a.map((item) => [item.id, item.caution])))
      setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Chargement impossible') }
  }, [api, isAdmin])
  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh() }, 0)
    const interval = window.setInterval(() => { void refresh() }, 60_000)
    return () => { window.clearTimeout(timer); window.clearInterval(interval) }
  }, [refresh])
  useEffect(() => {
    const timer = window.setTimeout(() => setNow(Date.now()), 0)
    const interval = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => { window.clearTimeout(timer); window.clearInterval(interval) }
  }, [])

  async function run(work: () => Promise<unknown>, message: string) {
    setBusy(true); setError('')
    if (message === 'Location démarrée' || message === 'Retour enregistré') {
      try { await work() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Action impossible') }
      finally { setBusy(false) }
      return
    }
    try { await work(); await refresh(); setNotice(message); window.setTimeout(() => setNotice(''), 2800) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Action impossible') }
    finally { setBusy(false) }
  }

  async function downloadInvoice(reservationId: number) {
    try {
      const response = await fetch(`/api/reservations/${reservationId}/facture`, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new Error('Facture indisponible pour cette réservation.')
      const objectUrl = URL.createObjectURL(await response.blob())
      const link = document.createElement('a'); link.href = objectUrl; link.download = `facture-reservation-${reservationId}.pdf`; link.click(); URL.revokeObjectURL(objectUrl)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Téléchargement impossible') }
  }

  // CHANGÉ : login prend maintenant (email, mot de passe, rester connecté) et lance une Error en cas d'échec.
  // LoginPage gère lui-même le chargement et l'affichage de l'erreur.
  async function login(email: string, password: string, remember: boolean) {
    const result = await read<{ accessToken: string }>(await fetch('/api/auth/connexion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, motDePasse: password }),
    }))
    const role = JSON.parse(atob(result.accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role
    if (role !== 'ADMIN') throw new Error('Ce compte ne possède pas le rôle administrateur.')
    localStorage.removeItem('location-token')
    sessionStorage.removeItem('location-token')
    ;(remember ? localStorage : sessionStorage).setItem('location-token', result.accessToken)
    setToken(result.accessToken)
  }

  async function submit(event: FormEvent<HTMLFormElement>, path: string, method: string, convert: (form: FormData) => object, message: string) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const node = event.currentTarget
    if (path === '/admin/catalogue/articles' && !form.get('categorieId')) { setError('Créez ou choisissez une catégorie avant d’ajouter un article.'); return }
    await run(async () => {
      await api(path, { method, body: JSON.stringify(convert(form)) }); node.reset()
      if (path === '/admin/indisponibilites') { setUnavailableDateStart(''); setUnavailableDateEnd('') }
    }, message)
  }
  function postForm(path: string, convert: (form: FormData) => object, message: string) {
    return (event: FormEvent<HTMLFormElement>) => {
      if (path === '/admin/indisponibilites') {
        event.preventDefault()
        if (!unavailableDateStart) { setError('Choisissez la date de début de l’indisponibilité.'); return }
        if (unavailableDateEnd && unavailableDateEnd < unavailableDateStart) { setError('La date de fin doit être après la date de début.'); return }
      }
      void submit(event, path, 'POST', convert, message)
    }
  }
  async function createManualReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const node = event.currentTarget
    const form = new FormData(node)
    if (!manualDateStart || !manualDateEnd) { setError('Choisissez les dates de début et de retour.'); return }
    if (manualDateEnd < manualDateStart) { setError('La date de retour doit être après la date de début.'); return }
    const defaultArticleId = String(articles[0]?.id ?? '')
    const lines = manualLines.map((line) => ({ articleId: Number(line.articleId || defaultArticleId), quantite: line.quantite })).filter((line) => line.articleId > 0 && line.quantite > 0)
    if (!lines.length) { setError('Ajoutez au moins un article au devis.'); return }
    if (new Set(lines.map((line) => line.articleId)).size !== lines.length) { setError('Un article ne peut apparaître qu’une fois. Modifiez sa quantité sur sa ligne.'); return }
    await run(async () => {
      await api('/reservations/manuelles', { method: 'POST', body: JSON.stringify({
        clientId: Number(form.get('clientId')), dateDebut: manualDateStart, dateFin: manualDateEnd,
        statutInitial: form.get('statutInitial'), stockForce: form.get('stockForce') === 'on', articles: lines,
      }) })
      node.reset()
      setManualLines([{ articleId: '', quantite: 1 }])
      setManualDateStart(''); setManualDateEnd('')
    }, 'Réservation manuelle créée')
  }

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const isEditing = eventForm.id !== null
    const payload = {
      nom: eventForm.nom.trim(), slug: slug(eventForm.nom), sousTitre: eventForm.sousTitre.trim() || undefined,
      description: eventForm.description.trim() || undefined, imageUrl: eventForm.imageUrl.trim() || undefined,
      ordre: isEditing ? events.find((item) => item.id === eventForm.id)?.ordre ?? events.length : events.length,
      articleIds: eventForm.articleIds,
    }
    if (!payload.nom || !payload.slug) { setError('Donnez un nom à cet événement.'); return }
    await run(async () => {
      await api(isEditing ? `/admin/evenements/${eventForm.id}` : '/admin/evenements', {
        method: isEditing ? 'PATCH' : 'POST', body: JSON.stringify(payload),
      })
      setEventForm(emptyEventForm())
    }, isEditing ? 'Événement mis à jour' : 'Événement créé')
  }

  function editEvent(event: EventItem) {
    setEventForm({ id: event.id, nom: event.nom, sousTitre: event.sousTitre ?? '', description: event.description ?? '', imageUrl: event.imageUrl ?? '', articleIds: event.articles.map((article) => article.id) })
    setError('')
  }

  function toggleEvent(event: EventItem) {
    void run(() => api(`/admin/evenements/${event.id}/actif`, { method: 'PATCH', body: JSON.stringify({ actif: !event.actif }) }), event.actif ? 'Événement masqué' : 'Événement publié')
  }

  // CHANGÉ : écran de login remplacé par le nouveau composant
  if (!isAdmin) return <LoginPage onLogin={login} onBackToSite={() => { window.location.href = '/' }} />

  const pending = reservations.filter((item) => item.statut === 'PROVISOIRE').length
  const expiringSoon = reservations.filter((item) => item.statut === 'PROVISOIRE' && item.expireLe && Date.parse(item.expireLe) > now && Date.parse(item.expireLe) <= now + 6 * 60 * 60 * 1000)
  return <MotionConfig reducedMotion="user"><div className="admin-shell"><aside className="admin-sidebar"><a className="brand" href="/"><BrandLogo /></a><p className="admin-side-label">GESTION</p>{(['reservations', 'catalogue', 'clients'] as Tab[]).map((item) => <button key={item} className={tab === item ? 'selected' : ''} onClick={() => setTab(item)}><span>{item === 'reservations' ? '▦' : item === 'catalogue' ? '⚒' : '♙'}</span>{item === 'reservations' ? 'Réservations' : item === 'catalogue' ? 'Catalogue & stock' : 'Clients'}{item === 'reservations' && pending > 0 && <i>{pending}</i>}</button>)}<div className="admin-side-bottom"><span className="admin-online"><i /> Connecté en admin</span>{/* CHANGÉ : supprime aussi le token de sessionStorage */}<button onClick={() => { localStorage.removeItem('location-token'); sessionStorage.removeItem('location-token'); setToken('') }}>Se déconnecter ↗</button></div></aside>
    <main className="admin-main"><header className="admin-topbar"><div><span>ESPACE ADMIN</span><b>Location matériel</b></div><a href="/">Voir le site public ↗</a></header><div className="admin-content"><motion.div className="admin-page-head" initial={{ opacity: 0, y: 26, filter: 'blur(5px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, amount: 0.22 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}><div><p className="eyebrow"><span className="eyebrow-line" /> VOTRE ACTIVITÉ</p><h1>{tab === 'reservations' ? 'Réservations' : tab === 'catalogue' ? 'Catalogue & stock' : 'Clients'}</h1><p>{tab === 'reservations' ? 'Les demandes, du premier clic au retour du matériel.' : tab === 'catalogue' ? 'Votre matériel, vos tarifs et sa disponibilité.' : 'Coordonnées et fiches de vos clients.'}</p></div><button className="refresh-button" onClick={() => void refresh()}>↻ Actualiser</button></motion.div>
      {error && <div className="inline-error" role="alert">{error}<button onClick={() => setError('')}>×</button></div>}{notice && <div className="admin-notice">✓ {notice}</div>}
      {tab === 'reservations' && expiringSoon.length > 0 && <div className="expiry-alert" role="status"><b>À traiter bientôt</b><span>{expiringSoon.length} demande(s) provisoire(s) expirent dans les 6 prochaines heures : {expiringSoon.map((item) => item.reference).join(', ')}</span></div>}
      {tab === 'reservations' && <><motion.div className="admin-stats" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6, staggerChildren: 0.1 }}><div><span>À traiter</span><b>{pending}</b><small>demandes provisoires</small></div><div><span>Confirmées</span><b>{reservations.filter((r) => ['FERME', 'EN_COURS'].includes(r.statut)).length}</b><small>locations actives</small></div><div><span>Départs ce mois-ci</span><b>{reservations.filter((r) => r.dateDebut?.slice(0, 7) === new Date().toISOString().slice(0, 7)).length}</b><small>au planning</small></div></motion.div>
        <motion.section className="admin-panel" initial={{ opacity: 0, y: 26, filter: 'blur(5px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}><div className="panel-title"><div><h2>Planning global</h2><p>Demandes en ligne et réservations manuelles</p></div><span>{reservations.length} réservation(s)</span></div>{reservations.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Référence / client</th><th>Période</th><th>Matériel</th><th>Total</th><th>Statut</th><th>Action</th></tr></thead><tbody>{reservations.map((r, index) => { const client = clients.find((c) => c.id === r.clientId); return <motion.tr key={r.id} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.35, delay: Math.min(index * 0.025, 0.25) }}><td><b>{r.reference}</b><small>{client ? `${client.prenom} ${client.nom}` : `Client #${r.clientId}`} · {r.source === 'MANUELLE' ? 'Manuelle' : 'En ligne'}</small></td><td>{date(r.dateDebut)}<small>au {date(r.dateFin)}</small></td><td>{r.lignes.map((line) => `${line.quantite} × ${line.article?.nom ?? `Article #${line.articleId}`}`).join(', ')}</td><td>{cash.format(r.total)} Ar<small>Caution {cash.format(r.cautionTotale)} Ar</small></td><td><span className={`status-pill status-${r.statut.toLowerCase()}`}>{r.statut}</span>{r.motifRefus && <small>{r.motifRefus}</small>}</td><td><div className="row-actions">{r.statut === 'PROVISOIRE' && <><button disabled={busy} onClick={() => void run(() => api(`/reservations/${r.id}/decision`, { method: 'PATCH', body: JSON.stringify({ statut: 'FERME' }) }), 'Réservation confirmée')}>Valider</button><button className="reject" disabled={busy} onClick={() => { const motif = window.prompt('Motif du refus ?'); if (motif) void run(() => api(`/reservations/${r.id}/decision`, { method: 'PATCH', body: JSON.stringify({ statut: 'REFUSEE', motif }) }), 'Demande refusée') }}>Refuser</button></>}{r.statut === 'FERME' && <button disabled={busy} onClick={() => void run(() => api(`/reservations/${r.id}/status`, { method: 'PATCH', body: JSON.stringify({ statut: 'EN_COURS' }) }), 'Location démarrée')}>Remise</button>}{r.statut === 'EN_COURS' && <button disabled={busy} onClick={() => void run(() => api(`/reservations/${r.id}/status`, { method: 'PATCH', body: JSON.stringify({ statut: 'TERMINEE' }) }), 'Retour enregistré')}>Retour</button>}</div></td></motion.tr>})}</tbody></table></div> : <div className="admin-empty">Aucune réservation pour le moment.</div>}</motion.section>
        <motion.section className="admin-panel" initial={{ opacity: 0, y: 26, filter: 'blur(5px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}><div className="panel-title"><div><h2>Créer un devis ou une réservation</h2><p>Pour les demandes reçues par téléphone ou en boutique</p></div></div>{clients.length && articles.length ? <form className="admin-form admin-form-row" onSubmit={createManualReservation}><label>Client<CustomSelect name="clientId" options={clients.map((c) => ({ value: String(c.id), label: `${c.prenom} ${c.nom}` }))} /></label><div className="manual-lines">{manualLines.map((line, index) => <div className="manual-line" key={index}><label>Matériel<CustomSelect required value={line.articleId || String(articles[0]?.id ?? '')} onChange={(value) => setManualLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, articleId: value } : item))} options={articles.map((a) => ({ value: String(a.id), label: a.nom }))} /></label><label>Quantité<input type="number" min="1" value={line.quantite} onChange={(event) => setManualLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantite: Number(event.target.value) } : item))} /></label>{manualLines.length > 1 && <button className="remove-line" type="button" onClick={() => setManualLines((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Retirer</button>}</div>)}<button className="add-line" type="button" onClick={() => setManualLines((current) => [...current, { articleId: String(articles[0]?.id ?? ''), quantite: 1 }])}>+ Ajouter un article</button></div><label>Du<DatePicker name="dateDebut" value={manualDateStart} onChange={setManualDateStart} /></label><label>Au<DatePicker name="dateFin" value={manualDateEnd} min={manualDateStart} onChange={setManualDateEnd} /></label><label>État initial<CustomSelect name="statutInitial" options={[{ value: 'PROVISOIRE', label: 'Devis / provisoire' }, { value: 'FERME', label: 'Confirmée' }]} /></label><label className="check-field"><input type="checkbox" name="stockForce" /> Forcer le stock</label><button className="primary-button" disabled={busy}>Créer <span>↗</span></button></form> : <div className="admin-empty">Ajoutez un client et un article avant de créer un devis.</div>}</motion.section></>}

      {tab === 'catalogue' && <><motion.section className="admin-panel" initial={{ opacity: 0, y: 26, filter: 'blur(5px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}><div className="panel-title"><div><h2>Ajouter un article</h2><p>Son stock et son tarif apparaîtront dans le catalogue public.</p></div></div><form className="admin-form admin-form-row" onSubmit={postForm('/admin/catalogue/articles', (f) => ({ nom: f.get('nom'), slug: slug(String(f.get('nom'))), categorieId: Number(f.get('categorieId')), prixJour: Number(f.get('prixJour')), caution: Number(f.get('caution')), quantiteTotale: Number(f.get('quantite')), description: f.get('description') }), 'Article ajouté au catalogue')}><label>Nom<input name="nom" required /></label><label>Catégorie<CustomSelect name="categorieId" required placeholder="Choisir une catégorie" options={categories.map((c) => ({ value: String(c.id), label: c.nom }))} /></label><label>Prix / jour (Ar)<input name="prixJour" type="number" min="0" required /></label><label>Caution (Ar)<input name="caution" type="number" min="0" defaultValue="0" /></label><label>Quantité totale<input name="quantite" type="number" min="0" required /></label><label>Description<input name="description" /></label><button className="primary-button" disabled={busy}>Ajouter l’article <span>↗</span></button></form></motion.section>
        <motion.section className="admin-panel" initial={{ opacity: 0, y: 26, filter: 'blur(5px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}><div className="panel-title"><div><h2>Articles du catalogue</h2><p>Modifiez stock et tarifs, ou masquez temporairement un article.</p></div><span>{articles.length} article(s)</span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Article</th><th>Prix / jour (Ar)</th><th>Caution (Ar)</th><th>Stock total</th><th>Action</th></tr></thead><tbody>{articles.map((a) => <tr key={a.id}><td><b>{a.nom}</b><small>{categories.find((c) => c.id === a.categorieId)?.nom ?? 'Sans catégorie'} · {a.actif ? 'Visible' : 'Masqué'}</small></td><td><input className="stock-input" aria-label={`Prix de ${a.nom}`} type="number" min="0" value={prices[a.id] ?? a.prixJour} onChange={(e) => setPrices({ ...prices, [a.id]: Number(e.target.value) })} /></td><td><input className="stock-input" aria-label={`Caution de ${a.nom}`} type="number" min="0" value={cautions[a.id] ?? a.caution} onChange={(e) => setCautions({ ...cautions, [a.id]: Number(e.target.value) })} /></td><td><input className="stock-input" aria-label={`Stock de ${a.nom}`} type="number" min="0" value={stock[a.id] ?? a.quantiteTotale} onChange={(e) => setStock({ ...stock, [a.id]: Number(e.target.value) })} /></td><td><div className="row-actions"><button disabled={busy} onClick={() => void run(() => api(`/admin/catalogue/articles/${a.id}`, { method: 'PATCH', body: JSON.stringify({ quantiteTotale: stock[a.id], prixJour: prices[a.id], caution: cautions[a.id] }) }), 'Article mis à jour')}>Enregistrer</button><button className={a.actif ? 'reject' : ''} disabled={busy} onClick={() => void run(() => api(`/admin/catalogue/articles/${a.id}/${a.actif ? 'desactiver' : 'activer'}`, { method: 'PATCH' }), a.actif ? 'Article désactivé' : 'Article activé')}>{a.actif ? 'Désactiver' : 'Activer'}</button></div></td></tr>)}</tbody></table>{!articles.length && <div className="admin-empty">Aucun article.</div>}</div></motion.section>
        <motion.section className="admin-panel" initial={{ opacity: 0, y: 26, filter: 'blur(5px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}><div className="panel-title"><div><h2>Catégories</h2><p>Organisez le catalogue visible par les clients.</p></div></div><div className="category-chips">{categories.map((c) => <span key={c.id}>{c.nom}</span>)}</div><form className="admin-form category-form" onSubmit={postForm('/admin/catalogue/categories', (f) => ({ nom: f.get('nom'), slug: slug(String(f.get('nom'))), ordre: categories.length }), 'Catégorie créée')}><label>Nouvelle catégorie<input name="nom" placeholder="Ex. Jardinage" required /></label><button className="primary-button" disabled={busy}>Créer <span>↗</span></button></form></motion.section>
        <motion.section className="admin-panel" initial={{ opacity: 0, y: 26, filter: 'blur(5px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}><div className="panel-title"><div><h2>Matériel indisponible</h2><p>Ces quantités sont déduites du stock disponible.</p></div></div><form className="admin-form admin-form-row" onSubmit={postForm('/admin/indisponibilites', (f) => ({ articleId: Number(f.get('articleId')), quantite: Number(f.get('quantite')), dateDebut: f.get('dateDebut'), dateFin: f.get('dateFin') || undefined, motif: f.get('motif'), note: f.get('note') || undefined }), 'Indisponibilité enregistrée')}><label>Article<CustomSelect name="articleId" options={articles.map((a) => ({ value: String(a.id), label: a.nom }))} /></label><label>Quantité<input name="quantite" type="number" min="1" defaultValue="1" /></label><label>Du<DatePicker name="dateDebut" value={unavailableDateStart} onChange={setUnavailableDateStart} /></label><label>Au (facultatif)<DatePicker name="dateFin" value={unavailableDateEnd} min={unavailableDateStart} onChange={setUnavailableDateEnd} /></label><label>Motif<CustomSelect name="motif" options={[{ value: 'REPARATION', label: 'Réparation' }, { value: 'HORS_SERVICE', label: 'Hors service' }, { value: 'AUTRE', label: 'Autre' }]} /></label><label>Note<input name="note" /></label><button className="primary-button" disabled={busy}>Enregistrer <span>↗</span></button></form>{unavailabilities.map((u) => <div className="unavailability-row" key={u.id}><span>{articles.find((a) => a.id === u.articleId)?.nom} · {u.quantite} · {date(u.dateDebut)} → {u.dateFin ? date(u.dateFin) : 'indéfini'} · {u.motif}</span><button onClick={() => void run(() => api(`/admin/indisponibilites/${u.id}`, { method: 'DELETE' }), 'Indisponibilité supprimée')}>Supprimer</button></div>)}</motion.section></>}

      {tab === 'clients' && <><motion.section className="admin-panel" initial={{ opacity: 0, y: 26, filter: 'blur(5px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}><div className="panel-title"><div><h2>Créer une fiche client</h2><p>Pour les clients en boutique ou par téléphone.</p></div></div><form className="admin-form admin-form-row" onSubmit={postForm('/admin/clients', (f) => ({ prenom: f.get('prenom'), nom: f.get('nom'), telephone: f.get('telephone'), email: f.get('email') || undefined, societe: f.get('societe') || undefined }), 'Fiche client créée')}><label>Prénom<input name="prenom" required /></label><label>Nom<input name="nom" required /></label><label>Téléphone<input name="telephone" type="tel" required /></label><label>E-mail<input name="email" type="email" /></label><label>Société<input name="societe" /></label><button className="primary-button" disabled={busy}>Créer la fiche <span>↗</span></button></form></motion.section><motion.section className="admin-panel" initial={{ opacity: 0, y: 26, filter: 'blur(5px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}><div className="panel-title"><div><h2>Base clients</h2><p>Comptes en ligne et fiches créées manuellement.</p></div><span>{clients.length} client(s)</span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Client</th><th>Contact</th><th>Notes internes</th></tr></thead><tbody>{clients.map((c) => <tr key={c.id}><td><b>{c.prenom} {c.nom}</b><small>#{c.id}{c.societe ? ` · ${c.societe}` : ''}</small></td><td>{c.telephone}<small>{c.email ?? 'Pas d’e-mail'}</small></td><td><div className="client-note-edit"><input aria-label={`Notes sur ${c.prenom} ${c.nom}`} value={clientNotes[c.id] ?? ''} onChange={(e) => setClientNotes({ ...clientNotes, [c.id]: e.target.value })} placeholder="Ajouter une note" /><button disabled={busy} onClick={() => void run(() => api(`/admin/clients/${c.id}/notes`, { method: 'PATCH', body: JSON.stringify({ notesAdmin: clientNotes[c.id] || null }) }), 'Notes client enregistrées')}>Enregistrer</button></div></td></tr>)}</tbody></table></div></motion.section></>}
      {tab === 'catalogue' && <motion.section className="admin-panel event-admin-panel" initial={{ opacity: 0, y: 26, filter: 'blur(5px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}><div className="panel-title"><div><h2>{eventForm.id ? 'Modifier un événement' : 'Ajouter un événement'}</h2><p>Créez un univers et rattachez-y les articles du catalogue.</p></div>{eventForm.id && <button className="event-cancel-edit" type="button" onClick={() => setEventForm(emptyEventForm())}>Annuler la modification</button>}</div>
        <form className="admin-form event-admin-form" onSubmit={saveEvent}><div className="event-admin-fields"><label>Nom de l’événement<input value={eventForm.nom} onChange={(event) => setEventForm((current) => ({ ...current, nom: event.target.value }))} placeholder="Ex. Baptême, lancement de produit…" required /></label><label>Sous-titre<input value={eventForm.sousTitre} onChange={(event) => setEventForm((current) => ({ ...current, sousTitre: event.target.value }))} placeholder="Ex. Réception & cérémonie" /></label><label className="event-description-field">Description<textarea value={eventForm.description} onChange={(event) => setEventForm((current) => ({ ...current, description: event.target.value }))} rows={3} placeholder="Présentez l’ambiance et le type de matériel recherché." /></label><label>Image de couverture (URL facultative)<input type="url" value={eventForm.imageUrl} onChange={(event) => setEventForm((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="https://…" /></label></div>
          <div className="event-material-picker"><div><b>Matériel associé</b><small>Sélectionnez les articles visibles dans le catalogue public pour cet événement.</small></div>{articles.length ? <div className="event-article-list">{articles.map((article) => <label className="event-article-choice" key={article.id}><input type="checkbox" checked={eventForm.articleIds.includes(article.id)} onChange={(event) => setEventForm((current) => ({ ...current, articleIds: event.target.checked ? [...current.articleIds, article.id] : current.articleIds.filter((id) => id !== article.id) }))} /><span>{article.nom}<small>{categories.find((category) => category.id === article.categorieId)?.nom ?? 'Sans catégorie'}</small></span></label>)}</div> : <div className="admin-empty">Ajoutez d’abord des articles au catalogue.</div>}</div>
          <button className="primary-button" disabled={busy || !articles.length}>{busy ? 'Enregistrement…' : eventForm.id ? 'Enregistrer les modifications' : 'Créer l’événement'} <span>↗</span></button></form>
        <div className="event-admin-list">{events.map((item) => <article className="event-admin-row" key={item.id}><div><b>{item.nom}</b><span>{item.sousTitre || item.slug} · {item.articles.length} article(s) associé(s) · {item.actif ? 'Publié' : 'Masqué'}</span></div><div className="row-actions"><button type="button" disabled={busy} onClick={() => editEvent(item)}>Modifier</button><button type="button" className={item.actif ? 'reject' : ''} disabled={busy} onClick={() => toggleEvent(item)}>{item.actif ? 'Masquer' : 'Publier'}</button></div></article>)}</div>
      </motion.section>}
      {tab === 'reservations' && <motion.section className="admin-panel admin-messages-panel" initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }}><div className="panel-title"><div><h2>Messages clients</h2><p>Échangez au sujet des demandes envoyées depuis le site.</p></div><NotificationsBell token={token} /></div><div className="admin-message-list">{reservations.filter((item) => item.source === 'EN_LIGNE').map((item) => { const client = clients.find((person) => person.id === item.clientId); return <article key={item.id}><div><b>{item.reference}</b><span>{client ? `${client.prenom} ${client.nom}` : `Client #${item.clientId}`} · {item.statut}</span></div><button type="button" onClick={() => setOpenConversation(item.id)}>Ouvrir l’échange <span>↗</span></button>{['FERME', 'EN_COURS', 'TERMINEE'].includes(item.statut) && <button type="button" onClick={() => void downloadInvoice(item.id)}>Facture PDF ↓</button>}</article> })}{!reservations.some((item) => item.source === 'EN_LIGNE') && <div className="admin-empty">Les conversations des demandes en ligne apparaîtront ici.</div>}</div></motion.section>}
      {openConversation !== null && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpenConversation(null) }}><section className="admin-message-modal"><button className="close-button" type="button" onClick={() => setOpenConversation(null)} aria-label="Fermer">×</button><ReservationMessages reservationId={openConversation} token={token} /></section></div>}
      {tab === 'reservations' && <motion.section className="admin-panel admin-messages-panel" initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }}><div className="panel-title"><div><h2>Sorties, retours et paiements</h2><p>Contrôlez les quantités, l’état du matériel et les mouvements financiers.</p></div></div><div className="admin-message-list">{reservations.map((item) => { const client = clients.find((person) => person.id === item.clientId); return <article key={item.id}><div><b>{item.reference}</b><span>{client ? `${client.prenom} ${client.nom}` : `Client #${item.clientId}`} · {item.statut}</span></div><button type="button" onClick={() => setOpenOperations(item.id)}>Suivi et paiements <span>↗</span></button></article> })}</div></motion.section>}
      {openOperations !== null && (() => { const item = reservations.find((reservation) => reservation.id === openOperations); return item ? <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpenOperations(null) }}><section className="admin-operations-modal"><div className="operations-modal-heading"><div><span className="eyebrow">DOSSIER DE LOCATION</span><h2>{item.reference}</h2></div><button className="close-button" type="button" onClick={() => setOpenOperations(null)} aria-label="Fermer">×</button></div><ReservationOperations reservation={item} token={token} onChanged={() => void refresh()} /></section></div> : null })()}
    </div></main></div></MotionConfig>
}
