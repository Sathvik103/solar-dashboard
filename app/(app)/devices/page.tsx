import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { listDevices, listLegacyTokens, getSamplesByDevice } from '@/lib/dal/devices'
import { requireUser } from '@/lib/dal/users'
import { energyFromSamples } from '@/lib/iot/samples'
import { istDateString } from '@/lib/dashboard/overview'
import { Page, EmptyState, fmtNum } from '@/components/layout/Page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import AddDeviceForm, { KIND_LABEL, PROTOCOL_LABEL } from '@/components/devices/AddDeviceForm'
import DeviceStatusDot, { relativeTime } from '@/components/devices/DeviceStatusDot'
import Sparkline from '@/components/devices/Sparkline'
import PipelineDiagram from '@/components/devices/PipelineDiagram'
import { revokeDeviceTokenAction } from '@/actions/devices'

export const metadata = { title: 'Devices' }

export default async function DevicesPage() {
  const user = await requireUser()
  const startOfDay = new Date(`${istDateString()}T00:00:00+05:30`).toISOString()
  const [devices, legacy, samples] = await Promise.all([
    listDevices(user.id),
    listLegacyTokens(),
    getSamplesByDevice(startOfDay, user.id),
  ])

  return (
    <Page
      title="Devices"
      description="Inverters, meters and loggers that report generation automatically. Readings arrive every few minutes and roll up into your daily energy log."
      actions={devices.length > 0 ? <AddDeviceForm /> : undefined}
    >
      {devices.length === 0 ? (
        <>
          <PipelineDiagram />
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <AddDeviceForm defaultOpen />
            <div className="space-y-3 text-[13px] text-muted-foreground">
              <p className="font-medium text-foreground">Which option fits your setup?</p>
              <p>
                <span className="text-foreground">Modbus TCP agent.</span> Most string inverters with a LAN or Wi-Fi stick
                expose SunSpec registers. A small agent on a Raspberry Pi reads them every interval.
              </p>
              <p>
                <span className="text-foreground">MQTT bridge.</span> If Home Assistant, Tasmota or an ESP32 already
                publishes readings, the bridge forwards them.
              </p>
              <p>
                <span className="text-foreground">HTTP API.</span> Anything that can make an HTTPS request can post samples
                directly.
              </p>
              <p>
                <span className="text-foreground">Simulator.</span> Generates weather-driven test data so you can try the
                pipeline before hardware arrives. Its readings are badged as simulated.
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {devices.map((d) => {
            const s = samples.get(d.id) ?? []
            const todayKwh = energyFromSamples(s) / 1000
            return (
              <Link
                key={d.id}
                href={`/devices/${d.id}`}
                className="group lift flex flex-col justify-between gap-4 rounded-lg border bg-card p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{d.name}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {KIND_LABEL[d.kind]}
                      {d.vendor ? ` · ${d.vendor}` : ''}
                      {d.model ? ` ${d.model}` : ''}
                    </p>
                  </div>
                  <DeviceStatusDot status={d.status} />
                </div>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="num text-[24px] leading-8">
                      {d.lastPowerW != null && d.status !== 'offline' ? fmtNum(d.lastPowerW / 1000, 2) : '—'}
                      <span className="ml-1 font-sans text-[12px] text-muted-foreground">kW now</span>
                    </p>
                    <p className="num text-[12px] text-muted-foreground">
                      {fmtNum(todayKwh, 2)} kWh today · {relativeTime(d.lastSeenAt)}
                    </p>
                  </div>
                  <Sparkline values={s.map((x) => Math.max(0, x.power_w ?? 0))} />
                </div>
                <div className="flex items-center justify-between border-t pt-3">
                  <Badge variant={d.protocol === 'simulator' ? 'warning' : 'outline'}>{PROTOCOL_LABEL[d.protocol]}</Badge>
                  <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground group-hover:text-foreground">
                    Details <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {legacy.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="border-b px-5 py-3">
            <p className="text-sm font-semibold">Daily-total tokens</p>
            <p className="text-[12px] text-muted-foreground">
              Older tokens that post daily totals to <code className="num">/api/telemetry</code>. Register a device for
              interval data instead.
            </p>
          </div>
          {legacy.length === 0 ? (
            <EmptyState title="None" />
          ) : (
            <ul className="divide-y">
              {legacy.map((t) => (
                <li key={t.id} className="flex items-center justify-between px-5 py-3 text-[13px]">
                  <span>
                    {t.name} <code className="num text-[12px] text-muted-foreground">{t.tokenPrefix}…</code>
                    <span className="ml-2 text-[12px] text-muted-foreground">used {relativeTime(t.lastUsedAt)}</span>
                  </span>
                  <form action={revokeDeviceTokenAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <Button type="submit" size="xs" variant="destructive">
                      Revoke
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Page>
  )
}
