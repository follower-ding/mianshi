import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { newId } from './store-json.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const QUESTION_IMAGE_DIR = join(__dirname, '../../data/uploads/question-images')

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export function ensureQuestionImageDir() {
  if (!existsSync(QUESTION_IMAGE_DIR)) {
    mkdirSync(QUESTION_IMAGE_DIR, { recursive: true })
  }
}

function detectMime(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png'
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp'
  }
  if (
    buffer.length >= 6 &&
    (buffer.toString('ascii', 0, 6) === 'GIF87a' || buffer.toString('ascii', 0, 6) === 'GIF89a')
  ) {
    return 'image/gif'
  }
  return null
}

export function validateQuestionImage(fileName: string, buffer: Buffer) {
  if (buffer.length > MAX_BYTES) {
    return { ok: false as const, error: `图片不能超过 ${MAX_BYTES / 1024 / 1024}MB`, status: 400 }
  }
  const mime = detectMime(buffer)
  if (!mime || !ALLOWED.has(mime)) {
    return { ok: false as const, error: '仅支持 JPG、PNG、WebP、GIF 图片', status: 400 }
  }
  const ext = fileName.split('.').pop()?.toLowerCase()
  const expectedExt = EXT_BY_MIME[mime]
  if (ext && ext !== expectedExt && !(ext === 'jpeg' && expectedExt === 'jpg')) {
    return { ok: false as const, error: '文件扩展名与图片格式不匹配', status: 400 }
  }
  return { ok: true as const, mime, ext: expectedExt }
}

export function saveQuestionImage(buffer: Buffer, mime: string) {
  ensureQuestionImageDir()
  const ext = EXT_BY_MIME[mime] ?? 'png'
  const id = newId('img')
  const filename = `${id}.${ext}`
  const filepath = join(QUESTION_IMAGE_DIR, filename)
  writeFileSync(filepath, buffer)
  return {
    id,
    filename,
    url: `/api/uploads/question-images/${filename}`,
    mime,
    size: buffer.length,
  }
}

export function readQuestionImage(filename: string) {
  if (!/^img_[a-z0-9]+\.(jpg|png|webp|gif)$/.test(filename)) {
    return null
  }
  const filepath = join(QUESTION_IMAGE_DIR, filename)
  if (!existsSync(filepath)) return null
  const buffer = readFileSync(filepath)
  const ext = filename.split('.').pop()
  const mime =
    ext === 'jpg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/gif'
  return { buffer, mime }
}
