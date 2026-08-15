# Requirements Document

## Introduction

The Solar Intelligence Platform transforms an existing static Next.js prototype — which uses hard-coded and randomly generated solar data — into a full-stack, multi-user product focused on Telangana / Hyderabad. The platform allows real users to create accounts, model their own solar installations, and (in later phases) interact with a grounded AI Solar Advisor and a configurable Solar Simulator. This document derives formal EARS-compliant requirements from the approved design document, covering Phase 1 (Architecture & Foundation) and Phase 2 (Authentication + User Solar Profile) in full implementable detail, and documenting Phases 3–6 at design level.

---

## Glossary

- **Platform**: The Solar Intelligence Platform — the full-stack Next.js application described in this document.
- **Middleware**: The Next.js `middleware.ts` edge function that intercepts every request before a page renders.
- **Public_Route**: Any page under the `app/(public)/` route group, accessible without authentication (e.g., home, login, signup).
- **App_Route**: Any page under the `app/(app)/` route group, which requires a valid authenticated session.
- **DAL**: Data Access Layer — the set of server-only TypeScript modules in `lib/dal/` through which all database access must pass.
- **Server_Action**: A Next.js `'use server'` function called from a Client Component to perform server-side mutations.
- **Supabase_Auth**: The Supabase authentication service used for email/password sign-up and login, session management via `@supabase/ssr` HttpOnly cookies.
- **RLS**: Row Level Security — PostgreSQL policies on Supabase tables that restrict which rows an authenticated user may read or write.
- **Solar_Profile**: The `public.solar_profiles` database row that stores a user's self-reported installation context (location, consumption, roof details, system preferences).
- **Session_Cookie**: The HttpOnly `sb-access-token` and `sb-refresh-token` cookies set by `@supabase/ssr` after a successful authentication.
- **SSR_Server_Client**: The Supabase client created via `@supabase/ssr`'s `createServerClient` using the public anon key and the request's session cookies. Used in the DAL for all normal authenticated user operations — RLS enforces row-level access automatically. Never uses the service-role key.
- **Admin_Server_Client**: A separate Supabase client using `SUPABASE_SERVICE_ROLE_KEY`. Bypasses RLS entirely. Reserved exclusively for privileged server-side operations (e.g., Phase 3+ document ingestion, background admin jobs). Must never be used in the standard authenticated user request path.
- **Browser_Client**: The Supabase client instantiated in `lib/db/supabase-browser.ts` using the public anon key; runs in the browser and is restricted by RLS.
- **Calculation_Engine**: The pure TypeScript functions in `lib/calculations/solar.ts` and `lib/calculations/financial.ts` that perform all solar and financial math.
- **Zod_Schema**: The `SolarProfileSchema` defined in `lib/validations/solar-profile.ts` used to validate all solar profile form submissions on the server.
- **RAG_Pipeline**: The Retrieval-Augmented Generation pipeline planned for Phase 3 that retrieves grounded document chunks before calling an LLM.
- **AI_Advisor**: The conversational AI feature planned for Phase 4 that answers solar questions using only cited, traceable sources.
- **Simulator**: The configurable solar system simulation feature planned for Phase 5.
- **Agent_Workflow**: The full tool-calling LLM agent planned for Phase 6.
- **TSSPDCL**: Telangana State Southern Power Distribution Company Limited — the electricity distributor for Hyderabad. The authoritative source for tariff slabs and net-metering rates in Telangana. In Phase 2, tariff data may be temporarily entered by the user as a convenience; authoritative tariff data from TSSPDCL sources will be ingested into the knowledge base in Phase 3 and used as the source of truth thereafter.
- **App_Router**: The Next.js App Router file-system routing convention used throughout the project.
- **Route_Group**: A Next.js App Router folder name wrapped in parentheses (e.g., `(public)`, `(app)`) that creates a layout scope without affecting the URL path.
- **Server_Component**: A Next.js React Server Component that renders on the server and has direct access to `async`/`await` data fetching.
- **Client_Component**: A React component marked `'use client'` that renders in the browser and can use hooks such as `useState` and `useActionState`.

---

## Requirements

### Requirement 1: Project Structure Reorganisation

**User Story:** As a developer, I want a clean Next.js App Router folder structure with route groups, so that public and authenticated pages are clearly separated and the codebase is maintainable as the platform grows.

#### Acceptance Criteria

1. THE Platform SHALL place all unauthenticated pages (home, login, signup) under the `app/(public)/` route group.
2. THE Platform SHALL place all authenticated pages (dashboard, calculator, history, profile) under the `app/(app)/` route group.
3. THE Platform SHALL move `api/dashboard/route.ts` and `api/history/route.ts` from the project root `api/` directory into `app/api/dashboard/route.ts` and `app/api/history/route.ts` respectively, so all route handlers follow App Router conventions.
4. THE Platform SHALL move all route handlers from the root-level `api/` directory before deleting that directory, ensuring no route is deleted without a working replacement in `app/api/`.
5. THE Platform SHALL move `components/OutputChart.tsx` and `components/BreakevenChart.tsx` to `components/charts/`.
6. THE Platform SHALL move `components/Navbar.tsx` and `components/PageWrapper.tsx` to `components/layout/`.
7. THE Platform SHALL refactor `lib/calculations.ts` into `lib/calculations/solar.ts`, preserving all existing pure function signatures.
8. THE Platform SHALL provide an `app/api/health/route.ts` route handler that returns `{ status: 'ok', timestamp: string }` on `GET /api/health`.
9. THE Platform SHALL remove the `app/layout.tsx` root layout's direct import of the Navbar component so that each route-group layout owns its own navigation.
10. WHEN a developer creates any new page under `app/(app)/`, THE Platform SHALL provide an `app/(app)/layout.tsx` shell layout that wraps all authenticated pages with a consistent sidebar navigation.

---

### Requirement 2: Documentation Foundation

**User Story:** As a developer or new contributor, I want essential architecture documentation committed alongside the code, so that I can understand how the system is structured without reading every file.

#### Acceptance Criteria

1. THE Platform SHALL include a `docs/architecture.md` file that describes the layered system architecture (presentation, action, DAL, infrastructure layers) and the two Supabase client types (SSR_Server_Client for user requests, Admin_Server_Client for privileged operations).
2. THE Platform SHALL include a `docs/database.md` file that documents the Phase 2 schema (SQL DDL, RLS policies, triggers, entity relationships) and lists future tables (Phase 3+) at a high level without full DDL.
3. THE Platform SHALL include a `.env.example` file committed to version control that lists every required and optional environment variable with explanatory comments and empty values.
4. THE Platform SHALL include a `docs/ai-rag-architecture.md` placeholder that notes embedding model, vector dimension, indexing strategy, and retrieval configuration are deferred to Phase 3 and must not be finalised before that phase begins.
5. THE Platform SHALL NOT require `docs/data-flow.md`, `docs/auth-flow.md`, or `docs/folder-structure.md` as Phase 1 deliverables — these may be added as needed in later phases when the patterns they document are stable.

---

### Requirement 3: Solar Calculation Engine

**User Story:** As a developer, I want pure, well-typed calculation functions separated from data concerns, so that solar and financial math can be tested independently and reused across the platform.

#### Acceptance Criteria

1. WHEN given positive panel count, wattage in watts, and daily sunlight hours, THE Calculation_Engine SHALL compute daily generation in kWh using the formula `(panels × wattage × sunHours) / 1000` and return a value greater than or equal to zero.
2. WHEN given a daily generation value and an electricity tariff, THE Calculation_Engine SHALL compute daily savings in INR as exactly `dailyGenerationKwh × tariffInr` with no silent rounding or truncation beyond two decimal places.
3. WHEN given a total investment and a positive monthly savings amount, THE Calculation_Engine SHALL compute a breakeven month count such that a higher monthly savings always produces an equal or shorter breakeven period than a lower monthly savings for the same investment.
4. WHEN given any valid input set, THE Calculation_Engine SHALL compute a breakeven month value such that the cumulative net position at that month is within ±(one month's savings) of zero.
5. THE Calculation_Engine SHALL expose all functions as named exports from `lib/calculations/solar.ts` with strict TypeScript types for all inputs and outputs.
6. THE Calculation_Engine SHALL expose financial projection functions (NPV, 25-year savings, subsidy adjustment) as named exports from `lib/calculations/financial.ts`.
7. WHEN the breakeven curve generator is called, THE Calculation_Engine SHALL accept a `panels` array parameter rather than importing `panelTypes` from `lib/solarData.ts` directly, removing the coupling to static mock data.

---

### Requirement 4: Environment Variable and Secret Management

**User Story:** As a developer, I want a clear separation between public and server-only environment variables, so that secrets are never accidentally exposed to the browser bundle.

#### Acceptance Criteria

1. THE Platform SHALL expose only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_APP_URL` to the browser via the `NEXT_PUBLIC_` prefix.
2. THE Platform SHALL keep `SUPABASE_SERVICE_ROLE_KEY` and any LLM API keys (e.g., `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) as server-only environment variables without the `NEXT_PUBLIC_` prefix. Embedding model name, vector dimension, and LLM model selection are Phase 3+ concerns and SHALL NOT appear as required environment variables in Phase 1 or Phase 2.
3. THE SSR_Server_Client in `lib/db/client.ts` SHALL import `'server-only'` and use the public anon key with session cookies — NOT the service-role key — for all normal authenticated user operations, so that RLS is in effect for every user-facing database query.
4. THE Admin_Server_Client, when created for privileged operations (Phase 3+), SHALL be instantiated in a separate module (e.g., `lib/db/admin-client.ts`) that is never imported from DAL modules or Server Actions that handle user requests.
5. THE DAL modules in `lib/dal/` SHALL each import `'server-only'` at the top of the file.
6. THE Platform SHALL include a `.env.example` file with all variable names documented, as specified in Requirement 2.3.
7. IF `SUPABASE_SERVICE_ROLE_KEY` or `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing at startup, THEN THE Platform SHALL throw an error identifying the missing variable before handling any request.

---

### Requirement 5: Server Component Architecture and Client Boundary

**User Story:** As a developer, I want authenticated pages to be React Server Components by default, so that data fetching happens on the server and sensitive data never passes through the client bundle unnecessarily.

#### Acceptance Criteria

1. THE Platform SHALL ensure `app/(app)/dashboard/page.tsx` is a Server Component (no `'use client'` directive at the page level).
2. THE Platform SHALL extract Framer Motion animation wrappers into `'use client'` leaf components so that parent Server Component pages are not forced into the client bundle.
3. WHEN a Server Component page needs animated UI, THE Platform SHALL pass data as props to a `'use client'` child component rather than importing `motion` directly in the page file.
4. THE Platform SHALL ensure `app/(app)/layout.tsx` is a Server Component that calls `requireUser()` to verify the session before rendering; it SHALL NOT be converted to a Client Component even if individual child components require client-side interactivity.
5. THE Platform SHALL ensure auth form components (`LoginForm`, `SignupForm`, `SolarProfileForm`) are `'use client'` leaf components that receive Server Action references as props or use `useActionState`.

---

### Requirement 6: Dependency Hygiene

**User Story:** As a developer, I want the package.json to reflect only the dependencies the project actively needs, so that the client bundle stays manageable and there are no misleading unused packages.

#### Acceptance Criteria

1. THE Platform SHALL add `@supabase/ssr`, `@supabase/supabase-js`, and `zod` as production dependencies.
2. THE Platform SHALL retain `@react-three/fiber`, `@react-three/drei`, and `three` in `package.json` without modification — these are reserved for a future solar rooftop visualisation feature and SHALL NOT be removed during Phase 1 or Phase 2.
3. THE Platform SHALL add `vitest` and `@vitest/coverage-v8` as devDependencies for the test runner.
4. THE Platform SHALL add `fast-check` as a devDependency for property-based testing.

---

### Requirement 7: Authentication — Sign-Up

**User Story:** As a new user, I want to create an account with my name, email, and password, so that I can access personalised solar features and save my installation details.

#### Acceptance Criteria

1. THE Platform SHALL provide a `/signup` page with a form that accepts `full_name`, `email`, and `password` fields.
2. WHEN a user submits the signup form, THE Platform SHALL validate `full_name` is at least 2 characters, `email` is a valid email address, and `password` is at least 8 characters on the server before calling Supabase Auth.
3. WHEN validation fails, THE Platform SHALL return field-level error messages to the form via `useActionState` and display them inline without a full page reload.
4. WHEN a valid signup submission is received, THE Platform SHALL call `supabase.auth.signUp()` with the email, password, and `full_name` in `raw_user_meta_data`.
5. WHEN `supabase.auth.signUp()` succeeds, THE Platform SHALL redirect the user to `/dashboard` — a database trigger on `auth.users` automatically creates the corresponding `public.users` row.
6. IF the submitted email address is already registered, THEN THE Platform SHALL return the generic error message `'An account with this email already exists'`. The signup form SHALL display this message without confirming or denying account existence for any other email address.
7. WHEN a new `auth.users` row is inserted, THE Platform's database trigger `on_auth_user_created` SHALL automatically insert a matching row into `public.users` with the same `id`, `email`, and `full_name` from `raw_user_meta_data`.

---

### Requirement 8: Authentication — Login

**User Story:** As a returning user, I want to log in with my email and password, so that I can access my solar profile and personalised dashboard.

#### Acceptance Criteria

1. THE Platform SHALL provide a `/login` page with a form that accepts `email` and `password` fields.
2. WHEN a user submits the login form, THE Platform SHALL validate that both `email` and `password` are non-empty on the server before calling Supabase Auth.
3. WHEN valid credentials are submitted, THE Platform SHALL call `supabase.auth.signInWithPassword()` and — on success — have `@supabase/ssr` set `sb-access-token` and `sb-refresh-token` as HttpOnly cookies, then redirect to the path specified in the `?redirect=<path>` query parameter if present, otherwise redirect to `/dashboard`.
4. IF login credentials are invalid, THEN THE Platform SHALL return the generic error message `'Invalid email or password'` without distinguishing between an unrecognised email and a wrong password.

---

### Requirement 9: Authentication — Logout

**User Story:** As an authenticated user, I want a sign-out action that clears my session, so that my account is secure when I leave the device.

#### Acceptance Criteria

1. THE Platform SHALL provide a sign-out control in `AppSidebar` that submits a form with `logOutAction` as the action.
2. WHEN `logOutAction` is called, THE Platform SHALL invoke `supabase.auth.signOut()`, which clears the `sb-access-token` and `sb-refresh-token` HttpOnly cookies.
3. WHEN logout completes, THE Platform SHALL redirect the user to the home page `/`.
4. WHEN `getCurrentUser()` is called after logout with the cleared cookie, THE Platform SHALL return `null` immediately — no caching or deferred consistency is permitted.

---

### Requirement 10: Route Protection via Middleware

**User Story:** As a system administrator, I want all authenticated pages protected at the edge before any server-side rendering occurs, so that unauthenticated users can never receive protected page content even if application-level auth checks are bypassed.

#### Acceptance Criteria

1. THE Platform SHALL implement `middleware.ts` at the project root that intercepts every request not matching static assets (`_next/static`, `_next/image`, `favicon.ico`, image files).
2. WHEN a request targets any route under `app/(app)/` and the Session_Cookie is absent or expired, THE Middleware SHALL respond with a redirect to `/login?redirect=<original_path>` and SHALL NOT allow the page to render.
3. WHEN a request targets any route under `app/(app)/` and the Session_Cookie is valid, THE Middleware SHALL refresh the token using `@supabase/ssr` if needed and pass the request through to the page.
4. WHEN a request targets any Public_Route (routes under `app/(public)/`), THE Middleware SHALL pass the request through without checking for a session. All other non-static routes under `app/(app)/` SHALL require authentication.
5. THE Middleware SHALL use `supabase.auth.getUser()` (not `getSession()`) to verify the session, as `getSession()` does not re-validate the JWT with the Supabase server.

---

### Requirement 11: Server-Side Authorization in Server Actions

**User Story:** As a security engineer, I want every Server Action that mutates user data to verify the caller's identity independently, so that a compromised page-level check cannot allow unauthorised writes.

#### Acceptance Criteria

1. THE Platform SHALL implement `requireUser()` in `lib/auth/session.ts` as a server-only function that reads the Supabase session from cookies and throws an `Error('Unauthorized')` if no valid session is found.
2. WHEN `upsertSolarProfileAction` is called, THE Platform SHALL invoke `requireUser()` as the first operation before any validation or database access.
3. WHEN `requireUser()` throws in a Server Action, THE Platform SHALL return `{ errors: { general: ['Unauthorized'] } }` to the client without proceeding to database operations.
4. THE DAL function `upsertSolarProfile` SHALL compare the caller's authenticated `userId` against the `user_id` in the submitted data and throw if they differ.
5. THE Platform SHALL NOT rely solely on middleware for access control — each Server Action and DAL function SHALL perform its own authorization check.

---

### Requirement 12: Database — Users Table

**User Story:** As a developer, I want a `public.users` table that mirrors Supabase Auth's `auth.users` table with display profile data, so that the application can query user information using standard SQL without going through the Auth API.

#### Acceptance Criteria

1. THE Platform SHALL create a `public.users` table with columns: `id UUID PRIMARY KEY` (references `auth.users(id) ON DELETE CASCADE`), `email TEXT NOT NULL`, `full_name TEXT`, `avatar_url TEXT`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
2. THE Platform SHALL create a database trigger `on_auth_user_created` on `auth.users` (AFTER INSERT FOR EACH ROW) that calls `public.handle_new_user()` to automatically insert a corresponding row into `public.users`.
3. THE Platform SHALL create a trigger `set_users_updated_at` on `public.users` (BEFORE UPDATE FOR EACH ROW) that sets `updated_at = NOW()`.
4. THE Platform SHALL enable RLS on `public.users` with a policy `users_select_own` that allows SELECT only when `auth.uid() = id`.
5. THE Platform SHALL enable RLS on `public.users` with a policy `users_update_own` that allows UPDATE only when `auth.uid() = id`.
6. THE Platform SHALL create the users table and trigger via a committed migration file `supabase/migrations/001_create_users.sql`.

---

### Requirement 13: Database — Solar Profiles Table

**User Story:** As a developer, I want a `public.solar_profiles` table that stores each user's self-reported solar installation context, so that the platform can personalise calculations, AI advice, and simulations to each user's actual situation.

#### Acceptance Criteria

1. THE Platform SHALL create a `public.solar_profiles` table with a `user_id UUID NOT NULL UNIQUE` foreign key referencing `public.users(id) ON DELETE CASCADE`, enforcing a one-to-one relationship between a user and their solar profile.
2. THE Platform SHALL include location columns: `city TEXT NOT NULL DEFAULT 'Hyderabad'`, `state TEXT NOT NULL DEFAULT 'Telangana'`, `district TEXT`, `pincode TEXT`.
3. THE Platform SHALL include consumption columns: `monthly_bill_inr NUMERIC(10,2)`, `monthly_units_kwh NUMERIC(8,2)`, `electricity_tariff_inr NUMERIC(6,4)`. The `electricity_tariff_inr` column is a user-entered convenience field for Phase 2 — it is NOT the authoritative tariff source. Authoritative tariff data will come from the knowledge base in Phase 3+.
4. THE Platform SHALL include roof detail columns: `roof_area_sqft NUMERIC(8,2)`, `roof_type TEXT`, `roof_orientation TEXT`, `shading_level TEXT`.
5. THE Platform SHALL include system preference columns: `budget_inr NUMERIC(12,2)`, `preferred_capacity_kw NUMERIC(6,2)`, `battery_preference TEXT NOT NULL DEFAULT 'no-battery'`.
6. THE Platform SHALL enforce CHECK constraints on `solar_profiles` such that `roof_type` is one of `('flat-rcc', 'sloped-tile', 'metal-sheet', 'other')` or NULL, `roof_orientation` is one of `('south', 'south-east', 'south-west', 'flat', 'other')` or NULL, `shading_level` is one of `('none', 'partial', 'heavy')` or NULL, and `battery_preference` is one of `('no-battery', 'battery-backup', 'off-grid')`.
7. THE Platform SHALL enforce CHECK constraints that `monthly_bill_inr`, `monthly_units_kwh`, `roof_area_sqft`, `budget_inr`, and `preferred_capacity_kw` are either NULL or greater than zero.
8. THE Platform SHALL enable RLS on `public.solar_profiles` with policies that restrict SELECT, INSERT, UPDATE, and DELETE to the row where `auth.uid() = user_id`.
9. THE Platform SHALL create a trigger `set_solar_profiles_updated_at` (BEFORE UPDATE FOR EACH ROW) that sets `updated_at = NOW()`.
10. THE Platform SHALL create the solar profiles table via committed migration file `supabase/migrations/002_create_solar_profiles.sql`.

---

### Requirement 14: Solar Profile — Create and Update

**User Story:** As an authenticated user, I want to create and update my solar profile in a form, so that the platform knows my location, electricity consumption, roof details, and installation preferences.

#### Acceptance Criteria

1. THE Platform SHALL provide a `/profile` page accessible only to authenticated users that renders the current Solar_Profile if one exists, or an empty form if none exists.
2. THE Platform SHALL render `SolarProfileForm` as a `'use client'` component that uses `useActionState(upsertSolarProfileAction, undefined)` and displays field-level validation errors inline.
3. THE SolarProfileForm SHALL group its fields into four sections: Location, Electricity Consumption, Roof Details, and System Preferences.
4. WHEN a user submits the solar profile form, THE Platform SHALL call `upsertSolarProfileAction`, which SHALL invoke `requireUser()` first, then validate inputs with `SolarProfileSchema.safeParse()`, and then call `dal/solar-profiles.upsertSolarProfile()`.
5. WHEN Zod validation fails on any field, THE Platform SHALL return `{ errors: fieldErrors }` keyed by field name without writing to the database, and THE SolarProfileForm SHALL display the error next to the relevant field.
6. WHEN Zod validation passes, THE Platform SHALL perform an `INSERT ... ON CONFLICT (user_id) DO UPDATE` to create or update the Solar_Profile atomically.
7. WHEN the upsert succeeds, THE Platform SHALL call `revalidatePath('/profile')` and return `{ success: true }` — THE SolarProfileForm SHALL display a success indication to the user.
8. IF a database write failure occurs, THEN THE Platform SHALL return `{ errors: { general: ['Failed to save profile. Please try again.'] } }` without surfacing internal error details to the client.
9. THE Platform SHALL allow partial solar profiles — all fields except `city` and `state` are optional and a user may save an incomplete profile to return and complete later.
10. WHEN a user submits the same solar profile data a second time, THE Platform SHALL produce the same saved state as after the first submission with no duplicate rows created (idempotent upsert).

---

### Requirement 15: Solar Profile — Validation Rules

**User Story:** As a user filling in my solar profile, I want clear validation feedback, so that I understand what format each field expects before saving.

#### Acceptance Criteria

1. THE Zod_Schema SHALL require `city` to be a non-empty string of at least 2 characters.
2. THE Zod_Schema SHALL require `state` to be a non-empty string of at least 2 characters.
3. WHEN `pincode` is provided, THE Zod_Schema SHALL validate it matches exactly 6 digits.
4. WHEN `electricity_tariff_inr` is provided, THE Zod_Schema SHALL validate it is at least 1 and at most 20. This field is a Phase 2 user-entered convenience value only — calculations that require an authoritative tariff SHALL use data from the knowledge base (Phase 3+) rather than this user-supplied value.
5. WHEN `roof_area_sqft` is provided, THE Zod_Schema SHALL validate it is greater than 0 and at most 10,000.
6. WHEN `preferred_capacity_kw` is provided, THE Zod_Schema SHALL validate it is greater than 0 and at most 500.
7. WHEN any numeric field receives a non-numeric string input via FormData, THE Zod_Schema SHALL return the error `'Must be a number'` for that field.
8. THE Zod_Schema SHALL coerce all numeric FormData strings to numbers before validation, so the Server Action does not need to manually parse strings.

---

### Requirement 16: Supabase Client Architecture

**User Story:** As a developer, I want clearly separated Supabase client instances for different contexts, so that RLS is always in effect for user-facing queries and the service-role key is reserved for privileged operations only.

#### Acceptance Criteria

1. THE Platform SHALL implement `lib/db/client.ts` with `import 'server-only'` and an async `createSupabaseServerClient()` factory that uses `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the request's session cookies via `@supabase/ssr`'s `createServerClient`. This is the SSR_Server_Client used for all normal authenticated user operations — it operates within RLS constraints.
2. THE Platform SHALL implement `lib/db/supabase-browser.ts` with a `createSupabaseBrowserClient()` factory that uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` via `@supabase/ssr`'s `createBrowserClient`. This client is restricted by RLS.
3. THE Platform SHALL NOT use `SUPABASE_SERVICE_ROLE_KEY` anywhere in `lib/db/client.ts` or in any DAL function that handles normal user requests. The service-role key bypasses RLS and must never be used in the user request path.
4. THE Platform SHALL create a separate `lib/db/admin-client.ts` module (Phase 3+) for any operations that genuinely require bypassing RLS (e.g., admin document ingestion). This file SHALL import `'server-only'` and SHALL NOT be imported from `lib/dal/users.ts`, `lib/dal/solar-profiles.ts`, or any user-facing Server Action.
5. THE Platform SHALL generate or maintain a `lib/types/supabase.ts` file containing typed Database definitions (via Supabase CLI `supabase gen types`) so all Supabase query results are fully typed.
6. WHILE `SUPABASE_SERVICE_ROLE_KEY` is present in the environment, THE Platform SHALL ensure no code path in the normal user request flow can access it — it must be referenced only in `lib/db/admin-client.ts`.

---

### Requirement 17: Data Access Layer

**User Story:** As a developer, I want all user-facing database queries to go through a typed DAL that uses the SSR Supabase client, so that RLS is always enforced, auth checks are centralised, and no query bypasses row-level access policies.

#### Acceptance Criteria

1. THE Platform SHALL implement `lib/dal/users.ts` with `import 'server-only'` that exports `getCurrentUser(): Promise<User | null>` and `requireUser(): Promise<User>`. Both functions SHALL use the SSR_Server_Client (cookie-based, anon key + RLS), not the service-role client.
2. THE Platform SHALL implement `lib/dal/solar-profiles.ts` with `import 'server-only'` that exports `getSolarProfile(userId: string): Promise<SolarProfile | null>` and `upsertSolarProfile(userId: string, data: SolarProfileInput): Promise<SolarProfile>`. Both functions SHALL use the SSR_Server_Client.
3. WHEN `getCurrentUser()` is called and no valid session cookie is present, THE DAL SHALL return `null` without throwing.
4. WHEN `requireUser()` is called and no valid session cookie is present, THE DAL SHALL throw `new Error('Unauthorized')`.
5. WHEN `getSolarProfile` is called, THE DAL SHALL query only the row where `user_id` matches the provided `userId` — RLS on `solar_profiles` enforces this at the database level, and the DAL SHALL NOT attempt to filter by `user_id` as a substitute for RLS.
6. WHEN `upsertSolarProfile` is called with a `userId` that does not match the authenticated session user, THE DAL SHALL throw `new Error('Unauthorized')` before touching the database.
7. THE DAL SHALL NOT expose raw Supabase query objects, error codes, or PostgreSQL error messages to callers — all errors SHALL be wrapped in typed application-level errors or returned as `null`.

---

### Requirement 18: Stub Middleware (Phase 1)

**User Story:** As a developer completing Phase 1, I want a stub `middleware.ts` file in place with the correct matcher configuration, so that Phase 2 authentication wiring can be added without structural changes.

#### Acceptance Criteria

1. THE Platform SHALL create `middleware.ts` at the project root during Phase 1 as a no-op that passes all requests through without modification.
2. THE Middleware SHALL include the `export const config = { matcher: [...] }` configuration that excludes `_next/static`, `_next/image`, `favicon.ico`, and image file extensions, as the full Phase 2 implementation will reuse this config unchanged.

---

### Requirement 19: API Health Check Endpoint

**User Story:** As a DevOps engineer, I want a `GET /api/health` endpoint, so that load balancers and deployment pipelines can verify the Next.js server is running.

#### Acceptance Criteria

1. THE Platform SHALL implement `app/api/health/route.ts` as a Next.js App Router route handler.
2. WHEN `GET /api/health` is requested, THE Platform SHALL return HTTP 200 with the JSON body `{ "status": "ok", "timestamp": "<ISO 8601 datetime>" }`.
3. THE Health endpoint SHALL require no authentication and SHALL be accessible from Public_Routes and App_Routes alike.

---

### Requirement 20: Dashboard Page — Mock Data Preservation (Phase 1)

**User Story:** As a developer, I want the existing dashboard to continue showing its mock data display after the Phase 1 refactor, so that no visible regression occurs before real data is wired in Phase 2+.

#### Acceptance Criteria

1. AFTER the Phase 1 restructure, THE Platform SHALL render the `/dashboard` page with the same visual output as before the refactor using data from `lib/solarData.ts`.
2. THE Platform SHALL clearly mark `lib/solarData.ts` with a comment indicating it contains static demo/mock data and is not a source of truth.
3. THE Platform SHALL ensure `app/api/dashboard/route.ts` (in its new location) returns the same `DashboardData` shape as before the move.
4. WHEN Phase 2 adds `requireUser()` to the dashboard page, THE Platform SHALL maintain the same data display — only the auth gate is added, not the data source.

---

### Requirement 21: Error Boundaries

**User Story:** As a user experiencing a runtime error in an authenticated page, I want a friendly error screen with a recovery action, so that I am not left on a blank or broken page.

#### Acceptance Criteria

1. THE Platform SHALL provide an `error.tsx` file at the `app/(app)/` level that catches unhandled errors in authenticated pages and displays a user-friendly error message.
2. THE `error.tsx` error boundary SHALL include a "Try again" button that calls `reset()` to attempt to re-render the failed segment.
3. WHEN an authentication error occurs in a Server Action, THE Platform SHALL return a structured error response (e.g., `{ errors: { general: ['Unauthorized'] } }`) rather than throwing an unhandled exception that would trigger the error boundary. Other Server Action error types (validation, database) may propagate as unhandled exceptions.

---

### Requirement 22: Geographic Scope and Data Traceability

**User Story:** As a product manager, I want all solar and financial data values to be traceable to a real source rather than hard-coded strings scattered across components, so that the platform never presents users with hallucinated or unverifiable numbers.

#### Acceptance Criteria

1. THE Platform SHALL not hard-code tariff values (e.g., ₹6.30/kWh, ₹3.5/unit net metering) as string literals inside UI components — these values SHALL be defined as named constants in a single source-of-truth module.
2. THE Platform SHALL document in `docs/database.md` that TSSPDCL-specific tariff and net-metering rates are interim hard-coded constants and will be moved to the `documents` table in Phase 3 as part of the knowledge base ingestion.
3. THE Solar_Profile schema SHALL use free-text `city` and `state` fields (not enums) so that the Platform can be extended to additional cities and states by adding data rows rather than code changes.
4. WHERE the Platform's default location is Hyderabad / Telangana, THE Platform SHALL use named constants or configuration values rather than inline string literals so that the default can be changed in one place.

---

## Phase 3 — RAG Foundation (High-Level)

> Implementation detail for future phases. Not part of Phase 1 or Phase 2 scope.

**Summary:** Add the `pgvector` extension to Supabase, create `public.documents` and `public.document_chunks` tables, and build a document ingestion pipeline that stores chunked text with vector embeddings. Implement hybrid retrieval (vector similarity + metadata filter) over Telangana-scoped solar documents (government subsidy policies, TSSPDCL tariff schedules, installation guides).

Key design constraints:
- All documents must have a traceable `source_url` or `file_path`.
- Only `reliability = 'official'` or `reliability = 'industry'` sources are eligible for use in AI-generated answers.
- The embedding model, vector dimension, chunk size, overlap, indexing strategy (e.g., IVFFlat vs. HNSW), and retrieval configuration (top-K, re-ranking) will be evaluated and finalised at the start of Phase 3. These decisions must not be locked in during Phase 1 or Phase 2.
- Authoritative TSSPDCL tariff and subsidy data ingested in this phase becomes the source of truth for financial calculations, superseding the user-entered `electricity_tariff_inr` convenience field from Phase 2.

---

## Phase 4 — AI Solar Advisor (High-Level)

> Implementation detail for future phases. Not part of Phase 1 or Phase 2 scope.

**Summary:** Integrate an LLM (OpenAI / Anthropic via direct API, no LangChain) with the RAG pipeline to power a conversational Solar Advisor. Every answer must cite document chunks with `[Source N]` inline citations. If no relevant source chunks are found, the Advisor must respond with an explicit "Insufficient information" notice rather than generating an unsourced answer.

Key design constraints:
- LLM is orchestrator only; all numeric values come from deterministic Calculation_Engine functions.
- System prompt: "Answer ONLY using the provided sources."
- Streaming response via `app/api/advisor/route.ts` (text/event-stream).
- Conversations and messages stored in `public.conversations` and `public.messages` tables.
- Auth required; user's Solar_Profile context injected into the grounded prompt.

---

## Phase 5 — Solar Simulator (High-Level)

> Implementation detail for future phases. Not part of Phase 1 or Phase 2 scope.

**Summary:** A `/simulator` page allowing users to configure a hypothetical solar system (capacity, panel type, battery, location) and receive a full financial breakdown — savings, payback period, NPV, 25-year projection — powered entirely by the deterministic Calculation_Engine with no LLM involvement. Simulation runs are persisted to `public.simulation_runs` for comparison.

---

## Phase 6 — Agent Workflow (High-Level)

> Implementation detail for future phases. Not part of Phase 1 or Phase 2 scope.

**Summary:** A full tool-calling LLM agent that orchestrates six tools: `KnowledgeRetrievalTool`, `UserProfileTool`, `SolarCalculationTool`, `FinancialCalculationTool`, `SubsidyLookupTool`, and `LocationSolarPotentialTool`. The agent handles multi-step reasoning (e.g., "recommend an optimal system for my roof given current Telangana subsidies") while all computations remain in deterministic TypeScript functions. No LangChain or LangGraph; tool dispatch uses the provider SDK's function-calling API.
