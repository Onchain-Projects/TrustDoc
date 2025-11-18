import QRCode from 'qrcode'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import JSZip from 'jszip'
import { Buffer } from 'buffer'

const INCH_TO_EMU = 914400

export interface VerificationBadgeOptions {
  verificationUrl: string
  title?: string
  captionLines?: string[]
  qrSizeInches?: number
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1]
  const binaryString = typeof window !== 'undefined' && window.atob
    ? window.atob(base64)
    : Buffer.from(base64, 'base64').toString('binary')

  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

function wrapTextIntoLines(
  text: string,
  font: any,
  fontSize: number,
  maxWidth: number
): string[] {
  if (!text) return ['']

  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  const fits = (candidate: string) =>
    font.widthOfTextAtSize(candidate, fontSize) <= maxWidth

  const pushHardWrappedWord = (word: string) => {
    let remaining = word
    while (remaining.length > 0) {
      let sliceLength = remaining.length
      while (
        sliceLength > 0 &&
        !fits(remaining.slice(0, sliceLength))
      ) {
        sliceLength--
      }
      if (sliceLength === 0) {
        sliceLength = 1
      }
      lines.push(remaining.slice(0, sliceLength))
      remaining = remaining.slice(sliceLength)
    }
  }

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (fits(candidate)) {
      current = candidate
      continue
    }

    if (current) {
      lines.push(current)
      current = ''
    }

    if (!fits(word)) {
      pushHardWrappedWord(word)
    } else {
      current = word
    }
  }

  if (current) {
    lines.push(current)
  }

  return lines.length > 0 ? lines : ['']
}

function wrapParagraphs(
  paragraphs: string[],
  font: any,
  fontSize: number,
  maxWidth: number
): string[] {
  return paragraphs.flatMap(paragraph =>
    wrapTextIntoLines(paragraph, font, fontSize, maxWidth)
  )
}

const DEFAULT_CAPTION_LINES = [
  'Blockchain-authenticated doc.',
  'Scan & upload at trust-doc.vercel.app/verify.'
]

const MIN_QR_SIZE_INCHES = 0.35 // Minimum scannable QR code size
const MIN_MARGIN = 36 // 0.5 inches minimum margin (for tight spaces)
const ORIGINAL_MARGIN = 54 // 0.75 inches - original margin (preserved when space allows)

interface PlacementResult {
  page: any
  x: number
  y: number
  qrSize: number
  scale: number
  effectiveCaptionLines: string[]
}

function calculateBadgeDimensions(
  qrSizePoints: number,
  scale: number,
  titleFont: any,
  bodyFont: any,
  title: string,
  captionLines: string[],
  panelPadding: number
): {
  panelWidth: number
  panelHeight: number
  textBlockWidth: number
  titleFontSize: number
  bodyFontSize: number
  titleLineHeight: number
  bodyLineHeight: number
  wrappedTitleLines: string[]
  wrappedCaptionLines: string[]
} {
  const baseTitleFontSize = 8.5
  const baseBodyFontSize = 7.5
  const baseTitleLineHeight = 11.5
  const baseBodyLineHeight = 11
  const baseTextBlockWidth = 160

  const titleFontSize = baseTitleFontSize * scale
  const bodyFontSize = baseBodyFontSize * scale
  const titleLineHeight = baseTitleLineHeight * scale
  const bodyLineHeight = baseBodyLineHeight * scale
  const textBlockWidth = baseTextBlockWidth * scale

  const wrappedTitleLines = wrapTextIntoLines(
    title,
    titleFont,
    titleFontSize,
    textBlockWidth
  )
  const wrappedCaptionLines = wrapParagraphs(
    captionLines,
    bodyFont,
    bodyFontSize,
    textBlockWidth
  )

  const textHeight =
    wrappedTitleLines.length * titleLineHeight +
    (wrappedCaptionLines.length > 0 ? 3 * scale : 0) +
    wrappedCaptionLines.length * bodyLineHeight

  const panelWidth = panelPadding * 3 + qrSizePoints + textBlockWidth
  const panelHeight = Math.max(qrSizePoints + panelPadding * 2, textHeight + panelPadding * 2)

  return {
    panelWidth,
    panelHeight,
    textBlockWidth,
    titleFontSize,
    bodyFontSize,
    titleLineHeight,
    bodyLineHeight,
    wrappedTitleLines,
    wrappedCaptionLines
  }
}

// Check if position is in a safe zone (far from typical content areas)
function isSafePosition(x: number, y: number, badgeWidth: number, badgeHeight: number, pageWidth: number, pageHeight: number, safetyBuffer: number): boolean {
  const badgeRight = x + badgeWidth
  const badgeBottom = y + badgeHeight
  const badgeCenterX = x + badgeWidth / 2
  const badgeCenterY = y + badgeHeight / 2
  
  // Rule 1: Must be in top 40% of page (content usually in bottom 60%)
  if (badgeBottom > pageHeight * 0.4) {
    return false
  }
  
  // Rule 2: Must be in outer 20% of page width (avoid center 60% where main content is)
  const distanceFromLeft = x
  const distanceFromRight = pageWidth - badgeRight
  const minSideDistance = Math.min(distanceFromLeft, distanceFromRight)
  const centerZoneStart = pageWidth * 0.2
  const centerZoneEnd = pageWidth * 0.8
  
  // If badge is in center zone, reject it
  if (badgeCenterX >= centerZoneStart && badgeCenterX <= centerZoneEnd) {
    return false
  }
  
  // Rule 3: Must have minimum safety buffer from all edges
  if (x < safetyBuffer || y < safetyBuffer || 
      badgeRight > pageWidth - safetyBuffer || 
      badgeBottom > pageHeight - safetyBuffer) {
    return false
  }
  
  // Rule 4: Extra safety buffer from bottom (where signatures/notes are)
  const bottomBuffer = pageHeight * 0.1 // 10% extra buffer from bottom
  if (badgeBottom > pageHeight * 0.4 - bottomBuffer) {
    return false
  }
  
  return true
}

async function findBestPlacement(
  pages: any[],
  titleFont: any,
  bodyFont: any,
  title: string,
  captionLines: string[],
  preferredQrSizeInches: number
): Promise<PlacementResult | null> {
  const panelPadding = 10
  const GRID_STEP = 20 // Scan in 20-point increments (dynamic grid search)
  const MIN_SAFE_MARGIN = 18 // Minimum 0.25 inch margin from edges
  
  // Prioritize first and last pages
  const priorityPages = pages.length === 1 
    ? [pages[0]]
    : [pages[pages.length - 1], pages[0]]

  // Try different QR sizes from preferred down to minimum
  const qrSizeSteps = []
  for (let size = preferredQrSizeInches; size >= MIN_QR_SIZE_INCHES; size -= 0.05) {
    qrSizeSteps.push(size)
  }

  // FIRST: Try original settings - ONLY in ultra-safe corner zones
  for (const page of priorityPages) {
    const { width, height } = page.getSize()
    const qrSizePoints = preferredQrSizeInches * 72
    const scale = 1.0
    const effectiveCaptionLines = captionLines
    
    const dims = calculateBadgeDimensions(
      qrSizePoints,
      scale,
      titleFont,
      bodyFont,
      title,
      effectiveCaptionLines,
      panelPadding
    )
    
    // Ultra-safe margins - at least 1.5 inches from edges
    const ultraSafeMargin = 108 // 1.5 inches
    const maxY = height * 0.35 // Only top 35% of page (very conservative)
    
    // Try top-right corner first
    const topRightX = width - ultraSafeMargin - dims.panelWidth
    const topRightY = ultraSafeMargin
    
    if (isSafePosition(topRightX, topRightY, dims.panelWidth, dims.panelHeight, width, height, ultraSafeMargin) &&
        topRightY + dims.panelHeight <= maxY) {
      return {
        page,
        x: topRightX,
        y: topRightY,
        qrSize: qrSizePoints,
        scale,
        effectiveCaptionLines
      }
    }
    
    // Try top-left corner
    const topLeftX = ultraSafeMargin
    const topLeftY = ultraSafeMargin
    
    if (isSafePosition(topLeftX, topLeftY, dims.panelWidth, dims.panelHeight, width, height, ultraSafeMargin) &&
        topLeftY + dims.panelHeight <= maxY) {
      return {
        page,
        x: topLeftX,
        y: topLeftY,
        qrSize: qrSizePoints,
        scale,
        effectiveCaptionLines
      }
    }
  }

  // SECOND: If ultra-safe corners don't work, try adaptive sizing with spiral search from corners
  for (const page of priorityPages) {
    const { width, height } = page.getSize()
    const maxY = height * 0.4 // NEVER go below top 40% of page
    
    for (const qrSizeInches of qrSizeSteps) {
      const qrSizePoints = qrSizeInches * 72
      
      // Try different scales
      for (let scale = 1.0; scale >= 0.5; scale -= 0.1) {
        // Try with full caption lines first, then reduce if needed
        for (let captionReduction = 0; captionReduction <= captionLines.length; captionReduction++) {
          const effectiveCaptionLines = captionReduction === 0 
            ? captionLines 
            : captionLines.slice(0, -captionReduction)
          
          const dims = calculateBadgeDimensions(
            qrSizePoints,
            scale,
            titleFont,
            bodyFont,
            title,
            effectiveCaptionLines,
            panelPadding
          )
          
          // Spiral search from corners outward - more intelligent than grid
          const safetyBuffer = Math.max(MIN_MARGIN, 36) // At least 0.5 inch
          
          // Priority order: top-right, top-left, then spiral outward
          const searchRadius = Math.min(width, height) / 2
          const stepSize = 10 // Smaller steps for finer search
          
          // Try corners first
          const corners = [
            { x: width - safetyBuffer - dims.panelWidth, y: safetyBuffer }, // top-right
            { x: safetyBuffer, y: safetyBuffer }, // top-left
          ]
          
          for (const corner of corners) {
            if (isSafePosition(corner.x, corner.y, dims.panelWidth, dims.panelHeight, width, height, safetyBuffer) &&
                corner.y + dims.panelHeight <= maxY) {
              return {
                page,
                x: corner.x,
                y: corner.y,
                qrSize: qrSizePoints,
                scale,
                effectiveCaptionLines
              }
            }
          }
          
          // Spiral search from top-right corner outward
          for (let radius = 0; radius <= searchRadius; radius += stepSize) {
            for (let angle = 0; angle < 90; angle += 5) { // Only top-right quadrant
              const rad = (angle * Math.PI) / 180
              const x = width - safetyBuffer - dims.panelWidth - radius * Math.cos(rad)
              const y = safetyBuffer + radius * Math.sin(rad)
              
              if (x >= safetyBuffer && y >= safetyBuffer &&
                  x + dims.panelWidth <= width - safetyBuffer &&
                  y + dims.panelHeight <= maxY &&
                  isSafePosition(x, y, dims.panelWidth, dims.panelHeight, width, height, safetyBuffer)) {
                return {
                  page,
                  x,
                  y,
                  qrSize: qrSizePoints,
                  scale,
                  effectiveCaptionLines
                }
              }
            }
          }
          
          // Spiral search from top-left corner outward
          for (let radius = 0; radius <= searchRadius; radius += stepSize) {
            for (let angle = 90; angle < 180; angle += 5) { // Only top-left quadrant
              const rad = (angle * Math.PI) / 180
              const x = safetyBuffer + radius * Math.cos(rad)
              const y = safetyBuffer + radius * Math.sin(rad)
              
              if (x >= safetyBuffer && y >= safetyBuffer &&
                  x + dims.panelWidth <= width - safetyBuffer &&
                  y + dims.panelHeight <= maxY &&
                  isSafePosition(x, y, dims.panelWidth, dims.panelHeight, width, height, safetyBuffer)) {
                return {
                  page,
                  x,
                  y,
                  qrSize: qrSizePoints,
                  scale,
                  effectiveCaptionLines
                }
              }
            }
          }
        }
      }
    }
  }

  return null
}

export async function embedBadgeInPdf(
  originalBytes: Uint8Array,
  options: VerificationBadgeOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true })
  const qrDataUrl = await QRCode.toDataURL(options.verificationUrl, {
    margin: 0,
    scale: 8,
    color: {
      dark: '#0F1729',
      light: '#FFFFFFFF'
    }
  })
  const qrImageBytes = dataUrlToUint8Array(qrDataUrl)
  const qrImage = await pdfDoc.embedPng(qrImageBytes)

  const titleFont = await pdfDoc.embedStandardFont(StandardFonts.HelveticaBold)
  const bodyFont = await pdfDoc.embedStandardFont(StandardFonts.Helvetica)

  const pages = pdfDoc.getPages()
  const title = options.title ?? 'Verify with TrustDoc'
  const captionLines = options.captionLines ?? DEFAULT_CAPTION_LINES
  const preferredQrSizeInches = options.qrSizeInches ?? 0.8

  // Find best placement with dynamic sizing
  const placement = await findBestPlacement(
    pages,
    titleFont,
    bodyFont,
    title,
    captionLines,
    preferredQrSizeInches
  )

  let badgePage: any
  let panelX: number
  let panelY: number
  let qrSize: number
  let scale: number
  let effectiveCaptionLines: string[]

  if (placement) {
    badgePage = placement.page
    panelX = placement.x
    panelY = placement.y
    qrSize = placement.qrSize
    scale = placement.scale
    effectiveCaptionLines = placement.effectiveCaptionLines
  } else {
    // Last resort: create new page with preferred size
    const targetPage = pages[pages.length - 1]
    const { width, height } = targetPage.getSize()
    const newPage = pdfDoc.addPage([width, height])
    badgePage = newPage
    
    qrSize = preferredQrSizeInches * 72
    scale = 1.0
    effectiveCaptionLines = captionLines
    
    const panelPadding = 10
    const dims = calculateBadgeDimensions(
      qrSize,
      scale,
      titleFont,
      bodyFont,
      title,
      effectiveCaptionLines,
      panelPadding
    )
    
    panelX = (width - dims.panelWidth) / 2
    panelY = (height - dims.panelHeight) / 2
  }

  const panelPadding = 10
  const dims = calculateBadgeDimensions(
    qrSize,
    scale,
    titleFont,
    bodyFont,
    title,
    effectiveCaptionLines,
    panelPadding
  )

  badgePage.drawRectangle({
    x: panelX,
    y: panelY,
    width: dims.panelWidth,
    height: dims.panelHeight,
    color: rgb(1, 1, 1),
    opacity: 0.94,
    borderColor: rgb(0.27, 0.4, 0.9),
    borderWidth: 0.6,
    borderOpacity: 0.7
  })

  const textStartX = panelX + panelPadding * 2 + qrSize
  const textTop = panelY + dims.panelHeight - panelPadding - dims.titleFontSize

  badgePage.drawImage(qrImage, {
    x: panelX + panelPadding,
    y: panelY + (dims.panelHeight - qrSize) / 2,
    width: qrSize,
    height: qrSize
  })

  dims.wrappedTitleLines.forEach((line, idx) => {
    badgePage.drawText(line, {
      x: textStartX,
      y: textTop - dims.titleLineHeight * idx,
      size: dims.titleFontSize,
      font: titleFont,
      color: rgb(0.18, 0.2, 0.35)
    })
  })

  const captionStartY =
    textTop -
    dims.titleLineHeight * dims.wrappedTitleLines.length -
    (dims.wrappedCaptionLines.length > 0 ? 3 * scale : 0)

  dims.wrappedCaptionLines.forEach((line, idx) => {
    badgePage.drawText(line, {
      x: textStartX,
      y: captionStartY - dims.bodyLineHeight * idx,
      size: dims.bodyFontSize,
      font: bodyFont,
      color: rgb(0.28, 0.3, 0.37)
    })
  })

  return new Uint8Array(await pdfDoc.save())
}

export async function embedBadgeInDocx(
  originalBytes: Uint8Array,
  options: VerificationBadgeOptions
): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(originalBytes)
  const docEntry = zip.file('word/document.xml')
  if (!docEntry) {
    throw new Error('DOCX is missing word/document.xml')
  }
  const relsEntry = zip.file('word/_rels/document.xml.rels')
  if (!relsEntry) {
    throw new Error('DOCX is missing word/_rels/document.xml.rels')
  }

  const existingDocXml = await docEntry.async('text')
  if (existingDocXml.includes('TrustDoc verification portal')) {
    return originalBytes
  }

  const qrDataUrl = await QRCode.toDataURL(options.verificationUrl, {
    margin: 0,
    scale: 8,
    color: {
      dark: '#0F1729',
      light: '#FFFFFFFF'
    }
  })
  const qrBytes = dataUrlToUint8Array(qrDataUrl)

  const mediaFolder = 'word/media/'
  const baseImageName = 'trustdoc-qr.png'
  let imageName = baseImageName
  let imageIndex = 1
  while (zip.file(`${mediaFolder}${imageName}`)) {
    imageName = `trustdoc-qr-${imageIndex++}.png`
  }

  zip.file(`${mediaFolder}${imageName}`, qrBytes, { binary: true })

  const relsXml = await relsEntry.async('text')
  const newRelId = (() => {
    const matches = Array.from(relsXml.matchAll(/Id="rId(\d+)"/g))
    const max = matches.reduce((acc, match) => {
      const id = parseInt(match[1] || '0', 10)
      return Number.isFinite(id) && id > acc ? id : acc
    }, 0)
    return `rId${max + 1}`
  })()

  const relInsertion = `<Relationship Id="${newRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageName}"/>`
  const updatedRelsXml = relsXml.replace(
    '</Relationships>',
    `  ${relInsertion}\n</Relationships>`
  )
  zip.file('word/_rels/document.xml.rels', updatedRelsXml)

  const captionLines = options.captionLines ?? DEFAULT_CAPTION_LINES
  const preferredQrSizeInches = options.qrSizeInches ?? 0.8
  const title = options.title ?? 'Verify with TrustDoc'
  
  // Use preferred size by default (preserves original look)
  // Only reduce if absolutely necessary for very large sizes
  let qrSizeInches = preferredQrSizeInches
  let scale = 1.0
  let effectiveCaptionLines = captionLines
  let qrColWidth = 2000 // Base width in twips (1/20 of a point)
  let textColWidth = 4200
  
  // Only reduce size if preferred size is extremely large (>1.2 inches)
  // This preserves the original appearance for normal sizes
  if (preferredQrSizeInches > 1.2) {
    qrSizeInches = Math.min(preferredQrSizeInches, 1.0)
  }
  
  // Ensure minimum size
  qrSizeInches = Math.max(qrSizeInches, MIN_QR_SIZE_INCHES)
  
  const qrSizeEmu = Math.round(qrSizeInches * INCH_TO_EMU)
  const docPrId = Math.floor(Date.now() % 100000)
  const titleFontSize = Math.round(17 * scale)
  const bodyFontSize = Math.round(15 * scale)

  const badgeXml = `
<w:tbl xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:tblPr>
    <w:tblStyle w:val="TableGrid"/>
    <w:tblW w:w="0" w:type="auto"/>
    <w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="1" w:noVBand="1"/>
  </w:tblPr>
  <w:tblGrid>
    <w:gridCol w:w="${qrColWidth}"/>
    <w:gridCol w:w="${textColWidth}"/>
  </w:tblGrid>
  <w:tr>
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="${qrColWidth}" w:type="dxa"/>
        <w:tcBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="4F46E5"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="4F46E5"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="4F46E5"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="4F46E5"/>
        </w:tcBorders>
        <w:shd w:val="pct15" w:color="auto" w:fill="FFFFFF"/>
      </w:tcPr>
      <w:p>
        <w:pPr><w:jc w:val="center"/></w:pPr>
        <w:r>
          <w:drawing xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
            <wp:inline distT="0" distB="0" distL="0" distR="0">
              <wp:extent cx="${qrSizeEmu}" cy="${qrSizeEmu}"/>
              <wp:effectExtent l="0" t="0" r="0" b="0"/>
              <wp:docPr id="${docPrId}" name="TrustDoc QR Badge"/>
              <wp:cNvGraphicFramePr>
                <a:graphicFrameLocks noChangeAspect="1"/>
              </wp:cNvGraphicFramePr>
              <a:graphic>
                <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:pic>
                    <pic:nvPicPr>
                      <pic:cNvPr id="${docPrId}" name="TrustDoc QR Badge"/>
                      <pic:cNvPicPr/>
                    </pic:nvPicPr>
                    <pic:blipFill>
                      <a:blip r:embed="${newRelId}"/>
                      <a:stretch><a:fillRect/></a:stretch>
                    </pic:blipFill>
                    <pic:spPr>
                      <a:xfrm>
                        <a:off x="0" y="0"/>
                        <a:ext cx="${qrSizeEmu}" cy="${qrSizeEmu}"/>
                      </a:xfrm>
                      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                    </pic:spPr>
                  </pic:pic>
                </a:graphicData>
              </a:graphic>
            </wp:inline>
          </w:drawing>
        </w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="${textColWidth}" w:type="dxa"/>
        <w:tcBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="4F46E5"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="4F46E5"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="4F46E5"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="4F46E5"/>
        </w:tcBorders>
        <w:shd w:val="pct15" w:color="auto" w:fill="FFFFFF"/>
      </w:tcPr>
      <w:p>
        <w:pPr><w:spacing w:after="${Math.round(80 * scale)}"/></w:pPr>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
            <w:color w:val="2F365F"/>
            <w:b/>
            <w:sz w:val="${titleFontSize}"/>
          </w:rPr>
          <w:t>${title}</w:t>
        </w:r>
      </w:p>
      ${effectiveCaptionLines.map(line => `
      <w:p>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
            <w:color w:val="4A5568"/>
            <w:sz w:val="${bodyFontSize}"/>
          </w:rPr>
          <w:t>${line}</w:t>
        </w:r>
      </w:p>`).join('')}
    </w:tc>
  </w:tr>
</w:tbl>
`

  const updatedDocXml = existingDocXml.replace(
    '</w:body>',
    `${badgeXml}</w:body>`
  )
  zip.file('word/document.xml', updatedDocXml)

  const updatedBytes = await zip.generateAsync({ type: 'uint8array' })
  return updatedBytes
}

