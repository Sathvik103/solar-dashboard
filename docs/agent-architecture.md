# Solar Intelligence Platform — Agent Architecture

## 1. Overview & Core Philosophy
The Solar Intelligence Platform operates on a fundamental principle:
> **Deterministic calculations for arithmetic, authoritative RAG retrieval for regulatory facts, and LLMs strictly for intent synthesis, explanation, and reasoning.**

The AI agent does **not** invent solar generation figures, subsidy amounts, or payback years through mental math. Instead, it coordinates specialized deterministic tools, executes vector similarity search across verified government policy documents, verifies candidate claims, and formats answers with complete provenance citations.

---

## 2. The 6-Step Agentic Loop
```
User Query + Solar Profile
           ↓
[1. Intent Classification & Planning] (lib/agent/planner.ts)
           ↓
[2. Deterministic Tool Execution] (lib/agent/executor.ts)
           ↓
[3. Dense RAG Vector Retrieval] (lib/rag/retrieval.ts → pgvector)
           ↓
[4. Grounded Context Synthesis] (lib/ai/llm.ts → Gemini 2.5)
           ↓
[5. Formal Response Verification] (lib/agent/verifier.ts)
           ↓
[6. Trace Logging & Observability] (Supabase agent_runs table)
```

---

## 3. Deterministic Tool Registry (`lib/agent/tools/`)
The agent has access to 10 specialized tools:
1. `calculateSolarOutput`: Computes monthly & annual yield in kWh, capacity factor (CUF), and shading loss deratings.
2. `calculateSystemCost`: Calculates benchmark capital cost, PM Surya Ghar central subsidy, and net payable investment.
3. `calculateSavings`: Estimates monthly/annual bill reduction using Telangana TSSPDCL telescopic domestic slabs.
4. `calculatePayback`: Calculates simple and dynamic payback periods accounting for 3% annual tariff escalation.
5. `calculateROI`: Computes 25-year Net Present Value (NPV), internal rate of return, and lifetime cashflow projections.
6. `getSolarProfile`: Fetches the authenticated user's location, monthly usage, bill, and roof dimensions.
7. `getTariffInformation`: Provides current Telangana electricity tariff structure and net metering annual buyback rates.
8. `compareSystems`: Compares 2kW, 3kW, 5kW, 7kW, and 10kW options side-by-side.
9. `searchKnowledge`: Vector search interface over TGERC, TGREDCO, TSSPDCL, and MNRE policy chunks.
10. `createSolarPlan`: Assembles an end-to-end solar proposal with recommended capacity, financial metrics, and step-by-step roadmap.

---

## 4. Execution Trace Events
Every consultation generates safe structured execution events that the user can inspect in the UI:
- `intent_detection`: Classified intent (e.g. `full_solar_plan`, `financial_roi`, `regulatory_inquiry`).
- `profile_load`: Loaded user's location, monthly bill, and roof area.
- `tool_call`: Live inputs and outputs of executed deterministic tools.
- `retrieval`: Chunks retrieved with cosine similarity scores and page numbers.
- `verification`: Formal verification checks passed and any safety disclaimers added.
- `synthesis`: Final response generation latency and status.
