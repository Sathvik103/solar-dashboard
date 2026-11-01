'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, fmtNum } from '@/components/layout/Page'
import CountUp from '@/components/motion/CountUp'
import { completeness, deviceStatus, energyFromSamples, type DeviceStatus } from '@/lib/iot/samples'
import DeviceStatusDot, { relativeTime } from './DeviceStatusDot'

type Sample = {
  ts: string
  powerW: number | null
  energyWhTotal: number | null
  voltageV: number | null
  frequencyHz: number | null
  temperatureC: number | null
}

const POLL_MS = 15_000
const AXIS = { fontSize: 11, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-plex-mono)' }

function istTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })
}

export default function LiveDevicePanel({
  deviceId,
  intervalS,
  initialSamples,
  initialLastSeen,
  dayStartIso,
}: {
  deviceId: string
  intervalS: number
  initialSamples: Sample[]
  initialLastSeen: string | null
  dayStartIso: string
}) {
  const [samples, setSamples] = useState<Sample[]>(initialSamples)
  const [lastSeen, setLastSeen] = useState(initialLastSeen)
  const [status, setStatus] = useState<DeviceStatus>(deviceStatus(initialLastSeen, intervalS))
  const [, setTick] = useState(0)
  const newest = useRef(initialSamples.at(-1)?.ts ?? dayStartIso)

  // Poll only for samples newer than the last one held; pause while the tab is hidden.
  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      if (document.hidden) return
      try {
        const res = await fetch(`/api/devices/${deviceId}/live?since=${encodeURIComponent(newest.current)}`, { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as { status: DeviceStatus; lastSeenAt: string | null; samples: Sample[] }
        if (cancelled) return
        setStatus(data.status)
        setLastSeen(data.lastSeenAt)
        if (data.samples.length) {
          newest.current = data.samples.at(-1)!.ts
          setSamples((prev) => [...prev, ...data.samples].filter((s) => s.ts >= dayStartIso))
        }
      } catch {
        // Transient network errors are retried on the next tick.
      }
    }
    const id = setInterval(() => {
      void poll()
      setTick((t) => t + 1)
    }, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [deviceId, dayStartIso])

  const latest = samples.at(-1)
  const chart = useMemo(
    () => samples.map((s) => ({ t: istTime(s.ts), kw: s.powerW != null ? Math.max(0, s.powerW) / 1000 : null })),
    [samples]
  )
  const todayKwh =
    energyFromSamples(samples.map((s) => ({ ts: s.ts, power_w: s.powerW, energy_wh_total: s.energyWhTotal }))) / 1000
  const peakKw = Math.max(0, ...samples.map((s) => (s.powerW ?? 0) / 1000))
  // Window from midnight to the newest sample (pure: no clock read during render).
  const elapsedS = Math.max(intervalS, latest ? (Date.parse(latest.ts) - Date.parse(dayStartIso)) / 1000 : intervalS)
  const quality = completeness(samples.length, elapsedS, intervalS)

  return (
    <div className="space-y-6">
      <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-card px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Power now</span>
            <DeviceStatusDot status={status} showLabel={false} />
          </div>
          <p className="num mt-1 text-[30px] leading-9">
            {latest?.powerW != null && status !== 'offline' ? <CountUp value={latest.powerW / 1000} decimals={2} /> : '—'}
            <span className="ml-1 font-sans text-[13px] text-muted-foreground">kW</span>
          </p>
          <p className="text-[12px] text-muted-foreground">Last sample {relativeTime(lastSeen)}</p>
        </div>
        <div className="bg-card px-5 py-4">
          <span className="eyebrow">Energy today</span>
          <p className="num mt-1 text-[30px] leading-9">
            <CountUp value={todayKwh} decimals={2} />
            <span className="ml-1 font-sans text-[13px] text-muted-foreground">kWh</span>
          </p>
          <p className="text-[12px] text-muted-foreground">
            {samples.some((s) => s.energyWhTotal != null) ? 'From the lifetime counter' : 'Integrated from power'}
          </p>
        </div>
        <div className="bg-card px-5 py-4">
          <span className="eyebrow">Peak today</span>
          <p className="num mt-1 text-[30px] leading-9">
            <CountUp value={peakKw} decimals={2} />
            <span className="ml-1 font-sans text-[13px] text-muted-foreground">kW</span>
          </p>
          <p className="text-[12px] text-muted-foreground">{samples.length} samples received</p>
        </div>
        <div className="bg-card px-5 py-4">
          <span className="eyebrow">Data completeness</span>
          <p className="num mt-1 text-[30px] leading-9">
            <CountUp value={quality * 100} decimals={0} />
            <span className="ml-1 font-sans text-[13px] text-muted-foreground">%</span>
          </p>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-[width] duration-700" style={{ width: `${quality * 100}%` }} />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Power today</CardTitle>
            <CardDescription>Updates every 15 seconds while this page is open.</CardDescription>
          </div>
          {latest && (
            <div className="num flex gap-4 text-[12px] text-muted-foreground">
              {latest.voltageV != null && <span>{fmtNum(latest.voltageV, 0)} V</span>}
              {latest.frequencyHz != null && <span>{fmtNum(latest.frequencyHz, 2)} Hz</span>}
              {latest.temperatureC != null && <span>{fmtNum(latest.temperatureC, 0)} °C</span>}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {chart.length < 2 ? (
            <EmptyState title="No samples today yet">Follow the setup guide below; the chart fills in as samples arrive.</EmptyState>
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="t" tick={AXIS} tickLine={false} axisLine={false} minTickGap={40} />
                  <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} unit=" kW" />
                  <Tooltip
                    contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                    formatter={(v) => [`${Number(v).toFixed(2)} kW`, 'Power']}
                  />
                  <Area
                    type="monotone"
                    dataKey="kw"
                    stroke="var(--chart-1)"
                    strokeWidth={1.75}
                    fill="var(--chart-1)"
                    fillOpacity={0.12}
                    connectNulls
                    animationDuration={700}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
