import Image from 'next/image'
import Link from 'next/link'
import type { CSSProperties } from 'react'

/** Zizka AI brand mark — shared across ZizkaDB surfaces */
const LOGO_SRC = '/zizka-logo.png'

type BrandLogoProps = {
  /** nav: compact mark + ZizkaDB · full: centered logo on auth pages · mark: icon only */
  variant?: 'nav' | 'full' | 'mark'
  /** Show "ZizkaDB" text beside the mark (nav only) */
  showWordmark?: boolean
  /** light = dark text on white panels · dark = white text on black/navy marketing */
  theme?: 'light' | 'dark'
  href?: string
  suffix?: string
}

const markSizes: Record<'nav' | 'full' | 'mark', { w: number; h: number }> = {
  nav: { w: 34, h: 34 },
  mark: { w: 28, h: 28 },
  full: { w: 120, h: 120 },
}

function LogoMark({ variant }: { variant: 'nav' | 'full' | 'mark' }) {
  const { w, h } = markSizes[variant]
  const isFull = variant === 'full'

  return (
    <Image
      src={LOGO_SRC}
      alt="Zizka AI"
      width={isFull ? 200 : w}
      height={isFull ? 200 : h}
      priority={variant === 'full'}
      style={{
        width: isFull ? 'auto' : w,
        height: isFull ? h * 2.2 : h,
        maxWidth: isFull ? 200 : w,
        objectFit: isFull ? 'contain' : 'cover',
        objectPosition: isFull ? 'center' : 'top center',
        borderRadius: isFull ? 0 : 8,
        flexShrink: 0,
      }}
    />
  )
}

export function BrandLogo({
  variant = 'nav',
  showWordmark = true,
  theme = 'dark',
  href = '/',
  suffix,
}: BrandLogoProps) {
  const isDark = theme === 'dark'
  const wordmarkStyle: CSSProperties = {
    fontWeight: 700,
    fontSize: variant === 'full' ? 22 : 15,
    color: isDark ? '#ffffff' : '#111111',
  }
  const suffixStyle: CSSProperties = {
    fontSize: variant === 'full' ? 13 : 12,
    color: isDark ? 'rgba(255,255,255,0.55)' : '#888888',
    marginTop: variant === 'full' ? 4 : undefined,
    marginLeft: variant === 'nav' ? (suffix ? 2 : 4) : undefined,
  }

  const inner = variant === 'full' ? (
    <div style={{ textAlign: 'center' }}>
      <LogoMark variant="full" />
      {showWordmark && (
        <div style={{ ...wordmarkStyle, marginTop: 10 }}>ZizkaDB</div>
      )}
      {suffix && (
        <div style={suffixStyle}>{suffix}</div>
      )}
    </div>
  ) : (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <LogoMark variant={variant === 'mark' ? 'mark' : 'nav'} />
      {showWordmark && variant === 'nav' && (
        <>
          <span style={wordmarkStyle}>ZizkaDB</span>
          {suffix ? (
            <span style={suffixStyle}>/ {suffix}</span>
          ) : (
            <span className="brand-logo-tagline" style={suffixStyle}>by Zizka AI</span>
          )}
        </>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: 'none', display: 'inline-flex' }}>
        {inner}
      </Link>
    )
  }

  return inner
}
