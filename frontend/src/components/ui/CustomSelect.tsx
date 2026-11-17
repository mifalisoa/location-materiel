import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export type SelectOption = { value: string; label: string }
type CustomSelectProps = {
  name?: string
  options: SelectOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  placeholder?: string
  required?: boolean
}

export default function CustomSelect({ name, options, value, defaultValue, onChange, placeholder = 'Choisir…', required = false }: CustomSelectProps) {
  const [localValue, setLocalValue] = useState(value ?? defaultValue ?? options[0]?.value ?? '')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const selectedValue = value ?? (options.some((option) => option.value === localValue) ? localValue : options[0]?.value ?? '')
  const selectedOption = options.find((option) => option.value === selectedValue)

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); triggerRef.current?.focus() }
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  function choose(option: SelectOption) {
    if (value === undefined) setLocalValue(option.value)
    onChange?.(option.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setActiveIndex(Math.max(0, options.findIndex((option) => option.value === selectedValue)))
        setOpen(true)
      } else if (options.length) setActiveIndex((current) => (current + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (open && options[activeIndex]) choose(options[activeIndex])
      else setOpen(true)
    } else if (event.key === 'Home' && options.length) { event.preventDefault(); setActiveIndex(0); setOpen(true) }
    else if (event.key === 'End' && options.length) { event.preventDefault(); setActiveIndex(options.length - 1); setOpen(true) }
  }

  return <div className="custom-select" ref={rootRef}>
    {name && <input type="hidden" name={name} value={selectedValue} />}
    <button ref={triggerRef} className="custom-select-trigger" type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-required={required} aria-label={name} onClick={() => { setActiveIndex(Math.max(0, options.findIndex((option) => option.value === selectedValue))); setOpen((current) => !current) }} onKeyDown={handleKeyDown}>
      <span className={!selectedOption ? 'custom-select-placeholder' : ''}>{selectedOption?.label ?? placeholder}</span><svg className={open ? 'custom-select-chevron is-open' : 'custom-select-chevron'} viewBox="0 0 16 16" aria-hidden="true"><path d="m3 6 5 5 5-5" /></svg>
    </button>
    <AnimatePresence>
      {open && <motion.div className="custom-select-menu" role="listbox" initial={{ opacity: 0, y: -5, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: .98 }} transition={{ duration: .14 }}>
        {options.length ? options.map((option, index) => <button className={`${option.value === selectedValue ? 'custom-select-option is-selected' : 'custom-select-option'}${activeIndex === index ? ' is-active' : ''}`} type="button" role="option" aria-selected={option.value === selectedValue} key={option.value} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(option)}>{option.label}{option.value === selectedValue && <span aria-hidden="true">✓</span>}</button>) : <span className="custom-select-empty">Aucune option</span>}
      </motion.div>}
    </AnimatePresence>
  </div>
}
