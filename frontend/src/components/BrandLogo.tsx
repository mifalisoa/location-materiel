import '../styles/brand.css'

type BrandLogoProps = {
  className?: string
  showWordmark?: boolean
}

export default function BrandLogo({ className = '', showWordmark = true }: BrandLogoProps) {
  const classes = ['brand-lockup', showWordmark ? '' : 'brand-lockup--mark-only', className].filter(Boolean).join(' ')

  return (
    <span className={classes}>
      <img className="brand-lockup__image" src="/brand-logo.svg" alt="" aria-hidden="true" />
      {showWordmark && <span className="brand-lockup__name">Location Matériel</span>}
    </span>
  )
}
