export type ExtractedDocument = {
  text: string
  numPages: number
  info?: Record<string, unknown>
}

/**
 * Extracts raw text from a PDF Buffer.
 */
export async function extractTextFromPdf(pdfBuffer: Buffer): Promise<ExtractedDocument> {
  try {
    // Dynamic import to support both CJS and ESM environments cleanly
    const pdfParseModule = await import('pdf-parse')
    const pdfParse = ((pdfParseModule as unknown as { default?: typeof pdfParseModule }).default ||
      pdfParseModule) as unknown as (b: Buffer) => Promise<{ text?: string; numpages?: number; info?: Record<string, unknown> }>
    const data = await pdfParse(pdfBuffer)
    return {
      text: data.text || '',
      numPages: data.numpages || 1,
      info: data.info || {},
    }
  } catch (error) {
    throw new Error(`Failed to parse PDF document: ${error instanceof Error ? error.message : String(error)}`)
  }
}
