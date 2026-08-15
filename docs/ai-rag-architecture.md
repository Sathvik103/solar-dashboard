# RAG Retrieval System Architecture — Phase 3 Specification

## Overview

The Solar Intelligence Platform Knowledge Base provides grounded, deterministic retrieval of authoritative solar regulations, subsidies, and technical documents focused on Telangana / Hyderabad.

> [!IMPORTANT]
> **Hard Phase 3 Boundary**: The RAG system operates **strictly without an LLM generation step**. It performs vector embedding, database search via `pgvector`, and source provenance scoring. Answer generation, chatbots, and agents are deferred to Phase 4+.

---

## Technical Specifications

| Parameter | Configuration | Rationale / Detail |
| :--- | :--- | :--- |
| **Embedding Provider** | Google Gemini API | Centralized via `lib/ai/embeddings.ts` |
| **Embedding Model** | `gemini-embedding-001` | High-quality multilingual semantic embeddings |
| **Vector Dimension** | 1536 | Validated at API boundary before database insertion |
| **Similarity Metric** | Cosine Similarity (`<=>` distance) | Standard for text embeddings |
| **Vector Database Index** | HNSW (`vector_cosine_ops`) | High-performance sub-linear ANN search in PostgreSQL |
| **Default Top-K** | `5` | Configurable per retrieval request (1 to 20) |
| **Similarity Threshold** | `0.5` (default) / `0.3` (relaxed) | Configurable filtering threshold |
| **Document Status** | `published` | Draft and archived documents are excluded from user retrieval |

---

## Pipeline Operations

### 1. Ingestion Pipeline (`lib/rag/ingestion.ts`)
- **Admin Authorization**: Verified against server-side `KNOWLEDGE_ADMIN_USER_IDS` allowlist (returns 403 for unauthorized users).
- **Approved Domain Check**: Restricts external HTTP URLs to official domains (`tgerc.telangana.gov.in`, `tgredco.telangana.gov.in`, `tssouthernpower.com`, `pmsuryaghar.gov.in`, `mnre.gov.in`).
- **Structure-Aware Chunking**: Splits documents into chunks respecting section headings, page boundaries, and maximum token windows (~800 chars / ~200 tokens).
- **Embedding Generation**: Calls Gemini API to generate 1536-dimensional vectors.
- **Persistence**: Writes parent document and child chunks to PostgreSQL with content hash deduplication.

### 2. Retrieval Engine (`lib/rag/retrieval.ts`)
- **Input**: Natural-language query string (e.g. *"What are the rooftop solar net-metering rules in Telangana?"*).
- **Embedding**: Generates 1536-dim query embedding using Gemini.
- **RPC Similarity Query**: Invokes `match_document_chunks` RPC function via Supabase SSR client with anon key.
- **Output**: Structured `RetrievalResult[]` containing chunk content, page number, section title, similarity score, and complete parent document metadata (title, organization, source URL, document type, location scope, dates, version).

---

## Evaluation Benchmark

The system includes a 10-query retrieval benchmark suite (`lib/rag/evaluation.ts`) covering key Telangana rooftop solar topics:
1. Telangana net-metering rules (TGERC)
2. Eligible rooftop solar capacity limits (TGERC)
3. Application process and portal procedures (TGREDCO)
4. Central Financial Assistance / PM Surya Ghar subsidy slabs (MNRE)
5. Required documents for TSSPDCL net-metering applications (TSSPDCL)
6. DISCOM technical feasibility and inspection role (TSSPDCL)
7. Net metering definition & carry-forward rules (TGERC)
8. Gross metering rules (TGERC)
9. Group and virtual net metering definitions (TGERC)
10. Regulatory authority verification (TGERC)

Retrieval evaluation benchmarks accuracy by measuring whether expected authoritative sources appear in top-K results with accurate similarity scores (**without an LLM judge**).
