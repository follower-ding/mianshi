import { useState } from 'react'

import { X, ZoomIn, ImageOff } from 'lucide-react'

import { isSafeImageSrc, isSvgSrc, normalizeMarkdownImageSrc } from '../../lib/markdownImage'



type Props = {

  src?: string

  alt?: string

}



function Failed({ message }: { message: string }) {

  return (

    <div className="my-4 flex items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-bg-subtle/80 px-4 py-8 text-sm text-muted">

      <ImageOff className="h-4 w-4 shrink-0" />

      {message}

    </div>

  )

}



export function MarkdownImage({ src, alt }: Props) {

  const [expanded, setExpanded] = useState(false)

  const [broken, setBroken] = useState(false)

  const resolved = normalizeMarkdownImageSrc(src)

  const svg = isSvgSrc(src)



  if (!resolved || !isSafeImageSrc(src)) {

    return <Failed message="图片地址无效" />

  }



  if (broken) {

    return <Failed message="图片加载失败" />

  }



  const mediaCls = 'mx-auto max-h-[420px] w-full object-contain'



  return (

    <>

      <figure className="my-5 last:mb-0">

        <div

          role="button"

          tabIndex={0}

          onClick={() => setExpanded(true)}

          onKeyDown={(e) => e.key === 'Enter' && setExpanded(true)}

          className="group relative cursor-zoom-in overflow-hidden rounded-xl border border-border/60 bg-[#0f172a]/40 text-left shadow-sm transition hover:border-brand/35"

        >

          {svg ? (

            <object

              data={resolved}

              type="image/svg+xml"

              aria-label={alt ?? 'diagram'}

              className={`${mediaCls} pointer-events-none min-h-[180px]`}

              onError={() => setBroken(true)}

            />

          ) : (

            <img

              src={resolved}

              alt={alt ?? ''}

              loading="lazy"

              decoding="async"

              onError={() => setBroken(true)}

              className={mediaCls}

            />

          )}

          <span className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100">

            <ZoomIn className="h-3 w-3" />

            放大

          </span>

        </div>

        {alt && (

          <figcaption className="mt-2 text-center text-[13px] leading-relaxed text-muted">

            {alt}

          </figcaption>

        )}

      </figure>



      {expanded && (

        <div

          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"

          onClick={() => setExpanded(false)}

          role="dialog"

          aria-modal="true"

          aria-label={alt || '图片预览'}

        >

          <button

            type="button"

            onClick={() => setExpanded(false)}

            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"

            aria-label="关闭"

          >

            <X className="h-5 w-5" />

          </button>

          {svg ? (

            <object

              data={resolved}

              type="image/svg+xml"

              aria-label={alt ?? 'diagram'}

              className="max-h-[90vh] max-w-[min(960px,96vw)] rounded-lg shadow-2xl"

              onClick={(e) => e.stopPropagation()}

            />

          ) : (

            <img

              src={resolved}

              alt={alt ?? ''}

              className="max-h-[90vh] max-w-[min(960px,96vw)] rounded-lg object-contain shadow-2xl"

              onClick={(e) => e.stopPropagation()}

            />

          )}

          {alt && (

            <p className="absolute bottom-6 left-1/2 max-w-lg -translate-x-1/2 text-center text-sm text-white/80">

              {alt}

            </p>

          )}

        </div>

      )}

    </>

  )

}

