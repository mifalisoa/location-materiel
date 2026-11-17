import { useEffect, useState } from 'react'

type Summary = { locationPayee: number; soldeLocation: number; cautionDetenue: number; cautionAttendue: number }
const money = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

export default function ReservationPaymentSummary({ reservationId, token }: { reservationId: number; token: string }) {
  const [summary, setSummary] = useState<Summary | null>(null)
  useEffect(() => {
    let alive = true
    fetch(`/api/reservations/${reservationId}/paiements`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => { if (!response.ok) throw new Error(''); return response.json() as Promise<Summary> })
      .then((data) => { if (alive) setSummary(data) }).catch(() => undefined)
    return () => { alive = false }
  }, [reservationId, token])
  if (!summary) return null
  return <div className="client-payment-summary"><span>Réglé : <b>{money.format(summary.locationPayee)} Ar</b></span><span>Reste location : <b>{money.format(summary.soldeLocation)} Ar</b></span><span>Caution reçue : <b>{money.format(summary.cautionDetenue)} / {money.format(summary.cautionAttendue)} Ar</b></span></div>
}
