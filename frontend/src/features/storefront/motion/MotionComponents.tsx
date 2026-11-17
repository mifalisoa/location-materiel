import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, animate, motion, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import { fadeIn, menuLinkVariants, menuVariants, smoothEase, spring, stagger, staggerFast, staggerItem } from './animations'

const viewport = { once: true, amount: 0.3 } as const

type FadeInProps = { children: ReactNode; className?: string; delay?: number; direction?: 'up' | 'left' | 'right' | 'zoom' }

export function FadeIn({ children, className, delay = 0, direction = 'up' }: FadeInProps) {
  const reduced = useReducedMotion()
  const variants = direction === 'left' ? { hidden: { opacity: 0, x: -26 }, visible: { opacity: 1, x: 0 } }
    : direction === 'right' ? { hidden: { opacity: 0, x: 26 }, visible: { opacity: 1, x: 0 } }
      : direction === 'zoom' ? { hidden: { opacity: 0, scale: 0.96 }, visible: { opacity: 1, scale: 1 } }
        : fadeIn
  return <motion.div className={className} initial={reduced ? false : 'hidden'} whileInView="visible" viewport={viewport} variants={variants} transition={{ duration: reduced ? 0 : 0.65, delay, ease: smoothEase }}>{children}</motion.div>
}

export function StaggerContainer({ children, className, fast = false }: { children: ReactNode; className?: string; fast?: boolean }) {
  const reduced = useReducedMotion()
  return <motion.div className={className} initial={false} whileInView={reduced ? undefined : 'visible'} viewport={viewport} variants={reduced ? undefined : fast ? staggerFast : stagger}>{children}</motion.div>
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion()
  return <motion.div className={className} variants={reduced ? undefined : staggerItem}>{children}</motion.div>
}

export function AnimatedText({ text, className }: { text: string; className?: string }) {
  const reduced = useReducedMotion()
  return <span className={`animated-text ${className ?? ''}`} aria-label={text}>
    <span className="sr-only">{text}</span>
    <span aria-hidden="true">{text.split(' ').map((word, index) => <motion.span className="animated-word" key={`${word}-${index}`} initial={reduced ? false : { opacity: 0, y: 22, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: reduced ? 0 : 0.55, delay: reduced ? 0 : index * 0.075, ease: smoothEase }}>{word}{index < text.split(' ').length - 1 ? ' ' : ''}</motion.span>)}</span>
  </span>
}

export function Counter({ value, suffix = '', duration = 1.1 }: { value: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.65 })
  const reduced = useReducedMotion()
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => Math.round(latest).toLocaleString('fr-FR'))
  useEffect(() => {
    if (isInView) {
      if (reduced) count.set(value)
      else void animate(count, value, { duration, ease: smoothEase })
    }
  }, [count, duration, isInView, reduced, value])
  return <span ref={ref}><motion.span>{rounded}</motion.span>{suffix}</span>
}

export function Magnetic({ children, className, strength = 0.2 }: { children: ReactNode; className?: string; strength?: number }) {
  const reduced = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, spring)
  const sy = useSpring(y, spring)
  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (reduced || event.pointerType !== 'mouse') return
    const bounds = event.currentTarget.getBoundingClientRect()
    x.set((event.clientX - bounds.left - bounds.width / 2) * strength)
    y.set((event.clientY - bounds.top - bounds.height / 2) * strength)
  }
  function reset() { x.set(0); y.set(0) }
  return <motion.div className={className} style={reduced ? undefined : { x: sx, y: sy }} onPointerMove={move} onPointerLeave={reset} whileHover={reduced ? undefined : { scale: 1.035, filter: 'drop-shadow(0 8px 16px rgba(19,169,158,.25))' }} whileTap={reduced ? undefined : { scale: 0.95 }}>{children}</motion.div>
}

export function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion()
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const rotateX = useSpring(rx, { stiffness: 170, damping: 22 })
  const rotateY = useSpring(ry, { stiffness: 170, damping: 22 })
  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (reduced || event.pointerType !== 'mouse') return
    const box = event.currentTarget.getBoundingClientRect()
    rx.set(((event.clientY - box.top) / box.height - 0.5) * -6)
    ry.set(((event.clientX - box.left) / box.width - 0.5) * 7)
  }
  return <motion.div className={className} style={reduced ? undefined : { rotateX, rotateY, transformPerspective: 900 }} onPointerMove={move} onPointerLeave={() => { rx.set(0); ry.set(0) }} whileHover={reduced ? undefined : { y: -5 }} transition={{ type: 'spring', stiffness: 180, damping: 20 }}>{children}</motion.div>
}

export function ScrollParallax({ children, className, distance = 70 }: { children: ReactNode; className?: string; distance?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance])
  return <motion.div ref={ref} className={className} style={reduced ? undefined : { y }}>{children}</motion.div>
}

export function ReadingProgress() {
  const { scrollYProgress } = useScroll()
  const reduced = useReducedMotion()
  return <motion.div className="reading-progress" aria-hidden="true" style={{ scaleX: reduced ? 0 : scrollYProgress }} />
}

export function MotionCursor() {
  const reduced = useReducedMotion()
  const [active, setActive] = useState(false)
  const [enabled] = useState(() => typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches)
  const x = useMotionValue(-30)
  const y = useMotionValue(-30)
  const sx = useSpring(x, { stiffness: 280, damping: 28, mass: 0.35 })
  const sy = useSpring(y, { stiffness: 280, damping: 28, mass: 0.35 })
  useEffect(() => {
    if (reduced || !window.matchMedia('(pointer: fine)').matches) return
    const move = (event: PointerEvent) => { x.set(event.clientX - 5); y.set(event.clientY - 5) }
    const over = (event: PointerEvent) => setActive(Boolean((event.target as Element | null)?.closest('a,button,[role="button"]')))
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerover', over, { passive: true })
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerover', over) }
  }, [reduced, x, y])
  return <AnimatePresence>{!reduced && enabled && <motion.span className={`motion-cursor${active ? ' is-active' : ''}`} aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1, scale: active ? 2.7 : 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }} style={{ x: sx, y: sy }} />}</AnimatePresence>
}

export function MobileMenu({ open, children }: { open: boolean; children: ReactNode }) {
  const reduced = useReducedMotion()
  return <AnimatePresence initial={false}>{open && <motion.div className="mobile-menu" initial={reduced ? false : 'hidden'} animate="visible" exit="hidden" variants={reduced ? undefined : menuVariants}>{children}</motion.div>}</AnimatePresence>
}

export function MobileMenuLink({ children, href, onClick }: { children: ReactNode; href: string; onClick?: () => void }) {
  const reduced = useReducedMotion()
  return <motion.a href={href} onClick={onClick} variants={reduced ? undefined : menuLinkVariants}>{children}</motion.a>
}
