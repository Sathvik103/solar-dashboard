export type ChunkOptions = {
  maxChunkSize?: number // target characters per chunk (default 800)
  minChunkSize?: number // minimum characters per chunk (default 150)
  overlap?: number // character overlap (default 100)
}

export type GeneratedChunk = {
  chunkIndex: number
  content: string
  tokenCount: number
  pageNumber: number | null
  sectionTitle: string | null
  metadata: Record<string, any>
}

/**
 * Estimates token count for a text string (~4 chars per token average).
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.trim().length / 4)
}

/**
 * Structure-aware, deterministic document chunker.
 * Respects section headings, page markers, and paragraph boundaries.
 */
export function chunkDocument(
  fullText: string,
  options: ChunkOptions = {}
): GeneratedChunk[] {
  const maxChunkSize = options.maxChunkSize || 800
  const minChunkSize = options.minChunkSize || 150
  const overlap = options.overlap || 100

  if (!fullText || fullText.trim().length === 0) {
    return []
  }

  // Detect explicit page markers e.g. "--- Page 1 ---" or "\f"
  const pageSections = fullText.split(/(?:--- Page (\d+) ---|\f)/gi)

  const rawBlocks: { text: string; page: number | null; section: string | null }[] = []
  let currentPage: number | null = 1
  let currentSection: string | null = null

  const lines = fullText.split('\n')
  let currentBlock: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    // Page marker check
    const pageMatch = trimmed.match(/^--- Page (\d+) ---$/i)
    if (pageMatch) {
      // If there is accumulated text for the previous page, finalize it as a block
      if (currentBlock.length > 0) {
        rawBlocks.push({ text: currentBlock.join('\n'), page: currentPage, section: currentSection })
        currentBlock = []
      }
      currentPage = parseInt(pageMatch[1], 10)
      continue
    }

    // Heading check (# Heading, SECTION 1, REGULATION 3, etc.)
    const headingMatch = trimmed.match(/^(?:#{1,3}\s+|SECTION\s+\d+|REGULATION\s+\d+|[A-Z0-9\s.]{4,40}:)/i)
    if (headingMatch) {
      if (currentBlock.length > 0) {
        rawBlocks.push({ text: currentBlock.join('\n'), page: currentPage, section: currentSection })
        currentBlock = []
      }
      currentSection = trimmed.replace(/^#{1,3}\s+/, '')
      currentBlock.push(trimmed)
      continue
    }

    currentBlock.push(line)

    if (currentBlock.join('\n').length >= maxChunkSize) {
      rawBlocks.push({ text: currentBlock.join('\n'), page: currentPage, section: currentSection })
      currentBlock = []
    }
  }

  if (currentBlock.length > 0) {
    rawBlocks.push({ text: currentBlock.join('\n'), page: currentPage, section: currentSection })
  }

  const chunks: GeneratedChunk[] = []
  let chunkIndex = 0

  for (const block of rawBlocks) {
    const text = block.text.trim()
    if (text.length === 0) continue

    if (text.length <= maxChunkSize) {
      chunks.push({
        chunkIndex: chunkIndex++,
        content: text,
        tokenCount: estimateTokenCount(text),
        pageNumber: block.page,
        sectionTitle: block.section,
        metadata: {},
      })
    } else {
      // Split large blocks with sliding window and overlap
      let start = 0
      while (start < text.length) {
        let end = start + maxChunkSize
        if (end < text.length) {
          // Break at nearest paragraph/newline
          const lastSpace = text.lastIndexOf('\n', end)
          if (lastSpace > start + minChunkSize) {
            end = lastSpace
          }
        }

        const chunkText = text.slice(start, end).trim()
        if (chunkText.length > 0) {
          chunks.push({
            chunkIndex: chunkIndex++,
            content: chunkText,
            tokenCount: estimateTokenCount(chunkText),
            pageNumber: block.page,
            sectionTitle: block.section,
            metadata: {},
          })
        }
        start = end - overlap
        if (start >= text.length - minChunkSize) break
      }
    }
  }

  return chunks
}
