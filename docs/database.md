# Database Schema & Migrations: Solar Intelligence Platform

## Overview
The platform database is built on PostgreSQL 15+ hosted on Supabase, with Row Level Security (RLS) enabled across all tables and `pgvector` for dense similarity search.

---

## 1. Schema Tables

### A. `public.users`
Managed alongside Supabase Auth.
- `id` (UUID, PK, references `auth.users`)
- `email` (TEXT)
- `full_name` (TEXT)
- `avatar_url` (TEXT)
- `created_at` / `updated_at` (TIMESTAMPTZ)

### B. `public.solar_profiles`
Stores user-entered energy and property telemetry.
- `id` (UUID, PK)
- `user_id` (UUID, FK -> `users.id` ON DELETE CASCADE)
- `city` (TEXT, default 'Hyderabad')
- `state` (TEXT, default 'Telangana')
- `district` / `pincode` (TEXT)
- `monthly_bill_inr` (NUMERIC)
- `monthly_units_kwh` (NUMERIC)
- `electricity_tariff_inr` (NUMERIC)
- `roof_area_sqft` (NUMERIC)
- `roof_type` (TEXT)
- `roof_orientation` (TEXT)
- `shading_level` (TEXT)
- `budget_inr` (NUMERIC)
- `preferred_capacity_kw` (NUMERIC)
- `battery_preference` (TEXT)

### C. `public.documents`
Authoritative government and regulatory source publications.
- `id` (UUID, PK)
- `title` (TEXT)
- `source` (TEXT)
- `source_url` (TEXT)
- `organization` (TEXT) - e.g. TGERC, TGREDCO, TSSPDCL, MNRE
- `document_type` (TEXT) - e.g. Regulation, Technical Guideline
- `location_scope` (TEXT, default 'Telangana')
- `publication_date` / `effective_date` (DATE)
- `version` (TEXT)
- `content_hash` (TEXT UNIQUE)
- `status` (TEXT) - 'draft' | 'published' | 'archived'

### D. `public.document_chunks`
Structure-aware chunked text passages with 1536-dimensional embeddings.
- `id` (UUID, PK)
- `document_id` (UUID, FK -> `documents.id` ON DELETE CASCADE)
- `chunk_index` (INT)
- `content` (TEXT)
- `token_count` (INT)
- `page_number` (INT)
- `section_title` (TEXT)
- `metadata` (JSONB)
- `embedding` (vector(1536))
- **Index:** `document_chunks_embedding_hnsw_idx` USING `hnsw (embedding vector_cosine_ops)`

### E. `public.conversations`
Persistent multi-turn chat sessions.
- `id` (UUID, PK)
- `user_id` (UUID, FK -> `users.id` ON DELETE CASCADE)
- `title` (TEXT)
- `created_at` / `updated_at` (TIMESTAMPTZ)

### F. `public.messages`
Individual messages within a conversation.
- `id` (UUID, PK)
- `conversation_id` (UUID, FK -> `conversations.id` ON DELETE CASCADE)
- `user_id` (UUID, FK -> `users.id` ON DELETE CASCADE)
- `role` (TEXT) - 'user' | 'assistant' | 'system' | 'tool'
- `content` (TEXT)
- `citations` (JSONB)
- `tool_calls` (JSONB)
- `trace_events` (JSONB)

### G. `public.agent_runs`
Observability log of agent runs.
- `id` (UUID, PK)
- `user_id` (UUID, FK -> `users.id` ON DELETE CASCADE)
- `conversation_id` (UUID, FK -> `conversations.id`)
- `request` (TEXT)
- `status` (TEXT) - 'running' | 'completed' | 'failed'
- `tools_used` (JSONB)
- `retrieval_count` (INT)
- `verification_status` (TEXT)
- `latency_ms` (INT)

---

## 2. Stored Procedures & Vector RPC
- `public.match_document_chunks`:
  Takes `(query_embedding vector(1536), match_count INT, similarity_threshold FLOAT, filter_location_scope TEXT, filter_document_type TEXT, filter_organization TEXT)` and returns sorted matching chunks with cosine similarity:
  \[
  \text{similarity} = 1 - (c.\text{embedding} \Leftrightarrow \text{query\_embedding})
  \]

---

## 3. Row Level Security (RLS) Summary
- `users`: Users can only read/update their own profile.
- `solar_profiles`: Users can only read/update their own solar profile.
- `documents` & `document_chunks`: Public SELECT for `status = 'published'`. INSERT/UPDATE restricted to `service_role` or authorized admin IDs.
- `conversations` & `messages`: Users can only SELECT, INSERT, UPDATE, and DELETE their own records (`auth.uid() = user_id`).
- `agent_runs`: Users can only view their own execution logs.
