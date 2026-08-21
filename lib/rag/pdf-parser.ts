export type ExtractedDocument = {
  text: string
  numPages: number
  info?: Record<string, any>
}

/**
 * Extracts raw text from a PDF Buffer.
 */
export async function extractTextFromPdf(pdfBuffer: Buffer): Promise<ExtractedDocument> {
  try {
    // Dynamic import to support both CJS and ESM environments cleanly
    const pdfParseModule = await import('pdf-parse')
    const pdfParse = (pdfParseModule as any).default || pdfParseModule
    const data = await pdfParse(pdfBuffer)
    return {
      text: data.text || '',
      numPages: data.numpages || 1,
      info: data.info || {},
    }
  } catch (error: any) {
    throw new Error(`Failed to parse PDF document: ${error.message || error}`)
  }
}
