# iume — AI 求职备战

参考 [面多多](https://ai.mianshiya.com/) 打造的面试求职帮助网站。

> **项目进度**：[docs/PROJECT-STATUS-REPORT.md](docs/PROJECT-STATUS-REPORT.md)（综合评分 8.2/10 · 2026-06-23）

## 功能

| 模块 | 说明 |
|------|------|
| AI 模拟面试 | LLM 驱动问答 + Rubric 评分 + 追问 + 流式回复 |
| 摄像头面试 | 浏览器 WebRTC（getUserMedia）实时预览 |
| 面试题库 | PostgreSQL/JSON 双模式 + 审核流 + 去重 + 智能导入 |
| 刷题 + 学习路线 | Quiz 评分（含 demo 降级）+ 路径规划 |
| 真实面经 | CRUD + 面经→候选题自动生成 |
| **简历工作台** | AI 生成 · 导入向导 · 排版编辑 · 导出 · 公开分享 |
| **智能投递** | Boss 绑定 + 岗位工作台（需 mianshi-worker） |
| 用户体系 | JWT 登录注册，报告归属用户 |
| 运营后台 | 质量看板、题库审核、智能导入、AI 补全 |
| LLM Gateway | 健康探测 + 响应缓存 + Prompt A/B + demo 降级 |

## 快速启动

```powershell
# 1. 启动 PostgreSQL（推荐，启用完整 Phase 3 能力）
docker compose -f d:\cursor_project\mianshi\docker-compose.yml up -d

# 2. 配置 API 环境变量（复制 .env.example，填写 DATABASE_URL、LLM_API_KEY）
# DATABASE_URL=postgresql://mianshi:mianshi@localhost:5432/mianshi

# 3. 一键启动前后端
& d:\cursor_project\mianshi\scripts\dev.ps1

# 或分别启动
cd mianshi-api && npm install && npm run dev    # http://localhost:8788
cd mianshi-frontend && npm install && npm run dev  # http://localhost:5174
```

**默认管理员**（PostgreSQL 模式首次启动自动创建）：
- 邮箱：`admin@mianshi.local`
- 密码：`admin123456`

未配置 `DATABASE_URL` 时自动降级为 JSON 文件存储（无用户体系/运营后台）。

**PostgreSQL 小白教程（含不用 Docker 的安装方式）：** [docs/POSTGRESQL_GUIDE.md](docs/POSTGRESQL_GUIDE.md)

## 质量保障

```powershell
cd mianshi-api
npm run quality:regression   # Golden Set 评分回归 90 组
npm run test:quiz-score
npm run test:resume-field-coverage
npm run test:smart-import-batch
npm run test:resume-all      # 简历 API 回归（4 项）
npm run typecheck

cd ../mianshi-frontend
npm run build
npm run check:bundles        # 入口 chunk ≤350 KB
npm run test:e2e             # Playwright 9 specs / 20 用例
```

**CI**：`.github/workflows/ci.yml`（typecheck + regression + build + bundle check + E2E）  
**CD**：`.github/workflows/cd.yml` + [deploy/AUTO-DEPLOY.md](deploy/AUTO-DEPLOY.md) + [deploy/GITHUB-SECRETS.md](deploy/GITHUB-SECRETS.md)

推送前：

```powershell
.\scripts\check-secrets.ps1
.\scripts\verify-github-secrets.ps1   # 需 gh auth login
```

## API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/info?probe=1` | 服务信息 + LLM 可达性 |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/interview/start` | 开始面试（题库驱动） |
| POST | `/api/resumes/parse-preview` | 简历智能识别预览 |
| POST | `/api/resumes/:id/share` | 创建公开分享（可选过期） |
| GET | `/api/public/r/:token` | 公开只读简历 |
| POST | `/api/import/parse-text` | 智能导入题目 |

完整接口见 `mianshi-api/src/routes/`（21 模块）。

## 技术栈

- **前端**：React 19 + Vite 8 + Tailwind CSS 4 + React Router 7 + 路由 lazy + Playwright
- **后端**：Hono + PostgreSQL + JWT + OpenAI SDK（LLM Gateway）
- **Worker**：Python FastAPI + Playwright（Boss 自动化，可选）
- **存储**：PostgreSQL 优先，`db.json` 降级
- **部署**：Docker + GHCR + SSH CD

## 项目结构

```
mianshi/
├── docker-compose.yml           # 本地 PostgreSQL + worker（dev）
├── .github/workflows/           # ci.yml + cd.yml
├── deploy/                      # 生产 Docker + CD 文档
├── mianshi-api/                 # 后端 API
├── mianshi-frontend/            # 前端 SPA + e2e/
├── mianshi-worker/              # Boss 自动化 Worker
├── docs/
│   ├── PROJECT-STATUS-REPORT.md # 项目总进度报告
│   ├── RESUME-LAUNCH-PLAN.md    # 简历商业化路线
│   ├── QUALITY_REPORT.md        # 质量平台架构
│   └── POSTGRESQL_GUIDE.md      # PostgreSQL 教程
└── scripts/                     # dev.ps1, check-secrets, verify-github-secrets
```
