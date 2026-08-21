# System Architecture: Solar Intelligence Platform

## 1. High-Level Architecture Overview

The Solar Intelligence Platform is built on a modular server-first architecture combining Next.js 16 App Router, Supabase PostgreSQL with `pgvector`, Gemini LLM and Embedding models, deterministic physics calculation tools, and an autonomous Agent Orchestrator with formal verification guardrails.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                              │
│   (Landing, Dashboard, AI Advisor /chat, Solar Studio /analysis, KB)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Agent & AI Orchestration Layer                      │
│   - Planner & Intent Classifier (lib/agent/planner.ts)                 │
│   - Safe Deterministic Tool Executor (lib/agent/executor.ts)           │
│   - RAG Grounding & Citations Engine (lib/ai/citations.ts)             │
│   - Gemini 2.5 LLM Synthesis Service (lib/ai/llm.ts)                   │
│   - Verification & Safety Guardrail Agent (lib/agent/verifier.ts)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                Deterministic Tools & ML Subsystems                     │
│   - 10 Specialized Calculation Tools (lib/agent/tools/*)               │
│   - Solar Sizing & Tariff Slabs (lib/calculations/*)                   │
│   - Deccan Plateau ML Regression Model (lib/ml/*)                      │
│   - Dense pgvector RAG Engine (lib/rag/retrieval.ts)                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                     Data Access Layer (DAL)                            │
│   (Server-only: Users, Solar Profiles, Knowledge, Conversations)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                   Database & Cloud Infrastructure                      │
│   (Supabase PostgreSQL + pgvector, RLS Policies, Gemini 1536-dim Embed)│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Subsystems

### A. Autonomous Agent Orchestrator (`lib/agent/`)
- **Intent Classification & Planning (`planner.ts`):** Evaluates natural-language queries into structured intents (`full_solar_plan`, `compare_options`, `financial_roi`, `application_guide`, `regulatory_inquiry`).
- **Safe Tool Execution (`executor.ts`):** Executes scheduled deterministic tools with error boundaries and strict step caps (`MAX_AGENT_STEPS = 6`).
- **Response Verification (`verifier.ts`):** Audits candidate answers for arithmetic consistency with tool outputs, verifies presence of authoritative citations, and enforces regulatory disclaimers.
- **Trace Observability (`orchestrator.ts`):** Logs granular execution trace events (`intent_detection`, `profile_load`, `tool_call`, `retrieval`, `synthesis`, `verification`) into the `agent_runs` table in PostgreSQL.

### B. Deterministic Calculation Engine (`lib/calculations/` & `lib/agent/tools/`)
- **Tariff Slab Calculations (`tariffs.ts`):** Telangana TSSPDCL domestic LT-1 telescopic billing slabs (0-100, 101-200, 201-300, 301-400, 401-500, >500 units).
- **System Sizing Recommender (`systemSizing.ts`):** Sizes systems to offset 90-100% of consumption subject to roof area constraints (90 sq.ft/kW) and TGERC regulations.
- **Financial Projections (`financial.ts`):** 25-year Net Present Value (NPV), dynamic payback period with 3% tariff escalation, PM Surya Ghar subsidy deductions (₹78,000 max), and carbon reduction metrics.

### C. Regional Machine Learning Subsystem (`lib/ml/`)
- **Physics-Informed Climate Model:** Multi-variable regression model trained on Deccan plateau GHI and ambient temperature data.
- **Predictions:** 12-month generation curves with 95% confidence intervals, seasonal monsoon derating, and cell temperature degradation (\(-0.38\% / ^\circ\text{C}\) above 25°C).

### D. Dense Vector RAG Pipeline (`lib/rag/`)
- **Curated Authoritative Knowledge Base:** TGERC Regulation 1 of 2016, TGREDCO Technical Guidelines, TSSPDCL Net-Metering Guide, and MNRE PM Surya Ghar Operational Guidelines.
- **Embeddings:** 1536-dimensional vectors generated via `gemini-embedding-001`.
- **Search:** `match_document_chunks` RPC function using HNSW cosine distance indexing in pgvector.

### E. Persistent Memory & Data Access Layer (`lib/dal/`)
- **User Profiles:** `solar_profiles` table.
- **Conversations & Messages:** Multi-turn chat persistence with RLS in `conversations` and `messages` tables.
- **Agent Runs:** Real-time observability and audit logging in `agent_runs`.
