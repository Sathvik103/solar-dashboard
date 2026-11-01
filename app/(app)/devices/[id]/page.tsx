import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getDevice, getDeviceSamples } from '@/lib/dal/devices'
import { energyFromSamples } from '@/lib/iot/samples'
import { istDateString } from '@/lib/dashboard/overview'
import { Page, fmtNum } from '@/components/layout/Page'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import LiveDevicePanel from '@/components/devices/LiveDevicePanel'
import ConnectionGuide from '@/components/devices/ConnectionGuide'
import DeviceControls from '@/components/devices/DeviceControls'
import DeviceStatusDot from '@/components/devices/DeviceStatusDot'
import { KIND_LABEL, PROTOCOL_LABEL } from '@/components/devices/AddDeviceForm'
import { DailyBars } from '@/components/charts/EnergyCharts'

export const metadata = { title: 'Device' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function DevicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) redirect('/devices')
  const device = await getDevice(id)
  if (!device) notFound()

  const today = istDateString()
  const dayStart = new Date(`${today}T00:00:00+05:30`)
  const weekStart = new Date(dayStart.getTime() - 7 * 86400_000)
  const samples = await getDeviceSamples(id, weekStart.toISOString(), 5000)

  // Seven local days of energy, each using the previous day's last counter as its baseline.
  const days = Array.from({ length: 7 }, (_, i) => {
    const start = new Date(dayStart.getTime() - (6 - i) * 86400_000)
    const end = new Date(start.getTime() + 86400_000)
    const inDay = samples.filter((s) => Date.parse(s.ts) >= start.getTime() && Date.parse(s.ts) < end.getTime())
    const before = samples.filter((s) => Date.parse(s.ts) < start.getTime() && s.energyWhTotal != null).at(-1)
    const kwh = inDay.length
      ? energyFromSamples(
          inDay.map((s) => ({ ts: s.ts, power_w: s.powerW, energy_wh_total: s.energyWhTotal })),
          before?.energyWhTotal ?? null
        ) / 1000
      : null
    return { date: istDateString(start), value: kwh }
  })
  const todaySamples = samples.filter((s) => Date.parse(s.ts) >= dayStart.getTime())
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.example'

  return (
    <Page
      title={device.name}
      description={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <DeviceStatusDot status={device.status} />
          <span>{KIND_LABEL[device.kind]}</span>
          {(device.vendor || device.model) && <span>{[device.vendor, device.model].filter(Boolean).join(' ')}</span>}
          {device.capacityKw && <span className="num">{fmtNum(device.capacityKw, 1)} kW rated</span>}
          <Badge variant={device.protocol === 'simulator' ? 'warning' : 'outline'}>{PROTOCOL_LABEL[device.protocol]}</Badge>
        </span>
      }
      actions={
        <Link href="/devices" className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> All devices
        </Link>
      }
    >
      <LiveDevicePanel
        deviceId={device.id}
        intervalS={device.reportingIntervalS}
        initialSamples={todaySamples}
        initialLastSeen={device.lastSeenAt}
        dayStartIso={dayStart.toISOString()}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Last 7 days</CardTitle>
              <CardDescription>Energy per day from this device. Days without samples are blank.</CardDescription>
            </div>
            <span className="num text-[13px] text-muted-foreground">
              {fmtNum(days.reduce((a, d) => a + (d.value ?? 0), 0), 1)} kWh
            </span>
          </CardHeader>
          <CardContent>
            <DailyBars data={days} unit="kWh" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Device</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="divide-y text-[13px]">
              {[
                ['Reporting interval', `${device.reportingIntervalS} s`],
                ['Serial', device.serialNumber ?? '—'],
                ['Token', device.token ? `${device.token.prefix}…` : 'None'],
                ['Registered', new Date(device.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2 first:pt-0">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="num text-right">{v}</dd>
                </div>
              ))}
            </dl>
            <DeviceControls deviceId={device.id} name={device.name} />
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Connect this device</h2>
          <p className="text-[13px] text-muted-foreground">
            Pick the method that matches your hardware. Every method ends at the same ingest API.
          </p>
        </div>
        <ConnectionGuide
          appUrl={appUrl}
          tokenPrefix={device.token?.prefix ?? null}
          intervalS={device.reportingIntervalS}
          defaultTab={
            device.protocol === 'mqtt' ? 'mqtt' : device.protocol === 'http' ? 'http' : device.protocol === 'simulator' ? 'simulator' : 'modbus'
          }
        />
      </section>
    </Page>
  )
}
