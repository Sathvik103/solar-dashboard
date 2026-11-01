import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { Sample } from './types.js'

/**
 * Store-and-forward buffer. Samples are appended to a JSON-lines file before upload, so a power cut
 * or network outage loses nothing. Uploads remove samples from the head only after the server has
 * acknowledged them; the server deduplicates on (device, ts), so re-sending after a crash is safe.
 */
export class DiskBuffer {
  constructor(
    private readonly file: string,
    private readonly maxSamples: number
  ) {}

  async append(samples: Sample[]): Promise<void> {
    if (!samples.length) return
    await mkdir(dirname(this.file), { recursive: true })
    await appendFile(this.file, samples.map((s) => JSON.stringify(s)).join('\n') + '\n')
  }

  async readAll(): Promise<Sample[]> {
    try {
      const text = await readFile(this.file, 'utf8')
      const out: Sample[] = []
      for (const line of text.split('\n')) {
        if (!line.trim()) continue
        try {
          out.push(JSON.parse(line) as Sample)
        } catch {
          // A torn last line from a crash mid-write is skipped.
        }
      }
      return out
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw err
    }
  }

  /** Rewrites the file atomically, dropping the oldest samples beyond the cap. */
  async replace(samples: Sample[]): Promise<number> {
    const kept = samples.slice(-this.maxSamples)
    await mkdir(dirname(this.file), { recursive: true })
    const tmp = `${this.file}.tmp`
    await writeFile(tmp, kept.length ? kept.map((s) => JSON.stringify(s)).join('\n') + '\n' : '')
    await rename(tmp, this.file)
    return samples.length - kept.length
  }
}
