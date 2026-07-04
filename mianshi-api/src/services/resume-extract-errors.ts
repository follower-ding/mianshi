export const SCANNED_PDF_CODE = 'SCANNED_PDF_NEED_OCR'

export class ResumeExtractError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ResumeExtractError'
    this.code = code
  }
}

export function isResumeExtractError(e: unknown): e is ResumeExtractError {
  return e instanceof ResumeExtractError
}
