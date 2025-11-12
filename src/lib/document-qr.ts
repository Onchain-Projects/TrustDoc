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
  const singlePageDocument = pages.length === 1
  const targetPageIndex = singlePageDocument ? 0 : pages.length - 1
  const targetPage = pages[targetPageIndex]
  const fallbackPage = pages[0]

  const qrSize = (options.qrSizeInches ?? 0.8) * 72 // points
  const panelPadding = 10
  const textBlockWidth = 160

  const titleFontSize = 8.5
  const bodyFontSize = 7.5
  const titleLineHeight = 11.5
  const bodyLineHeight = 11
  const captionSpacing = 3

  const title = options.title ?? 'Verify with TrustDoc'
  const captionLines = options.captionLines ?? DEFAULT_CAPTION_LINES

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
    (wrappedCaptionLines.length > 0 ? captionSpacing : 0) +
    wrappedCaptionLines.length * bodyLineHeight

  const panelWidth = panelPadding * 3 + qrSize + textBlockWidth
  const panelHeight = Math.max(qrSize + panelPadding * 2, textHeight + panelPadding * 2)

  const margin = 54 // 0.75in

  function findPlacement(page: any) {
    const { width, height } = page.getSize()
    const fits =
      panelWidth <= width - margin * 2 &&
      panelHeight <= height - margin * 2

    if (!fits) {
      return null
    }

    return {
      page,
      x: width - margin - panelWidth,
      y: margin
    }
  }

  let placement = findPlacement(targetPage)
  if (!placement) {
    placement = findPlacement(fallbackPage)
  }

  let badgePage = placement?.page ?? targetPage
  let panelX = placement?.x ?? 0
  let panelY = placement?.y ?? 0

  if (!placement) {
    const referencePage = targetPage
    const { width, height } = referencePage.getSize()
    const newPage = pdfDoc.addPage([width, height])
    badgePage = newPage
    panelX = (width - panelWidth) / 2
    panelY = (height - panelHeight) / 2
  }

  badgePage.drawRectangle({
    x: panelX,
    y: panelY,
    width: panelWidth,
    height: panelHeight,
    color: rgb(1, 1, 1),
    opacity: 0.94,
    borderColor: rgb(0.27, 0.4, 0.9),
    borderWidth: 0.6,
    borderOpacity: 0.7
  })

  const textStartX = panelX + panelPadding * 2 + qrSize
  const textTop = panelY + panelHeight - panelPadding - titleFontSize

  badgePage.drawImage(qrImage, {
    x: panelX + panelPadding,
    y: panelY + (panelHeight - qrSize) / 2,
    width: qrSize,
    height: qrSize
  })

  wrappedTitleLines.forEach((line, idx) => {
    badgePage.drawText(line, {
      x: textStartX,
      y: textTop - titleLineHeight * idx,
      size: titleFontSize,
      font: titleFont,
      color: rgb(0.18, 0.2, 0.35)
    })
  })

  const captionStartY =
    textTop -
    titleLineHeight * wrappedTitleLines.length -
    (wrappedCaptionLines.length > 0 ? captionSpacing : 0)

  wrappedCaptionLines.forEach((line, idx) => {
    badgePage.drawText(line, {
      x: textStartX,
      y: captionStartY - bodyLineHeight * idx,
      size: bodyFontSize,
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
  const qrSizeEmu = Math.round((options.qrSizeInches ?? 0.8) * INCH_TO_EMU)
  const docPrId = Math.floor(Date.now() % 100000)

  const badgeXml = `
<w:tbl xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:tblPr>
    <w:tblStyle w:val="TableGrid"/>
    <w:tblW w:w="0" w:type="auto"/>
    <w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="1" w:noVBand="1"/>
  </w:tblPr>
  <w:tblGrid>
    <w:gridCol w:w="2000"/>
    <w:gridCol w:w="4200"/>
  </w:tblGrid>
  <w:tr>
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="2000" w:type="dxa"/>
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
        <w:tcW w:w="4200" w:type="dxa"/>
        <w:tcBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="4F46E5"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="4F46E5"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="4F46E5"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="4F46E5"/>
        </w:tcBorders>
        <w:shd w:val="pct15" w:color="auto" w:fill="FFFFFF"/>
      </w:tcPr>
      <w:p>
        <w:pPr><w:spacing w:after="80"/></w:pPr>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
            <w:color w:val="2F365F"/>
            <w:b/>
            <w:sz w:val="17"/>
          </w:rPr>
          <w:t>${options.title ?? 'Verify with TrustDoc'}</w:t>
        </w:r>
      </w:p>
      ${captionLines.map(line => `
      <w:p>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
            <w:color w:val="4A5568"/>
            <w:sz w:val="15"/>
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

