'use client'

import { useEffect, useRef } from 'react'

const BG = '#000000'

type Star = {
  theta: number
  phi: number
  radius: number
  size: number
  twinklePhase: number
  twinkleSpeed: number
  baseAlpha: number
  pointed: boolean
  warm: boolean
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function createStars(count: number, seed: number): Star[] {
  const rand = mulberry32(seed)
  return Array.from({ length: count }, () => {
    const pointed = rand() > 0.58
    return {
      theta: rand() * Math.PI * 2,
      phi: Math.acos(2 * rand() - 1),
      radius: 0.82 + rand() * 0.18,
      size: pointed ? 1.6 + rand() * 2.4 : 0.5 + rand() * 0.9,
      twinklePhase: rand() * Math.PI * 2,
      twinkleSpeed: 0.9 + rand() * 2.2,
      baseAlpha: 0.22 + rand() * 0.5,
      pointed,
      warm: rand() > 0.88,
    }
  })
}

function starColor(alpha: number, warm: boolean) {
  return warm ? `rgba(255, 228, 196, ${alpha})` : `rgba(220, 228, 240, ${alpha})`
}

function drawPointedStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  alpha: number,
  warm: boolean,
) {
  const color = starColor(alpha, warm)
  ctx.strokeStyle = color
  ctx.lineWidth = 0.55
  ctx.lineCap = 'round'

  const r = size
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.lineTo(x, y + r)
  ctx.moveTo(x - r, y)
  ctx.lineTo(x + r, y)
  const d = r * 0.55
  ctx.moveTo(x - d, y - d)
  ctx.lineTo(x + d, y + d)
  ctx.moveTo(x + d, y - d)
  ctx.lineTo(x - d, y + d)
  ctx.stroke()

  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, Math.max(0.35, size * 0.18), 0, Math.PI * 2)
  ctx.fill()
}

function renderFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  stars: Star[],
  rotation: number,
  timeMs: number,
  subtle: boolean,
) {
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, width, height)

  const cx = width / 2
  const cy = height / 2
  const scale = Math.min(width, height) * 0.52
  const cosR = Math.cos(rotation)
  const sinR = Math.sin(rotation)
  const dim = subtle ? 0.72 : 1

  const projected = stars
    .map((star) => {
      const x3 = Math.cos(star.theta) * Math.sin(star.phi) * star.radius
      const y3 = Math.cos(star.phi) * star.radius
      const z3 = Math.sin(star.theta) * Math.sin(star.phi) * star.radius

      const xr = x3 * cosR + z3 * sinR
      const zr = -x3 * sinR + z3 * cosR

      const twinkle = 0.5 + 0.5 * Math.sin(timeMs * 0.001 * star.twinkleSpeed + star.twinklePhase)
      const depth = 0.3 + 0.7 * ((zr + 1) / 2)
      const alpha = Math.min(0.85, star.baseAlpha * twinkle * depth * dim)

      return {
        sx: cx + xr * scale,
        sy: cy + y3 * scale,
        z: zr,
        alpha,
        star,
      }
    })
    .sort((a, b) => a.z - b.z)

  for (const p of projected) {
    if (p.alpha < 0.04) continue
    if (p.star.pointed) {
      drawPointedStar(ctx, p.sx, p.sy, p.star.size, p.alpha, p.star.warm)
    } else {
      ctx.fillStyle = starColor(p.alpha, p.star.warm)
      ctx.beginPath()
      ctx.arc(p.sx, p.sy, p.star.size * 0.45, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

type Props = {
  variant?: 'hero' | 'subtle'
}

export function HeroOperationalField({ variant = 'hero' }: Props) {
  const subtle = variant === 'subtle'
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const stars = createStars(subtle ? 90 : 160, subtle ? 909 : 404)
    let frameId = 0
    let rotation = 0
    let start = performance.now()
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const rotSpeed = subtle ? 0.000035 : 0.00007

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const { width, height } = wrap.getBoundingClientRect()
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    const tick = (now: number) => {
      const { width, height } = wrap.getBoundingClientRect()
      if (!reducedMotion) {
        rotation += rotSpeed * (now - start)
        start = now
      }
      renderFrame(ctx, width, height, stars, rotation, now, subtle)
      if (!reducedMotion) frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frameId)
      ro.disconnect()
    }
  }, [subtle])

  return (
    <div
      ref={wrapRef}
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        background: BG,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      {/* Soft center dim so headline stays dominant */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: subtle
            ? 'radial-gradient(ellipse 60% 55% at 50% 45%, rgba(0,0,0,0.5) 0%, transparent 72%)'
            : 'radial-gradient(ellipse 58% 52% at 50% 42%, rgba(0,0,0,0.62) 0%, transparent 70%)',
        }}
      />
    </div>
  )
}
