# Database Documentation: Solar Intelligence Platform (Phase 3 Schema)

## Overview

The database uses PostgreSQL hosted on Supabase with the `pgvector` extension enabled for vector similarity search. Row Level Security (RLS) is active across all tables.

---

## Entity Relationship Diagram (Phase 3)

```
 auth.users (Supabase Auth)
     │
     ├─ 1:1 (Trigger: on_auth_user_created) ──► public.users ──► public.solar_profiles
     │
 public.documents (Authoritative Policy & Technical Sources)
     │
     └─ 1:N (FK: document_id ON DELETE CASCADE) ──► public.document_chunks (vector(1536))
```

---

## Phase 3 Database Tables & DDL

### 1. `public.documents` Table

Stores authoritative policy guidelines, tariffs, and regulation sources.

```sql
CREATE TABLE public.documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  source           TEXT NOT NULL,
  source_url       TEXT NOT NULL,
  organization     TEXT NOT NULL,
  document_type    TEXT NOT NULL,
  location_scope   TEXT NOT NULL DEFAULT 'Telangana',
  publication_date DATE,
  effective_date   DATE,
  version          TEXT,
  content_hash     TEXT NOT NULL UNIQUE,
  status           TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2. `public.document_chunks` Table

Stores structure-aware text chunks with 1536-dimensional Gemini vector embeddings.

```sql
CREATE TABLE public.document_chunks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  chunk_index   INT NOT NULL,
  content       TEXT NOT NULL,
  token_count   INT NOT NULL DEFAULT 0,
  page_number   INT,
  section_title TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding     vector(1536),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_document_chunk_index UNIQUE (document_id, chunk_index)
);

-- HNSW Cosine Distance Index
CREATE INDEX document_chunks_embedding_hnsw_idx
  ON public.document_chunks
  USING hnsw (embedding vector_cosine_ops);
```

### 3. Vector Similarity Search Function (`match_document_chunks`)

```sql
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  query_embedding vector(1536),
  match_count INT DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.5,
  filter_location_scope TEXT DEFAULT NULL,
  filter_document_type TEXT DEFAULT NULL,
  filter_organization TEXT DEFAULT NULL
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT,
  page_number INT,
  section_title TEXT,
  chunk_index INT,
  document_title TEXT,
  organization TEXT,
  source_url TEXT,
  document_type TEXT,
  location_scope TEXT,
  publication_date DATE,
  effective_date DATE,
  version TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS chunk_id,
    c.document_id,
    c.content,
    (1 - (c.embedding <=> query_embedding))::FLOAT AS similarity,
    c.page_number,
    c.section_title,
    c.chunk_index,
    d.title AS document_title,
    d.organization,
    d.source_url,
    d.document_type,
    d.location_scope,
    d.publication_date,
    d.effective_date,
    d.version
  FROM public.document_chunks c
  INNER JOIN public.documents d ON d.id = c.document_id
  WHERE d.status = 'published'
    AND c.embedding IS NOT NULL
    AND (1 - (c.embedding <=> query_embedding)) >= similarity_threshold
    AND (filter_location_scope IS NULL OR d.location_scope = filter_location_scope)
    AND (filter_document_type IS NULL OR d.document_type = filter_document_type)
    AND (filter_organization IS NULL OR d.organization = filter_organization)
  ORDER BY c.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;
```
