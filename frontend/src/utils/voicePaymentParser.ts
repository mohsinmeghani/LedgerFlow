import type { Supplier } from '../types'

export interface ParsedVoicePayment {
  supplier: Supplier
  amount: number
  rawTranscript: string
}

export interface ParseError {
  error: string
}

const FILLER_WORDS = new Set([
  'i',
  'have',
  'has',
  'had',
  'paid',
  'pay',
  'to',
  'for',
  'rupees',
  'rupee',
  'rs',
  'dollars',
  'dollar',
  'bucks',
  'only',
  'cash',
  'amount',
  'of',
  'the',
  'a',
])

function extractAmount(text: string): { amount: number; remainder: string } | null {
  const match = text.match(/\d[\d,]*\.?\d*/)
  if (!match || match.index === undefined) return null
  const amount = Number(match[0].replace(/,/g, ''))
  if (!Number.isFinite(amount) || amount <= 0) return null
  const remainder = text.slice(0, match.index) + text.slice(match.index + match[0].length)
  return { amount, remainder }
}

function extractName(text: string): string {
  return text
    .split(/\s+/)
    .filter((word) => word && !FILLER_WORDS.has(word))
    .join(' ')
    .trim()
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

function findBestSupplierMatch(name: string, suppliers: Supplier[]): Supplier | null {
  const target = name.toLowerCase().trim()
  if (!target) return null

  const exact = suppliers.find((s) => s.name.toLowerCase() === target)
  if (exact) return exact

  const substring = suppliers.find(
    (s) => s.name.toLowerCase().includes(target) || target.includes(s.name.toLowerCase()),
  )
  if (substring) return substring

  let best: { supplier: Supplier; distance: number } | null = null
  for (const supplier of suppliers) {
    const distance = levenshtein(target, supplier.name.toLowerCase())
    if (!best || distance < best.distance) {
      best = { supplier, distance }
    }
  }
  const threshold = Math.max(2, Math.floor(target.length * 0.4))
  return best && best.distance <= threshold ? best.supplier : null
}

export function parseVoicePayment(
  transcript: string,
  suppliers: Supplier[],
): ParsedVoicePayment | ParseError {
  const cleaned = transcript.trim().toLowerCase()

  const amountResult = extractAmount(cleaned)
  if (!amountResult) {
    return {
      error: `Couldn't find an amount in "${transcript}". Try saying it like "paid kamal 1000".`,
    }
  }

  const name = extractName(amountResult.remainder)
  if (!name) {
    return { error: `Couldn't figure out who was paid in "${transcript}".` }
  }

  const supplier = findBestSupplierMatch(name, suppliers)
  if (!supplier) {
    return { error: `Couldn't match "${name}" to a supplier. Heard: "${transcript}".` }
  }

  return { supplier, amount: amountResult.amount, rawTranscript: transcript }
}
