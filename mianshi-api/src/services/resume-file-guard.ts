import { isAllowedResumeExtension } from './resume-file-types.js'

/** 简历上传上限 10MB */
export const RESUME_MAX_FILE_BYTES = 10 * 1024 * 1024

type GuardResult =
  | { ok: true }
  | { ok: false; error: string; status: 400 | 413 | 415 }

function extFromName(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

/** 简单 magic-byte 校验，防止仅改扩展名 */
function sniffMatchesExt(buffer: Buffer, ext: string): boolean {
  if (ext === 'pdf') {
    return buffer.subarray(0, 5).toString('ascii') === '%PDF-'
  }
  if (ext === 'docx') {
    return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b
  }
  if (ext === 'txt' || ext === 'md' || ext === 'markdown') {
    return true
  }
  return false
}

export function validateResumeUpload(fileName: string, buffer: Buffer): GuardResult {
  const ext = extFromName(fileName)
  if (!isAllowedResumeExtension(ext)) {
    return { ok: false, error: `不支持的格式: .${ext || '未知'}`, status: 400 }
  }
  if (buffer.length === 0) {
    return { ok: false, error: '文件为空', status: 400 }
  }
  if (buffer.length > RESUME_MAX_FILE_BYTES) {
    return {
      ok: false,
      error: `文件过大（${(buffer.length / 1024 / 1024).toFixed(1)}MB），上限 ${RESUME_MAX_FILE_BYTES / 1024 / 1024}MB`,
      status: 413,
    }
  }
  if (!sniffMatchesExt(buffer, ext)) {
    return {
      ok: false,
      error: `文件内容与扩展名 .${ext} 不匹配，请确认文件类型`,
      status: 415,
    }
  }
  return { ok: true }
}
