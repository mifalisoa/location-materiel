import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'

type Line = { id: number; quantite: number; article?: { nom: string } }
type ReservationInfo = { id: number; reference: string; statut: string; total: number; cautionTotale: number; lignes: Line[] }
type Check = { id: number; ligneReservationId: number; operation: 'SORTIE' | 'RETOUR'; quantite: number; etat: 'BON' | 'ABIME' | 'MANQUANT'; note: string | null; controleLe: string }
type Payment = { id: number; type: string; montant: number; mode: string; reference: string | null; note: string | null; enregistreLe: string }
type Summary = { totalLocation: number; cautionAttendue: number; locationPayee: number; soldeLocation: number; cautionDetenue: number; cautionARestituer: number }
type ActionType = 'PAIEMENT_LOCATION' | 'REMBOURSEMENT_LOCATION' | 'CAUTION_RECUE' | 'CAUTION_RESTITUEE'
const cash = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const paymentActions: Array<{ id: ActionType; label: string }> = [
  { id: 'PAIEMENT_LOCATION', label: 'Encaisser location' }, { id: 'CAUTION_RECUE', label: 'Encaisser caution' },
  { id: 'REMBOURSEMENT_LOCATION', label: 'Rembourser location' }, { id: 'CAUTION_RESTITUEE', label: 'Restituer caution' },
]
const modes = [{ id: 'ESPECES', label: 'Espèces' }, { id: 'MVOLA', label: 'MVola' }, { id: 'ORANGE_MONEY', label: 'Orange Money' }, { id: 'AIRTEL_MONEY', label: 'Airtel Money' }, { id: 'VIREMENT', label: 'Virement' }, { id: 'CARTE', label: 'Carte' }, { id: 'AUTRE', label: 'Autre' }]

export default function ReservationOperations({ reservation, token, onChanged }: { reservation: ReservationInfo; token: string; onChanged: () => void }) {
  const [checks, setChecks] = useState<Check[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [condition, setCondition] = useState<Record<number, 'BON' | 'ABIME'>>({})
  const [returnCounts, setReturnCounts] = useState<Record<number, { good: number; damaged: number; missing: number }>>({})
  const [note, setNote] = useState<Record<number, string>>({})
  const [action, setAction] = useState<ActionType>('PAIEMENT_LOCATION')
  const [mode, setMode] = useState('ESPECES')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const headers = { Authorization: `Bearer ${token}` }
    const [checkResponse, paymentResponse] = await Promise.all([
      fetch(`/api/reservations/${reservation.id}/controles-materiel`, { headers }),
      fetch(`/api/reservations/${reservation.id}/paiements`, { headers }),
    ])
    const [checkBody, paymentBody] = await Promise.all([checkResponse.json(), paymentResponse.json()])
    if (!checkResponse.ok) throw new Error(checkBody?.message ?? 'Chargement des contrôles impossible')
    if (!paymentResponse.ok) throw new Error(paymentBody?.message ?? 'Chargement des paiements impossible')
    setChecks(checkBody as Check[])
    const paymentData = paymentBody as { items: Payment[] } & Summary
    setPayments(paymentData.items); setSummary(paymentData)
    setReturnCounts((current) => {
      const next = { ...current }
      for (const line of reservation.lignes) {
        const issued = checkBody.filter((check: Check) => check.operation === 'SORTIE' && check.ligneReservationId === line.id).reduce((sum: number, check: Check) => sum + check.quantite, 0)
        next[line.id] ??= { good: issued, damaged: 0, missing: 0 }
      }
      return next
    })
  }, [reservation.id, reservation.lignes, token])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Chargement impossible')) }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const issuedByLine = useMemo(() => Object.fromEntries(reservation.lignes.map((line) => [line.id, checks.filter((check) => check.operation === 'SORTIE' && check.ligneReservationId === line.id).reduce((sum, check) => sum + check.quantite, 0)])), [checks, reservation.lignes])
  const paymentLimit = summary ? ({ PAIEMENT_LOCATION: summary.soldeLocation, CAUTION_RECUE: summary.cautionAttendue - summary.cautionDetenue, REMBOURSEMENT_LOCATION: Math.max(0, payments.filter((item) => item.type === 'PAIEMENT_LOCATION').reduce((sum, item) => sum + item.montant, 0) - payments.filter((item) => item.type === 'REMBOURSEMENT_LOCATION').reduce((sum, item) => sum + item.montant, 0)), CAUTION_RESTITUEE: summary.cautionDetenue } as Record<ActionType, number>)[action] : 0

  async function submitChecks(operation: 'SORTIE' | 'RETOUR') {
    setBusy(true); setError('')
    try {
      const lignes = reservation.lignes.flatMap((line) => {
        if (operation === 'SORTIE') return [{ ligneReservationId: line.id, quantite: line.quantite, etat: condition[line.id] ?? 'BON', note: note[line.id] ?? '' }]
        const counts = returnCounts[line.id] ?? { good: 0, damaged: 0, missing: 0 }
        return ([['BON', counts.good], ['ABIME', counts.damaged], ['MANQUANT', counts.missing]] as const).filter(([, quantite]) => quantite > 0).map(([etat, quantite]) => ({ ligneReservationId: line.id, quantite, etat, note: note[line.id] ?? '' }))
      })
      const response = await fetch(`/api/reservations/${reservation.id}/${operation === 'SORTIE' ? 'sortie-materiel' : 'retour-materiel'}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ lignes, commentaire: comment }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(Array.isArray(body?.message) ? body.message.join(', ') : body?.message ?? 'Enregistrement impossible')
      await load(); onChanged()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Enregistrement impossible') }
    finally { setBusy(false) }
  }

  async function addPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const response = await fetch(`/api/reservations/${reservation.id}/paiements`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: action, mode, montant: Number(amount), reference: reference || undefined, note: comment || undefined }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(Array.isArray(body?.message) ? body.message.join(', ') : body?.message ?? 'Enregistrement du paiement impossible')
      setAmount(''); setReference(''); await load(); onChanged()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Enregistrement impossible') }
    finally { setBusy(false) }
  }

  return <div className="reservation-operations">
    {error && <div className="inline-error" role="alert">{error}</div>}
    <section className="operation-block"><header><div><b>Sortie et retour du matériel</b><small>Réservation {reservation.reference} · Les écarts abîmés ou manquants seront ajoutés aux indisponibilités.</small></div><span className={`status-pill status-${reservation.statut.toLowerCase()}`}>{reservation.statut}</span></header>
      {reservation.statut === 'FERME' && <><div className="equipment-check-rows">{reservation.lignes.map((line) => <article key={line.id}><div><b>{line.article?.nom ?? `Article #${line.id}`}</b><small>{line.quantite} unité(s) à remettre</small></div><div className="choice-pills"><button type="button" className={(condition[line.id] ?? 'BON') === 'BON' ? 'is-selected' : ''} onClick={() => setCondition((current) => ({ ...current, [line.id]: 'BON' }))}>Bon état</button><button type="button" className={condition[line.id] === 'ABIME' ? 'is-selected is-warning' : ''} onClick={() => setCondition((current) => ({ ...current, [line.id]: 'ABIME' }))}>À vérifier</button></div><input value={note[line.id] ?? ''} onChange={(event) => setNote((current) => ({ ...current, [line.id]: event.target.value }))} placeholder="Note facultative" /></article>)}</div><label className="operation-comment">Commentaire général<input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Ex. remis au dépôt" /></label><button className="operation-primary" type="button" disabled={busy} onClick={() => void submitChecks('SORTIE')}>{busy ? 'Enregistrement…' : 'Confirmer la remise du matériel →'}</button></>}
      {reservation.statut === 'EN_COURS' && <><div className="equipment-check-rows">{reservation.lignes.map((line) => { const issued = issuedByLine[line.id] ?? 0; const counts = returnCounts[line.id] ?? { good: issued, damaged: 0, missing: 0 }; return <article key={line.id}><div><b>{line.article?.nom ?? `Article #${line.id}`}</b><small>{issued} unité(s) remises · total à répartir : {counts.good + counts.damaged + counts.missing}/{issued}</small></div><label>Bon<input type="number" min="0" max={issued} value={counts.good} onChange={(event) => setReturnCounts((current) => ({ ...current, [line.id]: { ...counts, good: Number(event.target.value) } }))} /></label><label>Abîmé<input type="number" min="0" max={issued} value={counts.damaged} onChange={(event) => setReturnCounts((current) => ({ ...current, [line.id]: { ...counts, damaged: Number(event.target.value) } }))} /></label><label>Manquant<input type="number" min="0" max={issued} value={counts.missing} onChange={(event) => setReturnCounts((current) => ({ ...current, [line.id]: { ...counts, missing: Number(event.target.value) } }))} /></label><input value={note[line.id] ?? ''} onChange={(event) => setNote((current) => ({ ...current, [line.id]: event.target.value }))} placeholder="Note sur l’état" /></article> })}</div><label className="operation-comment">Commentaire général<input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Ex. retour complet" /></label><button className="operation-primary" type="button" disabled={busy || reservation.lignes.some((line) => { const counts = returnCounts[line.id] ?? { good: 0, damaged: 0, missing: 0 }; return counts.good + counts.damaged + counts.missing !== (issuedByLine[line.id] ?? 0) })} onClick={() => void submitChecks('RETOUR')}>{busy ? 'Enregistrement…' : 'Confirmer le retour →'}</button></>}
      {['TERMINEE', 'ANNULEE', 'REFUSEE', 'EXPIREE', 'PROVISOIRE'].includes(reservation.statut) && <p className="operation-readonly">Aucun contrôle de remise/retour à effectuer pour ce statut.</p>}
      {checks.length > 0 && <details className="operation-history"><summary>Historique des contrôles ({checks.length})</summary>{checks.map((check) => <div key={check.id}><span>{check.operation === 'SORTIE' ? 'Sortie' : 'Retour'} · {reservation.lignes.find((line) => line.id === check.ligneReservationId)?.article?.nom ?? 'Matériel'} · {check.quantite} · {check.etat}</span><small>{check.note || new Date(check.controleLe).toLocaleString('fr-FR')}</small></div>)}</details>}
    </section>

    <section className="operation-block"><header><div><b>Paiements et caution</b><small>Location : {cash.format(summary?.locationPayee ?? 0)} / {cash.format(reservation.total)} Ar · Caution détenue : {cash.format(summary?.cautionDetenue ?? 0)} / {cash.format(reservation.cautionTotale)} Ar</small></div></header>
      <div className="choice-pills payment-actions">{paymentActions.map((item) => <button type="button" key={item.id} className={action === item.id ? 'is-selected' : ''} onClick={() => { setAction(item.id); setAmount('') }}>{item.label}</button>)}</div>
      <form className="payment-entry" onSubmit={(event) => void addPayment(event)}><label>Montant (Ar)<input type="number" min="1" max={paymentLimit} value={amount} onChange={(event) => setAmount(event.target.value)} required /><small>Reste possible : {cash.format(paymentLimit)} Ar</small></label><div className="payment-mode-label">Mode de paiement</div><div className="choice-pills payment-modes">{modes.map((item) => <button type="button" key={item.id} className={mode === item.id ? 'is-selected' : ''} onClick={() => setMode(item.id)}>{item.label}</button>)}</div><label>Référence de paiement (facultative)<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="N° reçu ou transaction" /></label><button className="operation-primary" type="submit" disabled={busy || paymentLimit < 1}>{busy ? 'Enregistrement…' : `${paymentActions.find((item) => item.id === action)?.label} →`}</button></form>
      <details className="operation-history"><summary>Historique financier ({payments.length})</summary>{payments.map((item) => <div key={item.id}><span>{paymentActions.find((entry) => entry.id === item.type)?.label ?? item.type} · {cash.format(item.montant)} Ar · {modes.find((entry) => entry.id === item.mode)?.label ?? item.mode}</span><small>{item.reference ? `${item.reference} · ` : ''}{new Date(item.enregistreLe).toLocaleString('fr-FR')}</small></div>)}{!payments.length && <p>Aucun mouvement enregistré.</p>}</details>
    </section>
  </div>
}
