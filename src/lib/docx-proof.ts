import JSZip from 'jszip'
import { ProofPayload } from './pdf-proof'

const PROOF_PART_NAME = 'customXml/trustdoc-proof.json'
const CONTENT_TYPES_PATH = '[Content_Types].xml'
const ROOT_RELS_PATH = '_rels/.rels'
const PROOF_RELATIONSHIP_ID = 'rIdTrustDocProof'
const PROOF_RELATIONSHIP_TYPE =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXml'

const CORE_XML_PATHS = [CONTENT_TYPES_PATH, ROOT_RELS_PATH]
const encoder = new TextEncoder()
const newline = encoder.encode('\n')

function createDomParser(): DOMParser {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser()
  }
  throw new Error('DOMParser is not available in this environment')
}

function createXmlSerializer(): XMLSerializer {
  if (typeof XMLSerializer !== 'undefined') {
    return new XMLSerializer()
  }
  throw new Error('XMLSerializer is not available in this environment')
}

async function readXmlFile(zip: JSZip, path: string): Promise<string> {
  const file = zip.file(path)
  if (!file) {
    console.warn('[docx-proof] Missing XML part:', path)
    throw new Error(`DOCX missing required part: ${path}`)
  }
  console.log('[docx-proof] Reading XML part:', path)
  return file.async('text')
}

async function writeXmlFile(zip: JSZip, path: string, xml: string) {
  zip.file(path, xml, {
    date: new Date(0),
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  })
}

function ensureContentTypesEntry(xml: Document, action: 'add' | 'remove') {
  const typesEl = xml.getElementsByTagName('Types')[0]
  if (!typesEl) {
    throw new Error('Invalid [Content_Types].xml structure')
  }

  const overrides = Array.from(xml.getElementsByTagName('Override'))
  const existing = overrides.find(
    el => el.getAttribute('PartName') === `/${PROOF_PART_NAME}`
  )

  if (action === 'add') {
    if (!existing) {
      console.log('[docx-proof] Adding content type override for proof part')
      const newOverride = xml.createElement('Override')
      newOverride.setAttribute('PartName', `/${PROOF_PART_NAME}`)
      newOverride.setAttribute('ContentType', 'application/json')
      typesEl.appendChild(newOverride)
    }
  } else if (existing && existing.parentNode) {
    console.log('[docx-proof] Removing content type override for proof part')
    existing.parentNode.removeChild(existing)
  }
}

function ensureRootRelationship(xml: Document, action: 'add' | 'remove') {
  const relationshipsEl = xml.getElementsByTagName('Relationships')[0]
  if (!relationshipsEl) {
    throw new Error('Invalid _rels/.rels structure')
  }

  const relationships = Array.from(xml.getElementsByTagName('Relationship'))
  const existing = relationships.find(
    el =>
      el.getAttribute('Id') === PROOF_RELATIONSHIP_ID ||
      el.getAttribute('Target') === PROOF_PART_NAME
  )

  if (action === 'add') {
    if (!existing) {
      console.log('[docx-proof] Creating root relationship for proof part')
      const relEl = xml.createElement('Relationship')
      relEl.setAttribute('Id', PROOF_RELATIONSHIP_ID)
      relEl.setAttribute('Type', PROOF_RELATIONSHIP_TYPE)
      relEl.setAttribute('Target', PROOF_PART_NAME)
      relationshipsEl.appendChild(relEl)
    }
  } else if (existing && existing.parentNode) {
    console.log('[docx-proof] Removing root relationship for proof part')
    existing.parentNode.removeChild(existing)
  }
}

async function generateCanonicalZip(
  zip: JSZip,
  excludedPaths: Set<string> = new Set()
): Promise<Uint8Array> {
  const canonicalZip = new JSZip()
  const names = Object.keys(zip.files)
    .filter(name => !zip.files[name].dir && !excludedPaths.has(name))
    .sort((a, b) => a.localeCompare(b))

  for (const name of names) {
    const content = await zip.file(name)!.async('uint8array')
    canonicalZip.file(name, content, {
      date: new Date(0),
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    })
  }

  return canonicalZip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
    streamFiles: true,
    platform: 'UNIX'
  })
}

export async function prepareDocxForHashing(docxBytes: Uint8Array): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(docxBytes)
  const parser = createDomParser()
  const serializer = createXmlSerializer()

  for (const path of CORE_XML_PATHS) {
    if (!zip.file(path)) {
      continue
    }
    console.log('[docx-proof] Normalizing XML before hashing:', path)
    const xml = await readXmlFile(zip, path)
    const doc = parser.parseFromString(xml, 'application/xml')
    await writeXmlFile(zip, path, serializer.serializeToString(doc))
  }

  return generateCanonicalZip(zip)
}

function concatenateChunks(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

export async function canonicalizeDocxForHash(docxBytes: Uint8Array): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(docxBytes)
  const names = Object.keys(zip.files)
    .filter(name => !zip.files[name].dir)
    .sort((a, b) => a.localeCompare(b))

  console.log('[docx-proof] Canonicalizing DOCX for hash', {
    entries: names.length
  })

  const chunks: Uint8Array[] = [encoder.encode('TRUSTDOC-DOCX-CANONICAL-V1\n')]

  for (const name of names) {
    const header = encoder.encode(`${name}\n`)
    const file = zip.file(name)
    if (!file) {
      continue
    }
    const content = await file.async('uint8array')
    const lengthBytes = encoder.encode(`${content.length}\n`)

    console.log('[docx-proof] Canonical hash entry', {
      name,
      length: content.length
    })

    chunks.push(header)
    chunks.push(lengthBytes)
    chunks.push(content)
    chunks.push(newline)
  }

  return concatenateChunks(chunks)
}

export async function appendProofToDocx(
  canonicalDocxBytes: Uint8Array,
  proof: ProofPayload
): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(canonicalDocxBytes)
  const proofJson = JSON.stringify(proof)

  zip.file(PROOF_PART_NAME, proofJson, {
    date: new Date(0),
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  })
  console.log('[docx-proof] Embedded proof JSON into DOCX package', {
    part: PROOF_PART_NAME,
    proofLength: proofJson.length
  })

  const parser = createDomParser()
  const serializer = createXmlSerializer()

  const contentTypesXml = await readXmlFile(zip, CONTENT_TYPES_PATH)
  const contentDoc = parser.parseFromString(contentTypesXml, 'application/xml')
  ensureContentTypesEntry(contentDoc, 'add')
  await writeXmlFile(zip, CONTENT_TYPES_PATH, serializer.serializeToString(contentDoc))

  const relsXml = await readXmlFile(zip, ROOT_RELS_PATH)
  const relsDoc = parser.parseFromString(relsXml, 'application/xml')
  ensureRootRelationship(relsDoc, 'add')
  await writeXmlFile(zip, ROOT_RELS_PATH, serializer.serializeToString(relsDoc))

  return generateCanonicalZip(zip)
}

export async function extractProofFromDocx(
  embeddedDocxBytes: Uint8Array
): Promise<{ originalBytes: Uint8Array; proof: ProofPayload }> {
  const zip = await JSZip.loadAsync(embeddedDocxBytes)
  console.log('[docx-proof] Loaded DOCX for extraction', {
    entries: Object.keys(zip.files).length
  })
  const proofEntry = zip.file(PROOF_PART_NAME)
  if (!proofEntry) {
    console.warn('[docx-proof] Proof part not found in DOCX')
    throw new Error('Embedded proof part not found in DOCX file')
  }

  const proofJson = (await proofEntry.async('text')).trim()
  if (!proofJson) {
    console.warn('[docx-proof] Proof JSON part empty')
    throw new Error('Embedded proof JSON empty in DOCX')
  }
  console.log('[docx-proof] Extracted proof JSON from DOCX', {
    bytes: proofJson.length
  })

  const parser = createDomParser()
  const serializer = createXmlSerializer()

  const contentTypesXml = await readXmlFile(zip, CONTENT_TYPES_PATH)
  const contentDoc = parser.parseFromString(contentTypesXml, 'application/xml')
  ensureContentTypesEntry(contentDoc, 'remove')
  await writeXmlFile(zip, CONTENT_TYPES_PATH, serializer.serializeToString(contentDoc))

  const relsXml = await readXmlFile(zip, ROOT_RELS_PATH)
  const relsDoc = parser.parseFromString(relsXml, 'application/xml')
  ensureRootRelationship(relsDoc, 'remove')
  await writeXmlFile(zip, ROOT_RELS_PATH, serializer.serializeToString(relsDoc))

  zip.remove(PROOF_PART_NAME)
  console.log('[docx-proof] Removed embedded proof part to reconstruct original DOCX')

  const originalBytes = await generateCanonicalZip(zip)
  const proof = JSON.parse(proofJson) as ProofPayload
  console.log('[docx-proof] Reconstructed original DOCX bytes', {
    byteLength: originalBytes.length
  })

  return { originalBytes, proof }
}

