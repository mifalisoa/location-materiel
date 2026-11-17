import { useEffect, useState } from 'react'

type NotificationItem = { id: number; reservationId: number | null; type: string; message: string; creeLe: string; luLe: string | null }

export default function NotificationsBell({ token }: { token: string }) {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!token) return
    let alive = true
    const load = () => fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() as Promise<{ items: NotificationItem[]; unread: number }> : Promise.reject())
      .then((data) => { if (alive) { setItems(data.items); setUnread(data.unread) } })
      .catch(() => undefined)
    void load()
    const timer = window.setInterval(() => void load(), 30_000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [token])

  async function markRead(item: NotificationItem) {
    if (item.luLe) return
    await fetch(`/api/notifications/${item.id}/lue`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined)
    setItems((current) => current.map((notification) => notification.id === item.id ? { ...notification, luLe: new Date().toISOString() } : notification))
    setUnread((count) => Math.max(0, count - 1))
  }

  return <div className="notification-widget">
    <button className="notification-trigger" type="button" aria-label={`Notifications, ${unread} non lue(s)`} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>{unread > 0 && <i>{unread > 9 ? '9+' : unread}</i>}
    </button>
    {open && <section className="notification-popover" aria-label="Notifications">
      <header><b>Notifications</b><span>{unread} non lue(s)</span></header>
      {items.length ? <ul>{items.map((item) => <li key={item.id} className={item.luLe ? '' : 'is-unread'}>
        <button type="button" onClick={() => void markRead(item)}><span>{item.message}</span><small>{new Date(item.creeLe).toLocaleString('fr-FR')}</small></button>
      </li>)}</ul> : <p className="notifications-empty">Aucune notification pour le moment.</p>}
    </section>}
  </div>
}
