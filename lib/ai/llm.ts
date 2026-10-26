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

const DEFAULT_MODEL = 'gemini-2.5-flash'
const FALLBACK_MODEL = 'gemini-1.5-flash'

/**
 * Executes a text generation request with Gemini.
 */
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
  const modelName = options.model || DEFAULT_MODEL

  // Format contents for Gemini API
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxTokens ?? 2048,
      },
    })

    const text = response.text
    if (!text) {
      throw new Error('Gemini API returned an empty response text')
    }
    return text
  } catch (error) {
    if (modelName !== FALLBACK_MODEL) {
      // Retry once with fallback model
      try {
        const fallbackRes = await ai.models.generateContent({
          model: FALLBACK_MODEL,
          contents,
          config: {
            systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
            temperature: options.temperature ?? 0.2,
          },
        })
        if (fallbackRes.text) return fallbackRes.text
      } catch (fallbackErr) {
        throw new Error(`Gemini LLM generation failed: ${errorMessage(fallbackErr) || errorMessage(error)}`)
      }
    }
    throw new Error(`Gemini LLM generation failed: ${errorMessage(error) || error}`)
  }
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
  const modelName = options.model || DEFAULT_MODEL

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
        maxOutputTokens: options.maxTokens ?? 2048,
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
