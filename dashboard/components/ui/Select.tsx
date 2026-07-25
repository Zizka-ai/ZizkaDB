'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { colors, radii } from '@/lib/design-tokens'

export interface SelectOption<T extends string = string> {
  value: T
  label: string
}

/**
 * Small accessible dropdown (listbox). Keyboard: Up/Down move the highlight,
 * Enter/Space select, Escape closes. Closes on outside click. Styled to match
 * the dashboard tokens; used for the report period picker.
 */
export function Select<T extends string = string>({
  options,
  value,
  onChange,
  ariaLabel,
  minWidth = 200,
}: {
  options: SelectOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  minWidth?: number
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, options, value])

  function commit(v: T) {
    onChange(v)
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(options.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const opt = options[active]
      if (opt) commit(opt.value)
    }
  }

  return (
    <div className="relative" ref={ref} onKeyDown={onKeyDown}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="btn-hover flex items-center justify-between gap-2 px-3 py-1.5 text-sm w-full"
        style={{
          minWidth,
          background: colors.surface,
          border: `1px solid ${colors.borderStrong}`,
          borderRadius: radii.md,
          color: colors.text,
        }}
      >
        <span className="truncate">{selected?.label ?? 'Select'}</span>
        <ChevronDown size={14} style={{ color: colors.textMuted }} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 mt-1 z-30 w-full max-h-72 overflow-auto py-1"
          style={{
            minWidth,
            background: colors.surface,
            border: `1px solid ${colors.borderStrong}`,
            borderRadius: radii.lg,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          {options.map((o, i) => {
            const isSel = o.value === value
            const isActive = i === active
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={isSel}
                onMouseEnter={() => setActive(i)}
                onClick={() => commit(o.value)}
                className="opt-hover px-3 py-2 text-sm cursor-pointer"
                style={{
                  background: isActive ? colors.surfaceHover : 'transparent',
                  color: isSel ? colors.textStrong : colors.text,
                }}
              >
                {o.label}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
