import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Loader2, ZoomIn } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import {
  AVATAR_VIEWPORT,
  cropAvatarToDataUrl,
  defaultCropState,
  type AvatarCropState,
} from './avatarCrop'

type Props = {
  open: boolean
  imageSrc: string | null
  onClose: () => void
  onConfirm: (dataUrl: string) => void
}

export function AvatarCropModal({ open, imageSrc, onClose, onConfirm }: Props) {
  const [state, setState] = useState<AvatarCropState>(defaultCropState())
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })
  const imgRef = useRef<HTMLImageElement>(null)
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)

  const applyImageMetrics = (img: HTMLImageElement) => {
    if (!img.naturalWidth) return
    setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
    setReady(true)
    setLoadError(false)
  }

  useLayoutEffect(() => {
    if (!open) return
    setState(defaultCropState())
    setReady(false)
    setLoadError(false)
    setImgSize({ w: 0, h: 0 })
    if (!imageSrc) return

    const checkLoaded = () => {
      const img = imgRef.current
      if (!img) return
      if (img.complete) {
        if (img.naturalWidth) applyImageMetrics(img)
        else setLoadError(true)
      }
    }

    checkLoaded()
    requestAnimationFrame(checkLoaded)
  }, [open, imageSrc])

  const onImageLoad = () => {
    const img = imgRef.current
    if (!img) return
    applyImageMetrics(img)
  }

  const onImageError = () => {
    setReady(false)
    setLoadError(true)
  }

  const imageStyle = useMemo(() => {
    if (!imgSize.w) return { visibility: 'hidden' as const }
    const baseScale = Math.max(AVATAR_VIEWPORT / imgSize.w, AVATAR_VIEWPORT / imgSize.h)
    const scale = baseScale * state.zoom
    const w = imgSize.w * scale
    const h = imgSize.h * scale
    const x = (AVATAR_VIEWPORT - w) / 2 + state.panX
    const y = (AVATAR_VIEWPORT - h) / 2 + state.panY
    return {
      width: w,
      height: h,
      transform: `translate(${x}px, ${y}px)`,
      visibility: 'visible' as const,
    }
  }, [imgSize, state])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!ready) return
    dragRef.current = { x: e.clientX, y: e.clientY, panX: state.panX, panY: state.panY }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    setState((s) => ({
      ...s,
      panX: drag.panX + (e.clientX - drag.x),
      panY: drag.panY + (e.clientY - drag.y),
    }))
  }

  const handlePointerUp = () => {
    dragRef.current = null
  }

  const handleConfirm = async () => {
    const img = imgRef.current
    if (!img?.naturalWidth) return
    setLoading(true)
    await new Promise((r) => requestAnimationFrame(r))
    const dataUrl = cropAvatarToDataUrl(img, state)
    setLoading(false)
    if (dataUrl) onConfirm(dataUrl)
  }

  return (
    <Modal open={open} onClose={onClose} title="裁剪头像" maxWidth="max-w-md">
      <p className="mb-4 text-sm text-text-secondary">拖动调整位置，滑块缩放，输出正方形头像</p>

      <div
        className="relative mx-auto touch-none overflow-hidden rounded-xl bg-slate-800 ring-1 ring-border/40"
        style={{ width: AVATAR_VIEWPORT, height: AVATAR_VIEWPORT }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {imageSrc && (
          <img
            key={imageSrc}
            ref={imgRef}
            src={imageSrc}
            alt=""
            className="absolute left-0 top-0 z-0 max-w-none select-none"
            style={imageStyle}
            onLoad={onImageLoad}
            onError={onImageError}
            draggable={false}
          />
        )}
        {!ready && !loadError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-800/80 text-white/70">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
        {loadError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-800 px-4 text-center text-xs text-white/80">
            图片加载失败，请换一张 JPG / PNG / WebP
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-0 z-20 rounded-xl ring-2 ring-white/90 ring-inset"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.35))] [mask:radial-gradient(circle_at_center,transparent_118px,black_119px)]"
          aria-hidden
        />
      </div>

      <label className="mt-4 flex items-center gap-3 text-sm text-text-secondary">
        <ZoomIn className="h-4 w-4 shrink-0" />
        <span className="w-10 shrink-0 text-xs">缩放</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={state.zoom}
          onChange={(e) => setState((s) => ({ ...s, zoom: Number(e.target.value) }))}
          className="h-1.5 flex-1 cursor-pointer accent-brand"
          disabled={!ready}
        />
        <span className="w-8 text-right text-xs tabular-nums">{state.zoom.toFixed(1)}×</span>
      </label>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onClose}>
          取消
        </Button>
        <Button size="sm" disabled={!ready || loading} onClick={handleConfirm}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '确认使用'}
        </Button>
      </div>
    </Modal>
  )
}
