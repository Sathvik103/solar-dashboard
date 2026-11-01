# Assistant

`lib/agent/orchestrator.ts` runs the cheapest steps first and calls the language model last.

| Step | Module | Model call? |
| --- | --- | --- |
| 1. Input guardrails: injection, small talk, off-topic | `guardrails.ts` | No |
| 2. Profile load | `dal/solar-profiles` | No |
| 3. Plan intent and tools (follow-ups resolved against the previous question) | `planner.ts` | No |
| 4. Deterministic tools and chart/table artifacts | `tools/*`, `artifacts.ts` | No |
| 5. Exact answers for subsidy-for-N-kW and bill-for-N-units | `deterministic.ts` | No |
| 6. Document retrieval (skipped for questions about the user's own data) | `rag/retrieval` | Embedding only |
| 7. Answer cache, keyed by question + full context + recent conversation (12 h) | `cache.ts` | No |
| 8. Daily per-user model budget (`LLM_DAILY_LIMIT`, default 40) | `budget.ts` | No |
| 9. Model with the last 6 messages for follow-ups | `ai/llm.ts` | Yes |
| 10. Output checks: untraced rupee amounts flagged, emojis and self-references removed | `guardrails.ts` | No |
| 11. Regulatory verifier, cache write, run log | `verifier.ts` | No |

## Hallucination controls

- The system prompt restricts scope and forbids outside numbers; the model sees only the profile,
  calculator outputs, retrieved passages and the conversation.
- Every chart in an answer is built from calculator output, never by the model.
- Any rupee amount in the answer that is not present in (or a sum or difference of) the context is listed
  under the answer as untraced; such answers are never cached.
- Regulatory claims without a retrieved source get a verification notice.

## Memory

Conversations and messages are stored in `conversations` / `messages` (with `artifacts` and
`suggestions`), listed in the assistant panel's history, and the last six messages are sent with each new
question.

## Cost visibility

`llm_usage` records model, tokens, latency and outcome for every call. Each answer reports its `source`:
`guardrail`, `deterministic`, `cache`, `model`, `budget` or `fallback`.
