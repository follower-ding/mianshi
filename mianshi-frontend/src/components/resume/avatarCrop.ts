export const AVATAR_VIEWPORT = 240
export const AVATAR_OUTPUT = 400

export type AvatarCropState = {
  zoom: number
  panX: number
  panY: number
}

export function defaultCropState(): AvatarCropState {
  return { zoom: 1, panX: 0, panY: 0 }
}

export function cropAvatarToDataUrl(
  image: HTMLImageElement,
  state: AvatarCropState,
  viewport = AVATAR_VIEWPORT,
  output = AVATAR_OUTPUT,
): string {
  const canvas = document.createElement('canvas')
  canvas.width = output
  canvas.height = output
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const baseScale = Math.max(viewport / image.naturalWidth, viewport / image.naturalHeight)
  const scale = baseScale * state.zoom
  const w = image.naturalWidth * scale
  const h = image.naturalHeight * scale
  const x = (viewport - w) / 2 + state.panX
  const y = (viewport - h) / 2 + state.panY

  const ratio = output / viewport
  ctx.scale(ratio, ratio)
  ctx.drawImage(image, x, y, w, h)

  return canvas.toDataURL('image/jpeg', 0.9)
}

function dataUrlFromBitmap(bitmap: ImageBitmap): string {
  const max = 4096
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('读取图片失败')
  ctx.drawImage(bitmap, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', 0.92)
}

export async function readImageFile(file: File): Promise<string> {
  if (file.size > 2_097_152) {
    throw new Error('图片请小于 2MB')
  }
  const okType =
    file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name)
  if (!okType) {
    throw new Error('请上传 JPG、PNG 或 WebP 图片')
  }

  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      const dataUrl = dataUrlFromBitmap(bitmap)
      bitmap.close()
      return dataUrl
    } catch {
      // fallback to FileReader
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}
