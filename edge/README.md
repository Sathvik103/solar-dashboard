# SolarIntel edge agent

Reads an inverter or meter and uploads interval samples to SolarIntel. Runs on a Raspberry Pi, a
mini PC, or any always-on machine on the same network as the inverter.

```
inverter / meter ──Modbus TCP──┐
MQTT broker ───────subscribe───┼─> agent ─> disk buffer ─> batched HTTPS ─> POST /api/v1/telemetry
simulator (test) ──────────────┘                (store and forward)          (idempotent on device + ts)
```

## Setup

1. Register the device in the app (**Devices → Add device**) and copy the token. It is shown once.
2. Configure and run:

```bash
cd edge
npm install
cp agent.env.example agent.env   # set SOLARINTEL_URL, DEVICE_TOKEN, SOURCE and the source settings
npm run agent
```

## Sources

| `SOURCE` | Use when | Notes |
| --- | --- | --- |
| `modbus` | Inverter or Wi-Fi stick exposes Modbus TCP (most string inverters) | Reads SunSpec model 101/103 registers: power, lifetime energy, voltage, frequency, temperature. Addresses are configurable for non-SunSpec maps. |
| `mqtt` | Readings already go to a broker (Home Assistant, Tasmota, ESP32) | JSON payloads; field names configurable, dotted paths supported (`ENERGY.Power`). |
| `simulator` | No hardware yet | Models output from live weather and keeps an energy counter. Register the device with protocol **Simulator** so the data is badged as simulated. |

## Reliability

- **Store and forward.** Every sample is written to `data/buffer.jsonl` before upload and removed only
  after the server acknowledges the batch. Network outages and restarts lose nothing (up to
  `BUFFER_MAX_SAMPLES`, oldest dropped first).
- **Idempotent uploads.** The server ignores a sample it already has for the same device and timestamp,
  so re-sending after a crash never double counts.
- **Backoff.** Failed uploads retry with exponential backoff and jitter (5 s up to 10 min). HTTP 429
  honours `Retry-After`. HTTP 401 stops uploads (token revoked or rotated) but keeps the buffer.
- **Counters over power.** Lifetime energy counters make daily totals exact even when samples are missed;
  power alone is integrated as a fallback.

## Run as a service

- **systemd:** copy `solarintel-agent.service` to `/etc/systemd/system/`, adjust `User` and
  `WorkingDirectory`, then `sudo systemctl enable --now solarintel-agent`.
- **Docker:** `docker build -t solarintel-agent . && docker run -d --restart=always --env-file agent.env -v solarintel-data:/agent/data solarintel-agent`

## Tests

```bash
npm test        # SunSpec decoding, MQTT mapping, buffer, upload classification, simulator
npm run typecheck
```
