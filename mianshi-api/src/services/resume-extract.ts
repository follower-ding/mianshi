import mammoth from 'mammoth'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { ResumeExtractError, SCANNED_PDF_CODE } from './resume-extract-errors.js'

const SCANNED_PDF_HINT =
  '疑似扫描版 PDF，无法提取可编辑文本。请粘贴简历正文，或使用 Word 导出为 DOCX/TXT 后上传。'

export { SCANNED_PDF_CODE, SCANNED_PDF_HINT }

type TextLine = { y: number; x: number; text: string }

/** pdf.js 按坐标排序 — 改善双栏 PDF 乱序 */
async function extractPdfTextSorted(buffer: Buffer): Promise<string> {
  const pdf = await getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise
  const lines: TextLine[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    for (const item of content.items) {
      if (!('str' in item) || typeof item.str !== 'string') continue
      const t = item.str.trim()
      if (!t) continue
      const tr = item.transform
      lines.push({ y: Math.round(tr[5]), x: Math.round(tr[4]), text: item.str })
    }
  }

  lines.sort((a, b) => b.y - a.y || a.x - b.x)

  const merged: string[] = []
  let curY = Number.NEGATIVE_INFINITY
  let curLine = ''
  for (const line of lines) {
    if (Math.abs(line.y - curY) > 4) {
      if (curLine.trim()) merged.push(curLine.trim())
      curLine = line.text
      curY = line.y
    } else {
      const join = curLine.endsWith('-') ? '' : ' '
      curLine += join + line.text
    }
  }
  if (curLine.trim()) merged.push(curLine.trim())

  return merged.join('\n').trim()
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return (result.value ?? '').trim()
}

export async function extractTextFromFile(buffer: Buffer, ext: string): Promise<string> {
  if (ext === 'pdf') {
    try {
      const sorted = await extractPdfTextSorted(buffer)
      if (sorted.length >= 30) return sorted
      throw new ResumeExtractError(SCANNED_PDF_CODE, SCANNED_PDF_HINT)
    } catch (e) {
      if (e instanceof ResumeExtractError) throw e
      /* fallback below */
    }
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: buffer })
    try {
      const result = await parser.getText()
      const text = (result.text ?? '').trim()
      if (text.length < 30) throw new ResumeExtractError(SCANNED_PDF_CODE, SCANNED_PDF_HINT)
      return text
    } finally {
      await parser.destroy()
    }
  }

  if (ext === 'docx' || ext === 'doc') {
    if (ext === 'doc') {
      throw new Error('旧版 .doc 请另存为 .docx 或 PDF 后上传')
    }
    const text = await extractDocxText(buffer)
    if (text.length < 30) throw new Error('DOCX 文本不足（至少 30 字符）')
    return text
  }

  return new TextDecoder().decode(buffer).trim()
}

export { SCANNED_PDF_HINT as SCANNED_PDF_MESSAGE }

