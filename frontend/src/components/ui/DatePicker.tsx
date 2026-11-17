import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

type DatePickerProps = { value: string; onChange: (value: string) => void; min?: string; name?: string; placeholder?: string; label?: string }
const parseDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return year && month && day ? new Date(year, month - 1, day) : null
}
const toValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
const dateLabel = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export default function DatePicker({ value, onChange, min, name, placeholder = 'Choisir une date', label }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = parseDate(value) ?? new Date()
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })
  const rootRef = useRef<HTMLDivElement>(null)
  const selectedDate = parseDate(value)

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const calendarDays = useMemo(() => {
    const offset = (visibleMonth.getDay() + 6) % 7
    const dayCount = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate()
    return Array.from({ length: 42 }, (_, index) => {
      const day = index - offset + 1
      return day > 0 && day <= dayCount ? new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day) : null
    })
  }, [visibleMonth])

  return <div className="date-picker-wrap" ref={rootRef}>
    {name && <input type="hidden" name={name} value={value} />}
    <button type="button" className="date-picker-trigger" aria-haspopup="dialog" aria-expanded={open} aria-label={label ?? placeholder} onClick={() => setOpen((current) => !current)}>
      <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="4.5" width="15" height="13" rx="1.5" /><path d="M6 2.5v4M14 2.5v4M3 8.5h14" /></svg><span className={value ? '' : 'date-picker-placeholder'}>{selectedDate ? dateLabel.format(selectedDate) : placeholder}</span><span className="date-picker-trigger-chevron">⌄</span>
    </button>
    <AnimatePresence>
      {open && <motion.div className="date-calendar" role="dialog" aria-label="Choisir une date" initial={{ opacity: 0, y: -6, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: .98 }} transition={{ duration: .16 }}>
        <div className="date-calendar-head"><button type="button" aria-label="Mois précédent" onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button><strong>{monthLabel.format(visibleMonth)}</strong><button type="button" aria-label="Mois suivant" onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button></div>
        <div className="date-calendar-grid date-calendar-weekdays" aria-hidden="true">{weekdays.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
        <div className="date-calendar-grid">{calendarDays.map((day, index) => {
          if (!day) return <span className="date-calendar-empty" key={`empty-${index}`} />
          const dayValue = toValue(day)
          const isDisabled = Boolean(min && dayValue < min)
          const isSelected = dayValue === value
          const isToday = dayValue === toValue(new Date())
          const className = ['date-calendar-day', isSelected && 'is-selected', isToday && 'is-today'].filter(Boolean).join(' ')
          return <button type="button" key={dayValue} className={className} disabled={isDisabled} aria-pressed={isSelected} onClick={() => { onChange(dayValue); setVisibleMonth(new Date(day.getFullYear(), day.getMonth(), 1)); setOpen(false) }}>{day.getDate()}</button>
        })}</div>
      </motion.div>}
    </AnimatePresence>
  </div>
}
