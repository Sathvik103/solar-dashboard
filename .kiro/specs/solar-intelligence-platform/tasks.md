# Implementation Plan: Solar Intelligence Platform — Phase 1 & Phase 2

## Overview

This plan converts the existing static Next.js solar dashboard into a properly structured, authenticated multi-user platform. It is divided into two phases:

- **Phase 1** — Architecture & Foundation: clean folder structure, route groups, calculation refactor, dependency setup, stub infrastructure.
- **Phase 2** — Authentication + Solar Profile: Supabase Auth, database schema, DAL, server actions, protected routes.

No RAG, LLM, AI Advisor, Simulator, or ML tasks are included. All tasks are coding tasks only.

---

## Tasks

- [ ] 1. Install new dependencies and configure test runner (Phase 1)
  - [ ] 1.1 Add production and dev dependencies
    - In `package.json`, add to `dependencies`: `@supabase/ssr`, `@supabase/supabase-js`, `zod`
    - Add to `devDependencies`: `vitest`, `@vitest/coverage-v8`, `fast-check`, `@vitest/ui` (optional)
    - Do **not** remove `@react-three/fiber`, `@react-three/drei`, or `three`
    - Run `npm install` to lock new versions
    - _Requirements: Req 6.1, Req 6.2, Req 6.3, Req 6.4_

  - [ ] 1.2 Create `vitest.config.ts` at project root
    - Configure vitest with `environment: 'node'`, `include: ['**/*.test.ts']`, and coverage provider `v8`
    - Add `"test": "vitest --run"` script to `package.json`
    - _Requirements: Req 6.3_

- [ ] 2. Refactor calculation engine (Phase 1)
  - [ ] 2.1 Create `lib/calculations/solar.ts` from `lib/calculations.ts`
    - Copy all exports (`ROIInput`, `ROIResult`, `BreakevenDataPoint`, `calculateROI`, `generateBreakevenCurves`) verbatim into the new file — preserve every function signature exactly
    - Ensure `generateBreakevenCurves` accepts a `panels` parameter (it already does in the current implementation — verify and document this explicitly with a JSDoc comment)
    - Do **not** import `panelTypes` from `lib/solarData.ts` inside this module
    - Export all types and functions as named exports
    - _Requirements: Req 3.1, Req 3.2, Req 3.3, Req 3.4, Req 3.5, Req 3.7_

  - [ ]* 2.2 Write property-based tests for `lib/calculations/solar.ts`
    - Create `lib/calculations/solar.test.ts`
    - Use `vitest` as test runner and `fast-check` for property generation
    - **Property 1: Solar generation is non-negative** — for all positive `panels`, `wattage`, `sunHours`, `calculateROI` must return `dailyGeneration >= 0`. **Validates: Req 3.1**
    - **Property 2: Daily savings equal generation × tariff** — for any `dailyGeneration >= 0` and `tariff > 0`, `dailySavings === dailyGeneration * tariff` to within ±0.01. **Validates: Req 3.2**
    - **Property 3: Breakeven decreases monotonically with higher savings** — for fixed investment, a higher `electricityRate` must produce `breakEvenMonths` ≤ the result for a lower rate. **Validates: Req 3.3**
    - **Property 4: Net position at breakeven month approximates zero** — cumulative net position at `breakEvenMonths` must be within ±(one month's savings) of zero. **Validates: Req 3.4**
    - Run with `npm test` and confirm all properties pass
    - _Requirements: Req 3.1, Req 3.2, Req 3.3, Req 3.4_

  - [ ] 2.3 Create `lib/calculations/financial.ts` skeleton
    - Define and export types: `NPVInput`, `NPVResult`, `SavingsProjection`, `SubsidyAdjustment`
    - Export stub functions with correct TypeScript signatures and a `// TODO: Phase 5 implementation` comment: `calculateNPV(input: NPVInput): NPVResult`, `calculate25YearSavings(input: SavingsProjection): number`, `adjustForSubsidy(grossCost: number, subsidyRate: number): number`
    - _Requirements: Req 3.6_

- [ ] 3. Move API routes into App Router (Phase 1)
  - [ ] 3.1 Create `app/api/dashboard/route.ts`
    - Copy the handler body from `api/dashboard/route.ts` exactly — `GET` returns `generateDashboardData()` via `Response.json()`
    - Verify the import path for `lib/solarData` resolves correctly from the new location
    - _Requirements: Req 1.3, Req 1.4, Req 20.3_

  - [ ] 3.2 Create `app/api/history/route.ts`
    - Copy the handler body from `api/history/route.ts` exactly — `GET` returns `generateHistoryData()` via `Response.json()`
    - _Requirements: Req 1.3, Req 1.4_

  - [ ] 3.3 Create `app/api/health/route.ts`
    - Export `async function GET()` that returns `Response.json({ status: 'ok', timestamp: new Date().toISOString() })` with HTTP 200
    - No authentication required
    - _Requirements: Req 19.1, Req 19.2, Req 19.3_

  - [ ] 3.4 Delete `api/` root-level directory
    - Delete `api/dashboard/route.ts`, `api/history/route.ts`, and the `api/` directory itself
    - Verify the new `app/api/` routes respond correctly before deleting
    - _Requirements: Req 1.3, Req 1.4_

- [ ] 4. Move components to new subdirectories (Phase 1)
  - [ ] 4.1 Move chart components to `components/charts/`
    - Move `components/OutputChart.tsx` → `components/charts/OutputChart.tsx`
    - Move `components/BreakevenChart.tsx` → `components/charts/BreakevenChart.tsx`
    - In `components/charts/BreakevenChart.tsx`, update the import of `generateBreakevenCurves` from `@/lib/calculations` → `@/lib/calculations/solar`
    - `panelTypes` import from `@/lib/solarData` stays — the chart still uses the static demo array as a prop source (this is acceptable in Phase 1; the chart component itself already passes it as an argument, not hardcoded inside the function)
    - _Requirements: Req 1.5_

  - [ ] 4.2 Move layout components to `components/layout/`
    - Move `components/Navbar.tsx` → `components/layout/Navbar.tsx`
    - Move `components/PageWrapper.tsx` → `components/layout/PageWrapper.tsx`
    - No changes to these files' logic — preserve all existing behavior
    - _Requirements: Req 1.6_

- [ ] 5. Create route groups and move pages (Phase 1)
  - [ ] 5.1 Create `app/(public)/layout.tsx`
    - Server Component (no `'use client'`)
    - Imports and renders `Navbar` from `@/components/layout/Navbar`
    - Wraps `{children}` — provides the public navigation shell for home, login, signup pages
    - _Requirements: Req 1.1, Req 1.9_

  - [ ] 5.2 Move home page to `app/(public)/page.tsx`
    - Move `app/page.tsx` → `app/(public)/page.tsx`
    - No content changes — preserve all existing JSX and imports
    - Update any import paths broken by the move (e.g., `HomeComponents`, `Button`, `Badge` — verify all resolve correctly)
    - _Requirements: Req 1.1_

  - [ ] 5.3 Create `app/(app)/layout.tsx` shell (Phase 1 version — no auth yet)
    - Server Component (no `'use client'`)
    - In Phase 1: renders `{children}` with a basic layout wrapper (no auth check yet — that is added in Phase 2, Task 15.2)
    - Include a `TODO: Phase 2 — add requireUser() call here` comment
    - _Requirements: Req 1.2, Req 1.10_

  - [ ] 5.4 Move authenticated pages into `app/(app)/`
    - Move `app/dashboard/page.tsx` → `app/(app)/dashboard/page.tsx`
    - Move `app/calculator/page.tsx` → `app/(app)/calculator/page.tsx`
    - Move `app/history/page.tsx` → `app/(app)/history/page.tsx`
    - Update all import paths inside each moved page (charts, components, lib) to resolve correctly from the new location — use `@/` alias paths which are root-relative and should be unaffected by the move, but verify each import
    - _Requirements: Req 1.2_

- [ ] 6. Fix Server Component boundary on dashboard page (Phase 1)
  - [ ] 6.1 Remove `motion` import from `app/(app)/dashboard/page.tsx`
    - `app/(app)/dashboard/page.tsx` currently imports `motion` from `framer-motion` directly at the page level — this forces the page into the client bundle
    - Remove the direct `motion` import from the page file
    - The page already uses `AnimatedCard` and `AnimatedContainer` from `components/AnimatedCard.tsx` which are `'use client'` components — keep using those
    - Verify the page has **no** `'use client'` directive at the top
    - The page must remain an `async` function (Server Component) that calls `generateDashboardData()` directly
    - _Requirements: Req 5.1, Req 5.2, Req 5.3, Req 20.1_

  - [ ] 6.2 Update `app/(app)/dashboard/page.tsx` chart import path
    - Update `import OutputChart from '@/components/OutputChart'` → `import OutputChart from '@/components/charts/OutputChart'`
    - _Requirements: Req 5.1, Req 20.1_

  - [ ] 6.3 Update `app/(app)/calculator/page.tsx` import path for `BreakevenChart`
    - Update `import BreakevenChart from '@/components/BreakevenChart'` → `import BreakevenChart from '@/components/charts/BreakevenChart'`
    - Update `import { calculateROI, ROIInput, ROIResult } from '@/lib/calculations'` → `import { calculateROI, ROIInput, ROIResult } from '@/lib/calculations/solar'`
    - _Requirements: Req 3.5_

  - [ ] 6.4 Update `app/(app)/history/page.tsx` import path for `PageWrapper`
    - Update `import PageWrapper from '@/components/PageWrapper'` → `import PageWrapper from '@/components/layout/PageWrapper'`
    - _Requirements: Req 1.6_

- [ ] 7. Update root layout (Phase 1)
  - [ ] 7.1 Remove `Navbar` import from `app/layout.tsx`
    - Delete the `import Navbar from '@/components/Navbar'` line and the `<Navbar />` JSX element from the root layout
    - The root layout renders only `{children}` inside `<body>` (plus font classnames)
    - Navbar is now owned by `app/(public)/layout.tsx`
    - _Requirements: Req 1.9_

- [ ] 8. Create stub middleware and environment template (Phase 1)
  - [ ] 8.1 Create `middleware.ts` at project root
    - Export `async function middleware(request: NextRequest)` that calls `NextResponse.next()` and returns immediately — no-op pass-through
    - Export `const config = { matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] }`
    - Import `NextResponse` from `'next/server'` and `NextRequest` from `'next/server'`
    - Add comment: `// Phase 1: no-op stub. Phase 2: full Supabase SSR session refresh + route protection`
    - _Requirements: Req 18.1, Req 18.2_

  - [ ] 8.2 Create `.env.example` at project root
    - Include all variables from design Part 12: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `SUPABASE_SERVICE_ROLE_KEY` (with comment: `# Server only — bypasses RLS — Phase 3+ admin ops only`), and commented-out `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`
    - All values must be empty strings
    - _Requirements: Req 2.3, Req 4.6_

- [ ] 9. Create type definitions and mark mock data (Phase 1)
  - [ ] 9.1 Create `lib/types/user.ts`
    - Export `User`, `SolarProfile`, `SolarProfileInput`, `RoofType`, `RoofOrientation`, `ShadingLevel`, `BatteryPreference` types exactly as specified in design Part 7
    - _Requirements: Req 12.1, Req 13.1_

  - [ ] 9.2 Mark `lib/solarData.ts` as mock/demo data
    - Add a JSDoc/block comment at the top of the file: `/** MOCK DATA — Phase 1 static demo only. Not a source of truth. Real per-user data will come from public.solar_profiles (Phase 2+). TSSPDCL tariff values (₹8/kWh, ₹3.5/unit net metering) are interim constants and will be replaced by knowledge-base data in Phase 3. */`
    - Extract the hardcoded tariff constants to named exports: `export const DEMO_TARIFF_INR_PER_KWH = 8` and `export const DEMO_NET_METERING_RATE_INR = 3.5`
    - Update the two places inside `solarData.ts` that use these magic numbers to reference the named constants
    - _Requirements: Req 20.2, Req 22.1, Req 22.4_

- [ ] 10. Create documentation files (Phase 1)
  - [ ] 10.1 Create `docs/architecture.md`
    - Describe the four-layer architecture: presentation (Next.js App Router pages/components), action (Server Actions in `actions/`), DAL (`lib/dal/` — server-only), infrastructure (Supabase Auth + PostgreSQL)
    - Document the two Supabase client types: SSR_Server_Client (`lib/db/client.ts` — anon key + cookies, RLS in effect) vs Admin_Server_Client (`lib/db/admin-client.ts` — service-role key, Phase 3+ only, never used in user request path)
    - _Requirements: Req 2.1_

  - [ ] 10.2 Create `docs/database.md`
    - Document the Phase 2 schema in full (SQL DDL for `public.users`, `public.solar_profiles`, triggers, RLS policies — copy from design Part 6)
    - List future Phase 3+ tables (`documents`, `document_chunks`, `conversations`, `messages`, `solar_projects`, `simulation_runs`, `predictions`) at a high level without full DDL
    - Note that TSSPDCL tariff and net-metering rates are interim hardcoded constants that will be moved to the `documents` table in Phase 3
    - _Requirements: Req 2.2, Req 22.2_

  - [ ] 10.3 Create `docs/ai-rag-architecture.md`
    - Placeholder file with a note that embedding model, vector dimension, chunk size, overlap, indexing strategy (IVFFlat vs HNSW), and retrieval configuration are all deferred to Phase 3 and must not be finalised before that phase begins
    - _Requirements: Req 2.4_

- [ ] 11. Create error boundary for authenticated pages (Phase 1)
  - [ ] 11.1 Create `app/(app)/error.tsx`
    - `'use client'` directive required (error boundaries must be Client Components)
    - Export default component with props `{ error: Error & { digest?: string }, unstable_retry: () => void }` — use `unstable_retry` (not `reset`) per Next.js 16 API
    - Render a user-friendly error message and a "Try again" button that calls `unstable_retry()`
    - _Requirements: Req 21.1, Req 21.2_

- [ ] 12. Checkpoint — Phase 1 complete
  - Ensure `npm run build` succeeds with zero TypeScript errors
  - Ensure `npm test` runs and all property tests pass
  - Verify `/dashboard`, `/calculator`, and `/history` pages render identically to before the refactor
  - Verify `/api/health` returns `{ status: 'ok', timestamp: '...' }`
  - Ensure all tests pass, ask the user if questions arise.

---

- [ ] 13. Create Supabase client modules (Phase 2)
  - [ ] 13.1 Create `lib/db/client.ts`
    - Add `import 'server-only'` as the first line
    - Export `async function createSupabaseServerClient()` that calls `createServerClient` from `@supabase/ssr`
    - Pass `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the request's cookies via `await cookies()` from `next/headers`
    - Return a typed client using `Database` from `@/lib/types/supabase`
    - Throw a descriptive error at module load time if `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing
    - Do NOT use `SUPABASE_SERVICE_ROLE_KEY` here
    - _Requirements: Req 16.1, Req 4.3, Req 4.7_

  - [ ] 13.2 Create `lib/db/supabase-browser.ts`
    - Export `function createSupabaseBrowserClient()` that calls `createBrowserClient` from `@supabase/ssr`
    - Pass `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - Return typed client using `Database` from `@/lib/types/supabase`
    - No `import 'server-only'` — this file runs in the browser
    - _Requirements: Req 16.2_

  - [ ] 13.3 Create `lib/types/supabase.ts`
    - Create a placeholder `Database` type scaffold matching the `public.users` and `public.solar_profiles` tables from design Part 6
    - Add comment: `// Generated via: supabase gen types typescript --project-id <project-id>. Re-run after schema changes.`
    - Provide typed row definitions for `users` and `solar_profiles` tables so all Supabase queries are fully typed
    - _Requirements: Req 16.5_

- [ ] 14. Create auth session utilities and DAL (Phase 2)
  - [ ] 14.1 Create `lib/auth/session.ts`
    - Add `import 'server-only'`
    - Export `async function getCurrentUser(): Promise<User | null>` — calls `createSupabaseServerClient()`, then `supabase.auth.getUser()` (not `getSession()`), returns mapped `User` DTO or `null` if no session
    - Export `async function requireUser(): Promise<User>` — calls `getCurrentUser()`, throws `new Error('Unauthorized')` if result is `null`
    - _Requirements: Req 11.1, Req 10.5_

  - [ ] 14.2 Create `lib/dal/users.ts`
    - Add `import 'server-only'` as the first line
    - Export `async function getCurrentUser(): Promise<User | null>` — delegates to `lib/auth/session.ts`
    - Export `async function requireUser(): Promise<User>` — delegates to `lib/auth/session.ts`
    - Both functions use SSR_Server_Client (cookie-based, anon key + RLS) — not service-role
    - Return `null` (not throw) when no session is found in `getCurrentUser`
    - _Requirements: Req 17.1, Req 17.3, Req 17.4_

  - [ ] 14.3 Create `lib/dal/solar-profiles.ts`
    - Add `import 'server-only'` as the first line
    - Export `async function getSolarProfile(userId: string): Promise<SolarProfile | null>` — queries `public.solar_profiles` where `user_id = userId` via SSR_Server_Client; returns mapped `SolarProfile` DTO or `null`; wraps errors in application-level errors (never exposes raw Supabase error messages)
    - Export `async function upsertSolarProfile(userId: string, data: SolarProfileInput): Promise<SolarProfile>` — verifies `userId` matches authenticated session user (throw `Error('Unauthorized')` if mismatch); performs `INSERT ... ON CONFLICT (user_id) DO UPDATE SET ...`; returns the updated row
    - _Requirements: Req 17.2, Req 17.5, Req 17.6, Req 17.7_

- [ ] 15. Create Zod validation schema (Phase 2)
  - [ ] 15.1 Create `lib/validations/solar-profile.ts`
    - Implement `SolarProfileSchema` exactly as specified in design Part 10 using `zod`
    - All numeric fields use `z.coerce.number({ invalid_type_error: 'Must be a number' })`
    - `pincode` validated with `/^\d{6}$/`
    - `electricityTariffInr` constrained to `min(1).max(20)`
    - `roofAreaSqft` constrained to `positive().max(10000)`
    - `preferredCapacityKw` constrained to `positive().max(500)`
    - `batteryPreference` defaults to `'no-battery'`
    - Export `SolarProfileSchema` and `SolarProfileInput = z.infer<typeof SolarProfileSchema>`
    - _Requirements: Req 15.1, Req 15.2, Req 15.3, Req 15.4, Req 15.5, Req 15.6, Req 15.7, Req 15.8_

- [ ] 16. Create database migrations (Phase 2)
  - [ ] 16.1 Create `supabase/migrations/001_create_users.sql`
    - Full SQL from design Part 6: `CREATE TABLE public.users (...)`, `handle_new_user()` function, `on_auth_user_created` trigger, `set_updated_at()` function, `set_users_updated_at` trigger, `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, `users_select_own` policy, `users_update_own` policy
    - _Requirements: Req 12.1, Req 12.2, Req 12.3, Req 12.4, Req 12.5, Req 12.6_

  - [ ] 16.2 Create `supabase/migrations/002_create_solar_profiles.sql`
    - Full SQL from design Part 6: `CREATE TABLE public.solar_profiles (...)`, all `ADD CONSTRAINT chk_*` statements, `set_solar_profiles_updated_at` trigger, `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, all four RLS policies (`solar_profiles_select_own`, `solar_profiles_insert_own`, `solar_profiles_update_own`, `solar_profiles_delete_own`)
    - Add comment on `electricity_tariff_inr` column: `-- User-entered convenience field for Phase 2. NOT authoritative. Will be superseded by knowledge-base tariff data in Phase 3+.`
    - _Requirements: Req 13.1, Req 13.2, Req 13.3, Req 13.4, Req 13.5, Req 13.6, Req 13.7, Req 13.8, Req 13.9, Req 13.10_

- [ ] 17. Create Server Actions (Phase 2)
  - [ ] 17.1 Create `actions/auth.ts`
    - Add `'use server'` directive
    - Export `AuthActionState` type: `{ errors?: { email?: string[], password?: string[], fullName?: string[], general?: string[] }, success?: boolean }`
    - Export `async function signUpAction(state: AuthActionState, formData: FormData): Promise<AuthActionState>`
      - Validate `full_name` (≥2 chars), `email` (valid email), `password` (≥8 chars) with Zod
      - On validation failure: return `{ errors: fieldErrors }` without calling Supabase
      - On success: call `supabase.auth.signUp({ email, password, options: { data: { full_name } } })`
      - If email already registered: return `{ errors: { general: ['An account with this email already exists'] } }`
      - On success: `redirect('/dashboard')`
    - Export `async function logInAction(state: AuthActionState, formData: FormData): Promise<AuthActionState>`
      - Validate non-empty email and password
      - Call `supabase.auth.signInWithPassword({ email, password })`
      - On error: return `{ errors: { general: ['Invalid email or password'] } }`
      - On success: redirect to `?redirect=` param if present, else `/dashboard`
    - Export `async function logOutAction(): Promise<void>`
      - Call `supabase.auth.signOut()` — clears HttpOnly session cookies
      - `redirect('/')`
    - _Requirements: Req 7.1, Req 7.2, Req 7.3, Req 7.4, Req 7.5, Req 7.6, Req 8.1, Req 8.2, Req 8.3, Req 8.4, Req 9.1, Req 9.2, Req 9.3_

  - [ ] 17.2 Create `actions/solar-profile.ts`
    - Add `'use server'` directive
    - Export `ProfileActionState` type: `{ errors?: Partial<Record<keyof SolarProfileInput, string[]>> & { general?: string[] }, success?: boolean }`
    - Export `async function upsertSolarProfileAction(state: ProfileActionState, formData: FormData): Promise<ProfileActionState>`
      - First operation: call `requireUser()` from `lib/auth/session.ts`; if it throws, return `{ errors: { general: ['Unauthorized'] } }`
      - Validate `formData` with `SolarProfileSchema.safeParse()` — on failure return `{ errors: fieldErrors }`
      - Call `dal/solar-profiles.upsertSolarProfile(user.id, validatedData)`
      - On success: call `revalidatePath('/profile')`, return `{ success: true }`
      - On DB error: return `{ errors: { general: ['Failed to save profile. Please try again.'] } }` — never surface raw error details
    - _Requirements: Req 11.2, Req 11.3, Req 14.4, Req 14.5, Req 14.6, Req 14.7, Req 14.8_

- [ ] 18. Create public auth pages (Phase 2)
  - [ ] 18.1 Create `app/(public)/login/page.tsx`
    - Server Component (no `'use client'`)
    - Renders the page shell (heading, card wrapper) and imports `LoginForm` from `./_components/LoginForm`
    - _Requirements: Req 8.1_

  - [ ] 18.2 Create `app/(public)/login/_components/LoginForm.tsx`
    - `'use client'` directive
    - Use `useActionState(logInAction, undefined)` from `react`
    - Form fields: `email` (type="email"), `password` (type="password")
    - Display field-level error messages inline from `state.errors`
    - Submit button disabled while pending
    - _Requirements: Req 8.1, Req 8.2, Req 8.3, Req 8.4_

  - [ ] 18.3 Create `app/(public)/signup/page.tsx`
    - Server Component (no `'use client'`)
    - Renders page shell and imports `SignupForm` from `./_components/SignupForm`
    - _Requirements: Req 7.1_

  - [ ] 18.4 Create `app/(public)/signup/_components/SignupForm.tsx`
    - `'use client'` directive
    - Use `useActionState(signUpAction, undefined)` from `react`
    - Form fields: `full_name`, `email` (type="email"), `password` (type="password")
    - Display field-level error messages inline from `state.errors`
    - Submit button disabled while pending
    - _Requirements: Req 7.1, Req 7.2, Req 7.3, Req 7.5, Req 7.6_

- [ ] 19. Create authenticated profile page and form (Phase 2)
  - [ ] 19.1 Create `app/(app)/profile/page.tsx`
    - Server Component (no `'use client'`)
    - Call `requireUser()` from `lib/dal/users.ts` to get authenticated user
    - Call `getSolarProfile(user.id)` from `lib/dal/solar-profiles.ts`
    - Pass `existingProfile` and `userId` as props to `SolarProfileForm`
    - _Requirements: Req 14.1, Req 14.2_

  - [ ] 19.2 Create `app/(app)/profile/_components/SolarProfileForm.tsx`
    - `'use client'` directive
    - Props: `{ existingProfile: SolarProfile | null }`
    - Use `useActionState(upsertSolarProfileAction, undefined)` from `react`
    - Group fields into four sections: Location (city, state, district, pincode), Electricity Consumption (monthly_bill_inr, monthly_units_kwh, electricity_tariff_inr), Roof Details (roof_area_sqft, roof_type select, roof_orientation select, shading_level select), System Preferences (budget_inr, preferred_capacity_kw, battery_preference radio group)
    - Pre-fill fields from `existingProfile` if provided; city defaults to "Hyderabad", state defaults to "Telangana"
    - Display field-level errors inline from `state.errors`
    - Display success indication when `state.success === true`
    - Add comment on electricity_tariff_inr field label: "Phase 2 convenience value — not authoritative. Authoritative tariff data coming in Phase 3."
    - _Requirements: Req 14.2, Req 14.3, Req 14.9, Req 15.4_

- [ ] 20. Create app sidebar and update authenticated layout (Phase 2)
  - [ ] 20.1 Create `components/layout/AppSidebar.tsx`
    - Server Component (no `'use client'` — it receives session data as props or reads it server-side)
    - Nav links: Dashboard (`/dashboard`), Calculator (`/calculator`), History (`/history`), Profile (`/profile`)
    - Sign-out form: `<form action={logOutAction}><button type="submit">Sign Out</button></form>`
    - _Requirements: Req 9.1, Req 9.2, Req 9.3_

  - [ ] 20.2 Update `app/(app)/layout.tsx` — add auth check and sidebar
    - Replace the Phase 1 stub body with: call `requireUser()` from `lib/dal/users.ts`; render `<AppSidebar />` alongside `{children}` in a flex layout
    - Must remain a Server Component — do not add `'use client'`
    - _Requirements: Req 5.4, Req 1.10_

  - [ ] 20.3 Update `app/(app)/dashboard/page.tsx` — add `requireUser()` call
    - Add call to `requireUser()` from `lib/dal/users.ts` at the top of the `DashboardPage` function body
    - Keep the existing mock data rendering (`generateDashboardData()`) unchanged — only the auth gate is added
    - _Requirements: Req 20.4, Req 5.1_

- [ ] 21. Update Navbar for session-aware sign-in/sign-out (Phase 2)
  - [ ] 21.1 Update `components/layout/Navbar.tsx`
    - The public Navbar (used in `app/(public)/layout.tsx`) should show a "Sign In" button linking to `/login` when no session exists, and a "Sign Out" form button using `logOutAction` when a session is present
    - To read session state in the Navbar, accept an optional `user: User | null` prop (the parent layout passes this after calling `getCurrentUser()`) — do not call `getCurrentUser()` inside the Navbar itself to avoid redundant DB calls
    - _Requirements: Req 9.1_

- [ ] 22. Implement full middleware (Phase 2)
  - [ ] 22.1 Replace stub `middleware.ts` with full Supabase SSR session refresh + route protection
    - Create a Supabase server client inside middleware using `@supabase/ssr`'s `createServerClient` with `request.cookies`
    - Call `supabase.auth.getUser()` (not `getSession()`) to verify the session — update response cookies with refreshed tokens
    - If the request targets a path under `app/(app)/` (i.e., `/dashboard`, `/calculator`, `/history`, `/profile`) and no valid user is returned: redirect to `/login?redirect=<original_path>`
    - If valid session or public route: call `NextResponse.next()` with updated cookie headers
    - Preserve the existing `export const config` matcher unchanged
    - _Requirements: Req 10.1, Req 10.2, Req 10.3, Req 10.4, Req 10.5_

- [ ] 23. Final checkpoint — Phase 2 complete
  - Ensure `npm run build` succeeds with zero TypeScript errors
  - Ensure `npm test` passes all property-based tests
  - Verify that `/dashboard`, `/calculator`, `/history`, `/profile` redirect to `/login` when not authenticated
  - Verify that authenticated users can access all protected routes
  - Verify that the solar profile form saves and loads correctly
  - Verify that logout clears the session and redirects to `/`
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for full traceability
- Phase 1 involves no database — purely structural refactoring
- Phase 2 requires a Supabase project with Auth enabled before running
- `lib/solarData.ts` is intentionally kept throughout both phases; it provides demo data for the dashboard until Phase 5+ real data is added
- `@react-three/fiber`, `@react-three/drei`, and `three` are retained throughout — reserved for future solar rooftop visualisation
- `SUPABASE_SERVICE_ROLE_KEY` is never used in any Phase 1 or Phase 2 code path
- In Next.js 16, `error.tsx` uses `unstable_retry` (not `reset`) as the retry callback prop

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1", "3.2", "3.3", "4.1", "4.2"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.4", "5.1", "5.2", "5.3", "8.1", "8.2", "9.1", "9.2", "10.1", "10.2", "10.3", "11.1"] },
    { "id": 3, "tasks": ["5.4", "6.1", "6.2", "6.3", "6.4", "7.1"] },
    { "id": 4, "tasks": ["13.1", "13.2", "13.3"] },
    { "id": 5, "tasks": ["14.1", "14.2", "14.3", "15.1", "16.1", "16.2"] },
    { "id": 6, "tasks": ["17.1", "17.2", "18.1", "18.3", "20.1"] },
    { "id": 7, "tasks": ["18.2", "18.4", "19.1"] },
    { "id": 8, "tasks": ["19.2", "20.2", "20.3", "21.1"] },
    { "id": 9, "tasks": ["22.1"] }
  ]
}
```
