# System Architecture: Solar Intelligence Platform

## Overview

The Solar Intelligence Platform is built on a four-layer server-first architecture using Next.js App Router, Supabase, and Google Gemini Embeddings.

```
┌─────────────────────────────────────────────────────────┐
│                 Presentation Layer                      │
│   (App Router: Public, App Shell & Knowledge Test Bench)│
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│              Action & Retrieval Layer                   │
│   (Server Actions, RAG Retrieval Service, Search API)   │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                 Data Access Layer (DAL)                 │
│         (Server-only: Users, Profiles, Knowledge)       │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│               Infrastructure / Database                 │
│     (Supabase PostgreSQL + pgvector, Gemini Embeddings) │
└─────────────────────────────────────────────────────────┘
```

## Architectural Layers (Phase 3 Status)

1. **Presentation Layer (`app/`, `components/`)**
   - Public route group `app/(public)/`: Home, Login, Signup pages. Shared public navigation shell.
   - App route group `app/(app)/`: Dashboard, Calculator, History, Knowledge Base Test Bench (`/knowledge`), Profile pages.
   - React Server Components (RSC) by default for pages (`export const dynamic = 'force-dynamic'`). Interactive forms and test controls are isolated in `'use client'` leaf components.

2. **Action & Retrieval Layer (`actions/`, `lib/rag/`, `app/api/knowledge/`)**
   - Server Actions (`'use server'`) handle state mutations such as login, signup, logout, and solar profile upserts.
   - RAG Retrieval Engine (`lib/rag/retrieval.ts`): Accepts natural-language query -> generates 1536-dim embedding via `lib/ai/embeddings.ts` -> executes pgvector similarity search -> returns structured source passages with full provenance metadata.
   - **No LLM Generation Step**: Phase 3 contains NO LLM answer generation or chatbot capability. Retrieval operates independently.
   - Search API (`app/api/knowledge/search/route.ts`): Protected endpoint for knowledge querying.
   - Admin Ingestion API (`app/api/knowledge/ingest/route.ts`): Protected endpoint requiring explicit `KNOWLEDGE_ADMIN_USER_IDS` authorization.

3. **Data Access Layer / DAL (`lib/dal/`)**
   - Server-only modules (`import 'server-only'`) providing domain-specific functions (`getCurrentUser()`, `getSolarProfile()`, `executeVectorSearch()`).
   - Standard user operations and knowledge retrieval use `SSR_Server_Client` (`lib/db/client.ts`) created via `@supabase/ssr` with the public anon key and cookies. Row Level Security (RLS) is automatically enforced by PostgreSQL (`status = 'published'`).

4. **Infrastructure & Security Layer (`supabase/`, `lib/db/`, `lib/ai/`)**
   - PostgreSQL database hosted on Supabase with `pgvector` extension.
   - Gemini Embedding Service (`lib/ai/embeddings.ts`): Generates 1536-dimensional embeddings using `gemini-embedding-001`.
   - `GEMINI_API_KEY` stored exclusively in server environment variables (`.env.local`), never exposed to client code.
   - HNSW index on `document_chunks.embedding` using cosine distance (`vector_cosine_ops`).

---

## Security & Admin Access Strategy

- **Knowledge Retrieval**: Publicly searchable by all authenticated users via SSR client with RLS (`status = 'published'`).
- **Knowledge Admin Ingestion**: Ingestion routines are restricted to explicitly listed `KNOWLEDGE_ADMIN_USER_IDS`. Unauthorized insertion/modification attempts return HTTP 403 Forbidden.
- **Service-Role Key**: Never imported or used in standard user request paths or client components.
