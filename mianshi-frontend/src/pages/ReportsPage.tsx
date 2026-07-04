import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { BarChart3 } from "lucide-react"
import { api, type InterviewReportSummary } from "../api/client"
import { Button } from "../components/ui/Button"
import { Card } from "../components/ui/Card"
import { Badge } from "../components/ui/Badge"
import { Loading, EmptyState } from "../components/ui/Loading"

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function ReportsPage() {
  const [items, setItems] = useState<InterviewReportSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState("all")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.listReports()
      setItems(res.items)
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const displayed = filter === "all" ? items : items.filter((i) => i.totalScore > 0)

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 lg:px-8 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text">面试记录</h1>
          <p className="mt-1 text-sm text-text-secondary">回顾你的每一次面试表现</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-secondary outline-none"
        >
          <option value="all">全部状态</option>
          <option value="completed">已完成</option>
        </select>
      </div>

      {loading ? (
        <Loading text="加载面试记录..." />
      ) : error ? (
        <div className="rounded-xl bg-danger-light px-4 py-3 text-sm text-danger">{error}</div>
      ) : displayed.length === 0 ? (
        <EmptyState
          icon="📊"
          title="暂无面试记录"
          description="完成一次模拟面试后，报告将自动生成"
          action={<Link to="/interview"><Button>开始面试</Button></Link>}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayed.map((item, i) => (
              <Card key={item.id} className="p-5 animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="info">岗位面试</Badge>
                  <div className="flex items-center gap-1">
                    <BarChart3 className="h-4 w-4 text-brand-dark" />
                    <span className="text-lg font-bold text-brand-dark">{item.totalScore}</span>
                  </div>
                </div>
                <h3 className="mt-3 text-lg font-bold text-text">{item.position}</h3>
                <div className="mt-3 space-y-1.5 text-sm text-text-secondary">
                  <div className="flex justify-between">
                    <span>难度等级</span>
                    <span className="font-medium text-text">{item.overallRating}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>面试轮次</span>
                    <span className="font-medium text-text">{item.answerCount} 轮</span>
                  </div>
                  <div className="flex justify-between">
                    <span>工作年限</span>
                    <span className="font-medium text-text">{item.experience}</span>
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted">{formatDateTime(item.createdAt)}</div>
                <div className="mt-4 flex items-center justify-between border-t border-border-light pt-4">
                  <Badge variant="success">已完成</Badge>
                  <Link
                    to={"/reports/" + item.id}
                    className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-text transition hover:bg-brand-hover"
                  >
                    查看结果
                  </Link>
                </div>
              </Card>
            ))}
          </div>
          <p className="mt-6 text-right text-sm text-muted">共 {displayed.length} 条记录</p>
        </>
      )}
    </div>
  )
}
