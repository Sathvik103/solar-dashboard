# Solar Intelligence Platform — Evaluation Benchmark Suite

## 1. Evaluation Overview
The platform includes rigorous, automated evaluation benchmarks covering:
1. **Dense Vector RAG Retrieval Quality:** 30 authoritative Telangana solar queries evaluated against `match_document_chunks` pgvector cosine similarity search.
2. **Deterministic & ML Output Quality:** Validation test sets evaluating regression metrics against physics benchmarks.
3. **Response Groundedness & Verification:** Safety checks validating citation coverage, tool arithmetic consistency, and regulatory disclaimers.

---

## 2. RAG Evaluation Metrics (`lib/rag/evaluation.ts`)
The benchmark executes across 30 test queries spanning:
- **Regulations:** TGERC Regulation 1 of 2016, net metering definitions, annual settlement cycles.
- **Eligibility:** Capacity limits (1000 kW ceiling, 100% sanctioned load constraint).
- **Subsidies:** PM Surya Ghar CFA slabs (₹30,000/kW up to 2kW, ₹78,000 for ≥3kW, DBT mechanism).
- **Application Procedures:** TSSPDCL feasibility, single line diagrams (SLD), bi-directional meter specs, joint inspection.
- **Tariffs:** Domestic LT-1 telescopic slab offsets and excess credit accounting.

### Calculated Metrics:
- **Retrieval Hit Rate (%):** Percentage of queries where expected authoritative organization was present in top-5 retrieved chunks.
- **Top-1 Accuracy (%):** Percentage of queries where top retrieved chunk belonged to expected authority.
- **Top-3 Accuracy (%):** Percentage of queries where expected authority appeared in top-3 ranks.
- **Mean Reciprocal Rank (MRR):**
  \[
  \text{MRR} = \frac{1}{|Q|} \sum_{i=1}^{|Q|} \frac{1}{\text{rank}_i}
  \]
- **Average Cosine Similarity:** Mean top-1 cosine similarity score.

---

## 3. Automated Benchmark Execution
- **CLI / Vitest:** Evaluated via unit test suites (`npm test`).
- **REST API:** Live benchmark trigger available at `GET /api/eval`.
- **Knowledge Base UI:** Interactive "Run Benchmark Evaluation" button on `/knowledge` displaying real-time metrics cards.
