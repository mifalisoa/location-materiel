import { useEffect, useRef, useState, type FormEvent } from 'react'

type Message = { id: number; reservationId: number; expediteurId: number; contenu: string; envoyeLe: string }

function tokenUserId(token: string) {
  try { return Number(JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub) } catch { return -1 }
}

export default function ReservationMessages({ reservationId, token }: { reservationId: number; token: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const bottom = useRef<HTMLDivElement>(null)
  const ownId = tokenUserId(token)

  useEffect(() => {
    let alive = true
    const load = () => fetch(`/api/reservations/${reservationId}/messages`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const body = await response.json().catch(() => null)
        if (!response.ok) throw new Error(body?.message ?? 'Chargement des messages impossible')
        if (alive) setMessages(body as Message[])
      }).catch((cause: unknown) => { if (alive) setError(cause instanceof Error ? cause.message : 'Chargement impossible') })
    void load()
    const timer = window.setInterval(() => void load(), 12_000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [reservationId, token])

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const contenu = content.trim()
    if (!contenu || busy) return
    setBusy(true); setError('')
    try {
      const response = await fetch(`/api/reservations/${reservationId}/messages`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ contenu }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(body?.message ?? 'Envoi impossible')
      setMessages((current) => [...current, body as Message]); setContent('')
      requestAnimationFrame(() => bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Envoi impossible') }
    finally { setBusy(false) }
  }

  return <section className="reservation-messages" aria-label={`Messages réservation ${reservationId}`}>
    <div className="messages-heading"><div><b>Échange avec {ownId > 0 && messages.some((message) => message.expediteurId !== ownId) ? 'votre interlocuteur' : 'le loueur'}</b><small>Messages liés à cette réservation</small></div><span>#{reservationId}</span></div>
    {error && <p className="messages-error" role="alert">{error}</p>}
    <div className="messages-list">{messages.length ? messages.map((message) => <article key={message.id} className={`message-bubble ${message.expediteurId === ownId ? 'is-mine' : ''}`}>
      <p>{message.contenu}</p><small>{message.expediteurId === ownId ? 'Vous' : 'Admin'} · {new Date(message.envoyeLe).toLocaleString('fr-FR')}</small>
    </article>) : <p className="messages-empty">Aucun message. Vous pouvez écrire à propos de cette réservation.</p>}<div ref={bottom} /></div>
    <form className="message-compose" onSubmit={send}><label className="sr-only" htmlFor={`message-${reservationId}`}>Votre message</label><textarea id={`message-${reservationId}`} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Écrire un message…" rows={2} maxLength={5000} required /><button type="submit" disabled={busy || !content.trim()}>{busy ? 'Envoi…' : 'Envoyer'} <span>↗</span></button></form>
  </section>
}
