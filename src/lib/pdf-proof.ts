export interface ProofPayload {
  id: string
  issuer_id: string
  batch: string
  merkle_root: string
  signature?: string | null
  proof_json: any
  file_paths: string[]
  created_at: string
  expiry_date?: string | null
  description?: string | null
  proof_signature?: string | null
}

export interface AppendedPdf {
  originalBytes: Uint8Array
  proof: ProofPayload
}

export const PROOF_MARKER_START = '%%TRUSTDOC-JSON-START-V1%%'
export const PROOF_MARKER_END = '%%TRUSTDOC-JSON-END%%'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'string') return JSON.stringify(value)
  if (Array.isArray(value)) {
    return `[${value.map(item => canonicalize(item)).join(',')}]`
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${JSON.stringify(key)}:${canonicalize(val)}`)
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(value)
}

export function canonicalProofString(proof: Omit<ProofPayload, 'proof_signature'>): string {
  return canonicalize(proof)
}

export function appendProofBlock(pdfBytes: Uint8Array, proof: ProofPayload): Uint8Array {
  const proofJson = JSON.stringify(proof)
  const lastByte = pdfBytes.length > 0 ? pdfBytes[pdfBytes.length - 1] : null
  const needsSeparator = lastByte !== 0x0a && lastByte !== 0x0d
  const separator = needsSeparator ? '\n' : ''
  const proofBlock = `${separator}${PROOF_MARKER_START}\n${proofJson}\n${PROOF_MARKER_END}\n`
  const proofBytes = encoder.encode(proofBlock)

  const combined = new Uint8Array(pdfBytes.length + proofBytes.length)
  combined.set(pdfBytes, 0)
  combined.set(proofBytes, pdfBytes.length)
  return combined
}

function lastIndexOfBytes(haystack: Uint8Array, needle: Uint8Array): number {
  if (needle.length === 0 || haystack.length === 0 || needle.length > haystack.length) {
    return -1
  }

  for (let i = haystack.length - needle.length; i >= 0; i--) {
    let found = true
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        found = false
        break
      }
    }
    if (found) {
      return i
    }
  }
  return -1
}

export function extractProofBlock(pdfBytes: Uint8Array): AppendedPdf {
  const startMarkerBytes = encoder.encode(PROOF_MARKER_START)
  const endMarkerBytes = encoder.encode(PROOF_MARKER_END)

  const startIndex = lastIndexOfBytes(pdfBytes, startMarkerBytes)
  const endIndex = lastIndexOfBytes(pdfBytes, endMarkerBytes)

  console.log('[pdf-proof] Marker search result:', {
    startIndex,
    endIndex,
    totalBytes: pdfBytes.length
  })

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    const tailSnippet = decoder.decode(pdfBytes.slice(-200))
    console.warn('[pdf-proof] Marker not found; tail snippet:', tailSnippet)
    throw new Error('Embedded proof block not found')
  }

  const proofStart = startIndex + startMarkerBytes.length
  const proofBytes = pdfBytes.slice(proofStart, endIndex)
  const proofText = decoder.decode(proofBytes).trim()

  if (!proofText) {
    throw new Error('Embedded proof JSON empty')
  }

  let parsed: ProofPayload
  try {
    parsed = JSON.parse(proofText) as ProofPayload
  } catch (err) {
    throw new Error('Embedded proof JSON invalid')
  }

  const tailBytes = pdfBytes.slice(endIndex + endMarkerBytes.length)
  const tailText = decoder.decode(tailBytes).trim()
  if (tailText.length > 0) {
    console.warn('[pdf-proof] Non-empty tail detected after proof block:', tailText.slice(0, 120))
    throw new Error('Document has been modified after issuance (extra data after proof block)')
  }

  const originalBytes = pdfBytes.slice(0, startIndex)
  console.log('[pdf-proof] Extracted proof payload:', {
    issuerId: parsed.issuer_id,
    batch: parsed.batch,
    merkleRoot: parsed.merkle_root,
    createdAt: parsed.created_at,
    originalLength: originalBytes.length
  })

  return {
    originalBytes,
    proof: parsed
  }
}



