'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

type Tab = 'http' | 'modbus' | 'mqtt' | 'simulator'

const TABS: { id: Tab; label: string }[] = [
  { id: 'modbus', label: 'Modbus agent' },
  { id: 'mqtt', label: 'MQTT bridge' },
  { id: 'http', label: 'HTTP API' },
  { id: 'simulator', label: 'Simulator' },
]

function Code({ children }: { children: string }) {
  return (
    <pre className="num overflow-x-auto rounded-md border bg-background p-4 text-[12px] leading-5 text-foreground">{children}</pre>
  )
}

export default function ConnectionGuide({
  appUrl,
  tokenPrefix,
  intervalS,
  defaultTab = 'modbus',
}: {
  appUrl: string
  tokenPrefix: string | null
  intervalS: number
  defaultTab?: Tab
}) {
  const [tab, setTab] = useState<Tab>(defaultTab)
  const token = tokenPrefix ? `${tokenPrefix}…  (the token you copied)` : 'sdt_…'

  return (
    <div className="rounded-lg border bg-card">
      <div role="tablist" aria-label="Connection method" className="flex gap-1 overflow-x-auto border-b px-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              '-mb-px border-b-2 px-2.5 py-3 text-[13px] whitespace-nowrap transition-colors',
              tab === t.id ? 'border-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div key={tab} className="animate-in-up space-y-4 p-5 text-[13px]">
        {tab === 'modbus' && (
          <>
            <p className="text-muted-foreground">
              Runs on a Raspberry Pi or any always-on machine on the same network as the inverter. It reads the SunSpec
              inverter model over Modbus TCP every {intervalS} s, buffers readings to disk while offline, and uploads them in
              batches. Register addresses are configurable for inverters that do not follow SunSpec.
            </p>
            <Code>{`cd edge && npm install
cp agent.env.example agent.env   # then edit:

SOLARINTEL_URL=${appUrl}
DEVICE_TOKEN=${token}
SOURCE=modbus
MODBUS_HOST=192.168.1.50          # inverter or Wi-Fi stick IP
MODBUS_PORT=502
MODBUS_UNIT_ID=1
INTERVAL_SECONDS=${intervalS}

npm run agent`}</Code>
            <p className="text-[12px] text-muted-foreground">
              Run it as a service with <code className="num">systemd</code> or Docker (see <code className="num">edge/README.md</code>).
            </p>
          </>
        )}

        {tab === 'mqtt' && (
          <>
            <p className="text-muted-foreground">
              Use this when readings are already published to an MQTT broker (Home Assistant, Tasmota, an ESP32). The bridge
              subscribes, converts each message to a sample, and forwards batches to the ingest API.
            </p>
            <Code>{`# edge/agent.env
SOLARINTEL_URL=${appUrl}
DEVICE_TOKEN=${token}
SOURCE=mqtt
MQTT_URL=mqtt://192.168.1.10:1883
MQTT_TOPIC=home/solar/inverter     # JSON payloads
# Field names in the payload, if they differ from the defaults:
MQTT_POWER_FIELD=power_w
MQTT_ENERGY_FIELD=energy_wh_total

npm run agent`}</Code>
            <p className="text-[12px] text-muted-foreground">
              Expected payload: <code className="num">{`{"power_w": 3120, "energy_wh_total": 1834520}`}</code>. A timestamp field is
              optional; the receive time is used otherwise.
            </p>
          </>
        )}

        {tab === 'http' && (
          <>
            <p className="text-muted-foreground">
              Post up to 1,000 samples per request. Timestamps need a timezone. Resending a sample with the same timestamp is
              ignored, so retries are safe.
            </p>
            <Code>{`curl -X POST ${appUrl}/api/v1/telemetry \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "samples": [
      { "ts": "2026-11-01T12:00:00+05:30", "power_w": 3120, "energy_wh_total": 1834520,
        "voltage_v": 231.4, "frequency_hz": 50.01, "temperature_c": 41 }
    ]
  }'`}</Code>
            <Code>{`HTTP/1.1 202 Accepted
RateLimit-Limit: 120
RateLimit-Remaining: 119

{ "received": 1, "accepted": 1, "duplicates": 0, "rejected": 0, "days_updated": 1 }`}</Code>
            <dl className="grid gap-x-6 gap-y-1.5 text-[12px] sm:grid-cols-2">
              {[
                ['ts', 'ISO-8601 with offset (required)'],
                ['power_w', 'Instantaneous AC output, W'],
                ['energy_wh_total', 'Lifetime generation counter, Wh (preferred)'],
                ['import_wh_total / export_wh_total', 'Meter counters, Wh'],
                ['voltage_v, frequency_hz, temperature_c', 'Optional diagnostics'],
                ['status', 'Optional device state string'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="num text-foreground">{k}</dt>
                  <dd className="text-muted-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </>
        )}

        {tab === 'simulator' && (
          <>
            <p className="text-muted-foreground">
              For testing the pipeline without hardware. It models a panel array from live weather at your location and posts
              samples like a real device. Register the device with the Simulator protocol so its data is clearly badged.
            </p>
            <Code>{`# edge/agent.env
SOLARINTEL_URL=${appUrl}
DEVICE_TOKEN=${token}
SOURCE=simulator
SIM_CAPACITY_KW=3
SIM_LATITUDE=17.385
SIM_LONGITUDE=78.4867

npm run agent`}</Code>
          </>
        )}
      </div>
    </div>
  )
}
