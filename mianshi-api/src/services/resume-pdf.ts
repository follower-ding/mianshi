let pdfAvailable: boolean | null = null

export async function isResumePdfAvailable(): Promise<boolean> {
  if (pdfAvailable !== null) return pdfAvailable
  try {
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({ headless: true })
    await browser.close()
    pdfAvailable = true
  } catch {
    pdfAvailable = false
  }
  return pdfAvailable
}

const MAX_HTML_BYTES = 500_000

export async function htmlToPdfBuffer(html: string, title = '简历'): Promise<Buffer> {
  if (Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
    throw new Error('HTML 内容过大，请精简后重试')
  }

  const ok = await isResumePdfAvailable()
  if (!ok) {
    throw new Error('服务端 PDF 不可用，请运行 npx playwright install chromium')
  }

  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.route('**/*', (route) => route.abort())
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close().catch(() => {})
  }
}
