import pdfParse from 'pdf-parse'

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
