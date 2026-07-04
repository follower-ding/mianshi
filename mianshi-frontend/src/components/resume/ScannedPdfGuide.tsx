import { FileText, ScanLine } from 'lucide-react'

type Props = {
  compact?: boolean
}

export function ScannedPdfGuide({ compact }: Props) {
  return (
    <div
      className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3"
      role="status"
    >
      <div className="flex items-start gap-2">
        <ScanLine className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-medium text-amber-950">扫描版 PDF 无法直接提取文字</p>
          {!compact && (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-amber-900/90">
              <li>用 Adobe、微信或系统自带工具 OCR 后复制全文，粘贴到下方文本框</li>
              <li>在 Word / WPS 打开 PDF 并复制文字</li>
              <li>导出为可搜索 PDF（非纯图片）后重新上传</li>
            </ul>
          )}
          {compact && (
            <p className="mt-1 text-xs text-amber-900/90">
              请 OCR 或复制全文后粘贴到文本框继续。
            </p>
          )}
          <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-800">
            <FileText className="h-3 w-3" aria-hidden />
            粘贴至少 30 字原文后可继续智能识别
          </p>
        </div>
      </div>
    </div>
  )
}
