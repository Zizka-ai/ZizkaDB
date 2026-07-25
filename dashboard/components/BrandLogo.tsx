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
  href = '/',
  suffix,
}: BrandLogoProps) {
  const wordmarkStyle: CSSProperties = {
    fontWeight: 700,
    fontSize: variant === 'full' ? 22 : 15,
    color: variant === 'full' ? '#111' : '#111',
  }

  const inner = variant === 'full' ? (
    <div style={{ textAlign: 'center' }}>
      <LogoMark variant="full" />
      {showWordmark && (
        <div style={{ ...wordmarkStyle, marginTop: 10 }}>ZizkaDB</div>
      )}
      {suffix && (
        <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>{suffix}</div>
      )}
    </div>
  ) : (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <LogoMark variant={variant === 'mark' ? 'mark' : 'nav'} />
      {showWordmark && variant === 'nav' && (
        <>
          <span style={wordmarkStyle}>ZizkaDB</span>
          {suffix ? (
            <span style={{ fontSize: 12, color: '#aaa', marginLeft: 2 }}>/ {suffix}</span>
          ) : (
            <span style={{ fontSize: 12, color: '#aaa', marginLeft: 4 }}>by Zizka AI</span>
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
