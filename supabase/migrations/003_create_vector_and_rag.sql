-- Migration: 003_create_vector_and_rag.sql
-- Description: Enables pgvector, creates documents and document_chunks tables, HNSW cosine index, RLS policies, and match_document_chunks RPC function.

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 2. Documents table
CREATE TABLE IF NOT EXISTS public.documents (
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

-- 3. Document chunks table
CREATE TABLE IF NOT EXISTS public.document_chunks (
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

-- 4. HNSW Index on embedding vector(1536) using cosine distance
CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx
  ON public.document_chunks
  USING hnsw (embedding vector_cosine_ops);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS set_documents_updated_at ON public.documents;
CREATE TRIGGER set_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_document_chunks_updated_at ON public.document_chunks;
CREATE TRIGGER set_document_chunks_updated_at
  BEFORE UPDATE ON public.document_chunks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Row Level Security
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Read policies: Normal users can read published documents and their chunks
DROP POLICY IF EXISTS "documents_select_published" ON public.documents;
CREATE POLICY "documents_select_published"
  ON public.documents FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "document_chunks_select_published" ON public.document_chunks;
CREATE POLICY "document_chunks_select_published"
  ON public.document_chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_chunks.document_id AND d.status = 'published'
    )
  );

-- Admin/Ingestion write policies: Only service_role or admin procedures can modify knowledge data
DROP POLICY IF EXISTS "documents_admin_all" ON public.documents;
CREATE POLICY "documents_admin_all"
  ON public.documents FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "document_chunks_admin_all" ON public.document_chunks;
CREATE POLICY "document_chunks_admin_all"
  ON public.document_chunks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Vector Similarity Search RPC Function
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
