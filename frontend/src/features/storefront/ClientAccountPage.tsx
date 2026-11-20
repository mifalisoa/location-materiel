import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import BrandLogo from '../../components/BrandLogo'
import NotificationsBell from '../../components/ui/NotificationsBell'
import ReservationMessages from '../../components/ui/ReservationMessages'
import ReservationPaymentSummary from '../../components/ui/ReservationPaymentSummary'
import '../../styles/client-account.css'

type Reservation = {
  id: number
  reference: string
  statut: string
  dateDebut: string
  dateFin: string
  total: number
  cautionTotale: number
  expireLe: string | null
  lignes: Array<{ quantite: number; article?: { nom: string } }>
}

const money = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const statusLabels: Record<string, string> = {
  PROVISOIRE: 'En attente', FERME: 'Confirmée', EN_COURS: 'En cours', TERMINEE: 'Terminée',
  REFUSEE: 'Refusée', EXPIREE: 'Expirée', ANNULEE: 'Annulée',
}

export default function ClientAccountPage() {
  const [token, setToken] = useState(() => localStorage.getItem('location-token') ?? '')
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openMessages, setOpenMessages] = useState<number | null>(null)

  useEffect(() => {
    if (!token) {
      window.location.replace('/catalogue?compte=connexion')
      return
    }
    fetch('/api/reservations/moi', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const body: unknown = await response.json().catch(() => null)
        if (!response.ok) {
          const message = typeof body === 'object' && body !== null && 'message' in body ? body.message : 'Chargement des réservations impossible'
          throw new Error(Array.isArray(message) ? message.join(', ') : String(message))
        }
        return body as Reservation[]
      })
      .then(setReservations)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Chargement des réservations impossible'))
      .finally(() => setLoading(false))
  }, [token])

  async function cancelReservation(reservation: Reservation) {
    setError('')
    try {
      const response = await fetch(`/api/reservations/${reservation.id}/annuler`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('L’annulation de cette réservation a échoué.')
      setReservations((current) => current.map((item) => item.id === reservation.id ? { ...item, statut: 'ANNULEE' } : item))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Annulation impossible') }
  }

  async function downloadInvoice(reservationId: number) {
    setError('')
    try {
      const response = await fetch(`/api/reservations/${reservationId}/facture`, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new Error('La facture est indisponible pour cette réservation.')
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = `facture-reservation-${reservationId}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Téléchargement impossible') }
  }

  function logout() {
    localStorage.removeItem('location-token')
    sessionStorage.removeItem('location-token')
    setToken('')
  }

  return <div className="client-account-page">
    <header className="client-account-header">
      <a href="/" aria-label="Accueil"><BrandLogo /></a>
      <div className="client-account-header-actions"><span>ESPACE CLIENT</span><NotificationsBell token={token} /><button onClick={logout}>Se déconnecter</button></div>
    </header>
    <main className="client-account-main">
      <motion.div className="client-account-heading" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div><p className="eyebrow">VOTRE ESPACE PERSONNEL</p><h1>Mes réservations</h1><p>Retrouvez vos demandes, leur suivi et vos échanges avec le loueur.</p></div>
        <a className="client-account-browse" href="/catalogue">Parcourir le catalogue <span>↗</span></a>
      </motion.div>
      {error && <div className="client-account-error" role="alert">{error}</div>}
      {loading ? <div className="client-account-loading">Chargement de votre espace…</div> : reservations.length ? <div className="client-reservations-list">{reservations.map((reservation, index) => <motion.article className="client-reservation-card" key={reservation.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.3) }}>
        <div className="client-reservation-top"><div><span className="client-reference">{reservation.reference}</span><p>{new Date(`${reservation.dateDebut}T12:00:00`).toLocaleDateString('fr-FR')} — {new Date(`${reservation.dateFin}T12:00:00`).toLocaleDateString('fr-FR')}</p></div><span className={`status-pill status-${reservation.statut.toLowerCase()}`}>{statusLabels[reservation.statut] ?? reservation.statut}</span></div>
        <div className="client-reservation-items">{reservation.lignes.map((line, lineIndex) => <span key={`${reservation.id}-${lineIndex}`}>{line.quantite} × {line.article?.nom ?? 'Matériel'}</span>)}</div>
        <div className="client-reservation-summary"><div><span>Total de location</span><strong>{money.format(reservation.total)} Ar</strong></div><div><span>Caution prévue</span><strong>{money.format(reservation.cautionTotale)} Ar</strong></div></div>
        {reservation.statut === 'PROVISOIRE' && reservation.expireLe && <p className="client-reservation-expiry">Demande provisoire, en attente de confirmation du loueur.</p>}
        <div className="client-reservation-actions"><button onClick={() => setOpenMessages((current) => current === reservation.id ? null : reservation.id)}>{openMessages === reservation.id ? 'Masquer les messages' : 'Écrire au loueur'}</button>{['FERME', 'EN_COURS', 'TERMINEE'].includes(reservation.statut) && <button onClick={() => void downloadInvoice(reservation.id)}>Télécharger la facture PDF</button>}{['PROVISOIRE', 'FERME'].includes(reservation.statut) && <button className="client-cancel-action" onClick={() => void cancelReservation(reservation)}>Annuler</button>}</div>
        {openMessages === reservation.id && <ReservationMessages reservationId={reservation.id} token={token} />}
        <ReservationPaymentSummary reservationId={reservation.id} token={token} />
      </motion.article>)}</div> : <motion.section className="client-account-empty" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}><span>01</span><h2>Votre prochaine belle occasion commence ici.</h2><p>Vos demandes de réservation et leur suivi apparaîtront dans cet espace.</p><a href="/catalogue">Découvrir le matériel <span>↗</span></a></motion.section>}
    </main>
  </div>
}
