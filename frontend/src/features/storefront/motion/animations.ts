import type { Variants } from 'framer-motion'

export const spring = { type: 'spring', stiffness: 180, damping: 22 } as const
export const smoothEase = [0.22, 1, 0.36, 1] as const

export const fadeIn: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(5px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.65, ease: smoothEase } },
}

export const fromLeft: Variants = {
  hidden: { opacity: 0, x: -34 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: smoothEase } },
}

export const fromRight: Variants = {
  hidden: { opacity: 0, x: 34 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: smoothEase } },
}

export const zoomIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.65, ease: smoothEase } },
}

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
}

export const staggerFast: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055 } },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: smoothEase } },
}

export const menuVariants: Variants = {
  hidden: { opacity: 0, height: 0, transition: { duration: 0.2 } },
  visible: { opacity: 1, height: 'auto', transition: { duration: 0.3, ease: smoothEase, when: 'beforeChildren', staggerChildren: 0.06 } },
}

export const menuLinkVariants: Variants = {
  hidden: { opacity: 0, x: 14 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.24, ease: smoothEase } },
}
