/**
 * guardrails.ts — deterministic checks that run before and after the language model.
 *
 * Input side (no model call is made unless the message passes):
 *   1. prompt-injection patterns are refused,
 *   2. greetings and thanks get a canned reply,
 *   3. messages with nothing to do with rooftop solar, electricity or this account are refused.
 *      Short follow-ups inside an existing conversation are allowed through.
 *
 * Output side:
 *   - rupee amounts in the answer must appear in the context the model was given (tool outputs,
 *     profile, readings, retrieved passages, the question or the conversation); otherwise they are
 *     flagged to the user,
 *   - emojis and self-references ("as an AI") are stripped.
 */

export type InputVerdict =
  | { kind: 'ok' }
  | { kind: 'injection' | 'off_topic' | 'smalltalk'; reply: string }

const INJECTION = [
  /\b(ignore|disregard|forget|override)\b.{0,40}\b(previous|prior|above|earlier|all|your|the|these)\b.{0,40}\b(instruction|prompt|rule|guideline|direction)s?\b/i,
  /\b(system|developer|hidden)\s+(prompt|message|instruction)s?\b/i,
  /\b(reveal|print|show|repeat|output)\b.{0,30}\b(prompt|instructions?|rules)\b/i,
  /\byou are now\b|\bact as (?!a solar)|\bpretend (to be|you are)\b|\broleplay\b|\bjailbreak\b|\bDAN\b|\bdeveloper mode\b/i,
  /<\/?(system|assistant|instructions?)>/i,
]

const DOMAIN = new RegExp(
  [
    'solar', 'photovoltaic', '\\bpv\\b', 'panel', 'module', 'inverter', 'battery', 'batteries', 'rooftop', 'roof',
    '\\bkw\\b', '\\bkwh\\b', '\\bkwp\\b', '\\d\\s*kw', 'watt', 'energy', 'electric', 'power', 'bill', 'tariff', 'slab',
    'units?\\b', 'subsid', 'net[- ]?meter', 'gross meter', 'metering', '\\bmeter', 'tsspdcl', 'tgspdcl', 'tsnpdcl',
    'tgerc', 'tgredco', 'discom', 'mnre', 'surya ghar', 'pm surya', 'appc', 'sanctioned load', 'load enhancement',
    'grid', 'export', 'import', 'generation', 'generat', 'yield', 'saving', 'payback', '\\broi\\b', 'cost', 'price',
    'install', 'installer', 'vendor', 'warranty', 'degradation', 'maintenance', 'cleaning', 'shading', 'shade',
    'irradiance', 'sunlight', 'sun hours', 'monsoon', 'weather', 'consumption', 'reading', 'device', 'telemetry',
    'carbon', 'co2', 'emission', 'hyderabad', 'telangana', 'emi', 'loan', 'application', 'documents?', 'portal',
    'my (data|system|profile|account|bills?|usage|readings?)', 'this month', 'last month', 'today',
  ].join('|'),
  'i'
)

const SMALLTALK = /^(hi+|hello|hey|namaste|good (morning|afternoon|evening)|thanks?|thank you|ok(ay)?|cool|great|bye|goodbye)[\s!.]*$/i
const FOLLOW_UP = /^(and|also|what about|how about|why|how|then|so|what if|ok so|is it|can i|should i|compare|explain|more|same|that|this|it)\b/i

export const SCOPE_REPLY =
  'I can only help with rooftop solar, electricity bills and tariffs in Telangana, subsidies and net metering, and the data in your account. Try asking about system size, savings, your readings, or the application process.'

export function checkInput(message: string, opts: { hasHistory: boolean }): InputVerdict {
  const text = message.trim()
  if (INJECTION.some((r) => r.test(text))) {
    return {
      kind: 'injection',
      reply: 'I cannot change how I work or share my instructions. ' + SCOPE_REPLY,
    }
  }
  if (SMALLTALK.test(text)) {
    return {
      kind: 'smalltalk',
      reply: /thank/i.test(text)
        ? 'Glad to help. Ask anything else about your solar plan or readings.'
        : 'Hello. Ask me about system size, savings, subsidy, net metering, or your readings.',
    }
  }
  if (DOMAIN.test(text)) return { kind: 'ok' }
  const words = text.split(/\s+/).length
  if (opts.hasHistory && (words <= 12 || FOLLOW_UP.test(text))) return { kind: 'ok' }
  return { kind: 'off_topic', reply: SCOPE_REPLY }
}

// --- Output checks ----------------------------------------------------------------------------------

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2705}\u{274C}\u{FE0F}]/gu
const SELF_REFERENCE = /\b(as an ai( language model)?|as a large language model|i am an ai)[,.]?\s*/gi

/** Rupee amounts (₹1,23,456 / Rs. 5,000 / INR 7.70) of at least ₹100. */
export function extractRupeeAmounts(text: string): number[] {
  const out: number[] = []
  const re = /(?:₹|rs\.?|inr)\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(lakh|lakhs|l\b|k\b)?/gi
  for (const m of text.matchAll(re)) {
    let n = Number(m[1].replace(/,/g, ''))
    const unit = m[2]?.toLowerCase()
    if (unit === 'k') n *= 1000
    if (unit && unit.startsWith('l')) n *= 100000
    if (Number.isFinite(n) && n >= 100) out.push(n)
  }
  return out
}

/** All numbers mentioned anywhere in the context, including scaled forms (lakh, thousand). */
function contextNumbers(context: string): number[] {
  const nums: number[] = []
  for (const m of context.matchAll(/-?[0-9][0-9,]*(?:\.[0-9]+)?/g)) {
    const n = Number(m[0].replace(/,/g, ''))
    if (Number.isFinite(n)) nums.push(n)
  }
  return nums
}

export type OutputCheck = { answer: string; untraced: number[] }

export function checkOutput(answer: string, context: string): OutputCheck {
  let clean = answer.replace(EMOJI, '').replace(SELF_REFERENCE, '')
  const known = contextNumbers(context)
  const untraced = extractRupeeAmounts(clean).filter(
    (amount) =>
      !known.some((k) => k > 0 && Math.abs(k - amount) / Math.max(k, amount) <= 0.01) &&
      // Allow sums/differences of two known figures (e.g. gross minus subsidy).
      !known.some((a) => known.some((b) => Math.abs(a + b - amount) <= 1 || Math.abs(a - b - amount) <= 1))
  )
  if (untraced.length) {
    clean +=
      `\n\n> Some amounts above (${untraced.map((n) => `₹${n.toLocaleString('en-IN')}`).join(', ')}) could not be traced to your data or the calculations, so treat them as approximate.`
  }
  return { answer: clean.trim(), untraced }
}
