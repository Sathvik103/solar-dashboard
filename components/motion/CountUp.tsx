'use client'

import { useEffect, useRef, useState } from 'react'

/** Animates a number from its previous value to `value`. Respects prefers-reduced-motion. */
export default function CountUp({
  value,
  decimals = 0,
  duration = 700,
  prefix = '',
}: {
  value: number
  decimals?: number
  duration?: number
  prefix?: string
}) {
  const [display, setDisplay] = useState(value)
  const from = useRef(0)

  useEffect(() => {
    const start = from.current
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || start === value) {
      from.current = value
      setDisplay(value)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(start + (value - start) * eased)
      if (p < 1) raf = requestAnimationFrame(step)
      else from.current = value
    }
    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      from.current = value
    }
  }, [value, duration])

  return (
    <span>
      {prefix}
      {display.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  )
}
