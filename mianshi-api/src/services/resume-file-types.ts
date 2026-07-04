export const ALLOWED_RESUME_EXTENSIONS = ['pdf', 'txt', 'md', 'markdown', 'docx'] as const

export function isAllowedResumeExtension(ext: string): boolean {
  return (ALLOWED_RESUME_EXTENSIONS as readonly string[]).includes(ext)
}

export function allowedResumeExtensionsLabel(): string {
  return ALLOWED_RESUME_EXTENSIONS.join(', ')
}
