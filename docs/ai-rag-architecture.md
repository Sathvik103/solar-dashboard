# AI & RAG Retrieval Architecture: Solar Intelligence Platform

## 1. Grounding Philosophy
> **"NO RETRIEVAL = NO REGULATORY ANSWER"**

The Solar Intelligence Platform avoids regulatory hallucination by enforcing that all legal, tariff, net-metering, and subsidy claims are strictly retrieved from authoritative government publications.

---

## 2. Ingestion Pipeline (`lib/rag/ingestion.ts` & `scripts/ingest-knowledge.ts`)
```
PDF / Document Source
         ↓
[Structure-Aware Chunking] (lib/rag/chunker.ts)
- maxChunkSize: 800 tokens, minChunkSize: 150 tokens, overlap: 100 tokens
- Preserves Page numbers & Section Headers
         ↓
[Content Hash Generation (SHA-256)]
- Prevents duplicate documents on re-ingestion
         ↓
[1536-dim Gemini Embeddings] (lib/ai/embeddings.ts)
- Uses model: gemini-embedding-001 (fallback text-embedding-004)
- outputDimensionality: 1536
         ↓
[Supabase pgvector Storage]
- public.documents & public.document_chunks
- HNSW Index with vector_cosine_ops
```

---

## 3. Dense Retrieval & Hybrid Filtering (`lib/rag/retrieval.ts`)
1. **Query Normalization:** Strips punctuation, normalizes solar capacity units (kW, kWp, kilowatt).
2. **Query Embedding:** Generates 1536-dimensional embedding of the user's natural language query via Gemini API.
3. **RPC Similarity Search:** Executes `match_document_chunks` stored procedure in Supabase PostgreSQL.
4. **Metadata Filtering:** Optional filters on `organization` (TGERC, TGREDCO, TSSPDCL, MNRE) and `document_type`.
5. **Score Filtering & Ranking:** Applies `similarityThreshold` (default 0.25) and returns top-K results sorted by cosine similarity.
6. **Provenance Extraction:** Extracts title, organization, official URL, page number, and section title for UI display and citation links.

---

## 4. Citation Formatting (`lib/ai/citations.ts`)
Retrieved chunks are formatted as clean source context blocks for LLM reasoning and transformed into structured UI badges with direct links to official government PDF files.
