import 'server-only'

import { GoogleGenAI } from '@google/genai'
import { errorMessage } from '@/lib/utils'

function getGeminiApiKey(): string | null {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || null
}

export type LLMMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export type GenerateOptions = {
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  model?: string
}

/**
 * Model chain, tried in order. Override the first with GEMINI_MODEL. gemini-2.5/1.5 IDs are retired
 * for new API keys (HTTP 404), so they must not be used here.
 */
const MODEL_CHAIN = [process.env.GEMINI_MODEL, 'gemini-3.5-flash', 'gemini-3.1-flash-lite'].filter(
  (m, i, all): m is string => !!m && all.indexOf(m) === i
)
/** Per-attempt timeout; a slow primary falls through to the next model. */
const ATTEMPT_TIMEOUT_MS = 25_000

/**
 * Executes a text generation request with Gemini.
 */
export type LLMResult = {
  text: string
  model: string
  inputTokens: number | null
  outputTokens: number | null
  latencyMs: number
}

/**
 * Reads a document (PDF or image) and returns JSON matching `jsonSchema`. Uses the model's structured
 * output mode, so the response is machine-parseable; callers must still validate it.
 */
export async function extractFromDocument(input: {
  prompt: string
  mimeType: string
  base64: string
  jsonSchema: unknown
}): Promise<LLMResult> {
  const apiKey = getGeminiApiKey()
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY')
  const ai = new GoogleGenAI({ apiKey })
  const failures: string[] = []
  for (const model of MODEL_CHAIN) {
    const t0 = Date.now()
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [{ inlineData: { mimeType: input.mimeType, data: input.base64 } }, { text: input.prompt }],
          },
        ],
        config: {
          temperature: 0,
          responseMimeType: 'application/json',
          responseJsonSchema: input.jsonSchema,
          maxOutputTokens: 4096,
          abortSignal: AbortSignal.timeout(45_000),
        },
      })
      if (response.text) {
        return {
          text: response.text,
          model,
          inputTokens: response.usageMetadata?.promptTokenCount ?? null,
          outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
          latencyMs: Date.now() - t0,
        }
      }
      failures.push(`${model}: empty response`)
    } catch (error) {
      failures.push(`${model}: ${errorMessage(error)}`)
    }
  }
  throw new Error(`Document extraction failed: ${failures.join(' | ')}`)
}

/** One logical answer: tries the model chain in order, returns text plus usage for budgeting. */
export async function generateWithUsage(messages: LLMMessage[], options: GenerateOptions = {}): Promise<LLMResult> {
  const apiKey = getGeminiApiKey()
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY')
  const ai = new GoogleGenAI({ apiKey })
  const models = options.model ? [options.model] : MODEL_CHAIN
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))

  const failures: string[] = []
  for (const model of models) {
    const t0 = Date.now()
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: options.systemPrompt ? { parts: [{ text: options.systemPrompt }] } : undefined,
          temperature: options.temperature ?? 0.2,
          maxOutputTokens: options.maxTokens ?? 8192,
          abortSignal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        },
      })
      if (response.text) {
        return {
          text: response.text,
          model,
          inputTokens: response.usageMetadata?.promptTokenCount ?? null,
          outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
          latencyMs: Date.now() - t0,
        }
      }
      failures.push(`${model}: empty response`)
    } catch (error) {
      failures.push(`${model}: ${errorMessage(error)}`)
    }
  }
  throw new Error(`Gemini LLM generation failed: ${failures.join(' | ')}`)
}
