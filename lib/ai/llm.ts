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

export async function generateLLMResponse(
  messages: LLMMessage[],
  options: GenerateOptions = {}
): Promise<string> {
  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    throw new Error(
      'Missing GEMINI_API_KEY. Please provide a valid Gemini API key in your server environment.'
    )
  }

  const ai = new GoogleGenAI({ apiKey })
  const systemInstruction = options.systemPrompt
  const models = options.model ? [options.model] : MODEL_CHAIN

  // Format contents for Gemini API
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  const failures: string[] = []
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
          temperature: options.temperature ?? 0.2,
          // Thinking models spend part of the budget on reasoning tokens.
          maxOutputTokens: options.maxTokens ?? 8192,
          abortSignal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        },
      })
      const text = response.text
      if (text) return text
      failures.push(`${model}: empty response (${response.candidates?.[0]?.finishReason ?? 'unknown'})`)
    } catch (error) {
      failures.push(`${model}: ${errorMessage(error)}`)
    }
  }
  throw new Error(`Gemini LLM generation failed: ${failures.join(' | ')}`)
}

/**
 * Returns an async generator yielding text chunks for streaming responses.
 */
export async function* streamLLMResponse(
  messages: LLMMessage[],
  options: GenerateOptions = {}
): AsyncGenerator<string, void, unknown> {
  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY in server environment.')
  }

  const ai = new GoogleGenAI({ apiKey })
  const systemInstruction = options.systemPrompt
  const modelName = options.model || MODEL_CHAIN[0]

  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  try {
    const responseStream = await ai.models.generateContentStream({
      model: modelName,
      contents,
      config: {
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxTokens ?? 8192,
      },
    })

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text
      }
    }
  } catch (error) {
    // If stream fails, yield fallback error message
    throw new Error(`Streaming failed: ${errorMessage(error) || error}`)
  }
}
