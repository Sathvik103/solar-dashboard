# Rate limiting

All limits live in `lib/rate-limit/index.ts` (`POLICIES`). Route handlers call
`enforce(policy, subject)` and return `tooManyRequests(result)` when blocked.

| Policy | Subject | Limit |
| --- | --- | --- |
| `chat` | user id | 20 / minute |
| `telemetry` | device token hash | 120 / minute |
| `telemetryDaily` | token hash | 60 / minute |
| `deviceLive` | user id | 60 / minute |
| `knowledgeSearch` | user id | 30 / minute |
| `evaluation` | user id | 3 / 10 minutes |
| `auth` | client IP | 10 / 15 minutes |

Responses carry `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` and, when blocked,
`Retry-After`. The edge agent honours `Retry-After`.

## Algorithms (`lib/rate-limit/core.ts`)

- **Sliding-window log, in memory.** Exact; memory grows with requests; per process only. Used locally and
  as the fallback when Redis is down.
- **Fixed-window counter, Redis (Upstash REST).** One `INCR` + `EXPIRE` per request, shared by every
  instance. Can allow up to twice the limit across a window boundary. Enabled by setting
  `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

## Exercises for later

1. Implement a **sliding-window counter** in Redis (weighted current + previous window) and compare its
   burst behaviour with the fixed window in a test.
2. Implement a **token bucket** with a Lua script for smooth device ingestion.
3. Move enforcement for API routes into `proxy.ts` so blocked requests never reach the handler.
4. Add per-plan limits (free vs paid) by reading the user's plan in `enforce`.
5. Emit a metric for every block and chart it.

The language-model budget (`lib/agent/budget.ts`, `LLM_DAILY_LIMIT`) is separate: rate limits stop
bursts, the budget caps daily spend.
