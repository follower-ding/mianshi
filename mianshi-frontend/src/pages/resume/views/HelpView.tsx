import { Link } from 'react-router-dom'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { resumeUi } from '../../../components/resume/resumeLayout'
import { Button } from '../../../components/ui/Button'

export function HelpView() {
  return (
    <div className={resumeUi.moduleMain}>
      <div className="h-full overflow-y-auto px-4 py-6 lg:px-8">
        <article className="prose prose-invert mx-auto max-w-3xl prose-headings:text-text prose-p:text-text-secondary prose-li:text-text-secondary prose-strong:text-text">
          <Link to="/resume/mine" className="not-prose inline-flex items-center gap-1 text-sm text-brand">
            <ArrowLeft className="h-4 w-4" /> 返回我的简历
          </Link>

          <header className="not-prose mt-6 border-b border-border/50 pb-5">
            <div className="flex items-center gap-2 text-brand">
              <BookOpen className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wider">Help</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-text">简历模块使用帮助</h1>
            <p className="mt-1 text-sm text-text-secondary">导入、演示模式与导出说明</p>
          </header>

          <h2 id="import">导入说明</h2>
          <p>简历导入采用<strong>三步向导</strong>，请按顺序操作：</p>
          <ol>
            <li>
              <strong>上传或粘贴原文</strong> — 支持 PDF、DOCX、TXT、Markdown，单文件上限 10MB。
            </li>
            <li>
              <strong>确认提取文本</strong> — 核对系统从文件中提取的纯文本，可手动修改后再继续。
            </li>
            <li>
              <strong>智能识别并对照</strong> — AI 将文本结构化为各模块，请在对照弹窗中确认后再应用。
            </li>
          </ol>

          <h3>重要预期</h3>
          <ul>
            <li>
              导入是<strong>智能识别 + 重新排版</strong>，<strong>不能</strong> 1:1 还原 PDF 原稿版式。
            </li>
            <li>
              <strong>扫描版 PDF</strong>（图片型）通常无法提取文字，请改用可复制文本的 PDF，或直接粘贴 Word/网页中的正文。
            </li>
            <li>识别完成后务必进入「排版编辑」检查各字段，必要时手动修正。</li>
          </ul>

          <h2 id="demo">演示模式说明</h2>
          <p>
            当 API 未配置有效的 <code>LLM_API_KEY</code> 时，系统进入<strong>演示模式</strong>：
          </p>
          <ul>
            <li>快速生成、智能识别、全文/分模块优化会使用<strong>规则模板</strong>，而非大模型定制。</li>
            <li>界面会显示「演示模式」徽章；识别/优化前会弹出确认提示。</li>
            <li>演示结果可用于体验流程，但<strong>不建议</strong>直接用于正式投递。</li>
          </ul>
          <p>
            生产环境请在 <code>mianshi-api/.env</code> 配置 <code>LLM_API_KEY</code> 并重启 API。
            可在「导入优化」页顶部查看当前是否已连接大模型。
          </p>

          <h2 id="export">导出与分享</h2>
          <ul>
            <li>
              <strong>分享给 HR</strong>：优先使用「导出 PDF」或「服务端 PDF」；公开链接为只读快照，无需登录即可查看。
            </li>
            <li>
              <strong>编辑页链接</strong>：需登录，适合本人继续编辑，不适合发给 HR。
            </li>
            <li>PNG/JPG 适合社交平台；多页简历建议使用 PDF。</li>
          </ul>

          <div className="not-prose mt-8">
            <Link to="/resume/optimize">
              <Button>开始导入优化</Button>
            </Link>
          </div>
        </article>
      </div>
    </div>
  )
}
