import html2canvas from 'html2canvas-pro'
import { RESUME_PREVIEW_ID } from './resumeSections'
import { printResume, collectPageStyles, ensurePreviewElement } from './resumeUtils'

export type ExportFormat = 'pdf' | 'jpg' | 'png'

/** Tailwind v4 / 现代 CSS 颜色函数 — html2canvas 旧版无法解析 */
export const MODERN_CSS_COLOR_RE = /(?:oklab|oklch|lab|lch|color)\([^)]*\)/gi

export function stripModernColorFunctions(css: string): string {
  return css.replace(MODERN_CSS_COLOR_RE, (match) => {
    if (match.startsWith('color(')) return '#333333'
    return '#888888'
  })
}

const COLOR_PROPS = [
  'color',
  'background-color',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'fill',
  'stroke',
] as const

/** 将已解析的 computed rgb 写入 clone，避免解析 stylesheet 中的 oklab */
export function inlineResolvedStyles(source: HTMLElement, target: HTMLElement) {
  const cs = window.getComputedStyle(source)
  for (const prop of COLOR_PROPS) {
    const val = cs.getPropertyValue(prop)
    if (val && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent') {
      target.style.setProperty(prop, val)
    }
  }
  const srcChildren = source.children
  const tgtChildren = target.children
  for (let i = 0; i < srcChildren.length && i < tgtChildren.length; i++) {
    inlineResolvedStyles(srcChildren[i] as HTMLElement, tgtChildren[i] as HTMLElement)
  }
}

function prepareCloneForCanvas(doc: Document, sourceRoot: HTMLElement, cloneRoot: HTMLElement) {
  doc.querySelectorAll('style').forEach((tag) => {
    if (tag.textContent) tag.textContent = stripModernColorFunctions(tag.textContent)
  })
  inlineResolvedStyles(sourceRoot, cloneRoot)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** 收集预览 DOM + 页面样式，供服务端 Playwright 渲染 PDF */
export function buildPrintHtml(elementId: string): string {
  const el = ensurePreviewElement(elementId)
  const styles = collectPageStyles()
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${styles}</style></head><body style="margin:0;background:#fff">${el.outerHTML}</body></html>`
}

export async function exportResumeServerPdf(
  resumeId: string,
  elementId: string,
  filenameBase: string,
): Promise<void> {
  const { api } = await import('../../api/client')
  const html = buildPrintHtml(elementId)
  const safe = filenameBase.replace(/[\\/:*?"<>|]/g, '_') || '简历'
  const blob = await api.exportResumePdf(resumeId, html, safe)
  downloadBlob(blob, `${safe}.pdf`)
}

/** 将预览 DOM 渲染为图片（JPG/PNG）— 使用 html2canvas-pro 兼容 Tailwind v4 oklab */
async function capturePreviewAsImage(
  elementId: string,
  mime: 'image/jpeg' | 'image/png',
): Promise<Blob> {
  const el = ensurePreviewElement(elementId)

  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    onclone: (doc, clone) => {
      prepareCloneForCanvas(doc, el, clone as HTMLElement)
    },
  })

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('图片生成失败'))),
      mime,
      mime === 'image/jpeg' ? 0.92 : undefined,
    )
  })
}

export async function exportResume(format: ExportFormat, filenameBase: string) {
  const safe = filenameBase.replace(/[\\/:*?"<>|]/g, '_') || '简历'

  if (format === 'pdf') {
    printResume(RESUME_PREVIEW_ID, safe)
    return
  }

  const mime = format === 'jpg' ? 'image/jpeg' : 'image/png'
  const ext = format === 'jpg' ? 'jpg' : 'png'
  const blob = await capturePreviewAsImage(RESUME_PREVIEW_ID, mime)
  downloadBlob(blob, `${safe}.${ext}`)
}
