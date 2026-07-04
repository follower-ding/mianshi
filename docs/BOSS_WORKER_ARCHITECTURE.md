# Offer通 · Boss 长效打工系统架构

> Playwright Persistent Context + APScheduler + 保活 + NEED_REBIND 唤醒

## 总体架构

```
┌─────────────────────────────────────────────────────────────────┐
│  mianshi-frontend   登录扫码 / 智能投递工作台                    │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST
┌────────────────────────────▼────────────────────────────────────┐
│  mianshi-api (Node/Hono)                                        │
│  · QR 扫码绑定 → saveBossSession + initPersistentProfile          │
│  · GET /boss/session → status: active | need_rebind             │
│  · POST /internal/worker/* （Worker 回调 / 触发）                │
└────────────┬───────────────────────────────┬────────────────────┘
             │ PostgreSQL                     │ HTTP (可选)
┌────────────▼───────────────────────────────▼────────────────────┐
│  mianshi-worker (Python)                                          │
│  · launch_persistent_context(storage/profiles/user_{id})          │
│  · APScheduler: 08:30 / 14:00 打工 · 每 6h 保活                   │
│  · playwright stealth + random_delay                              │
│  · SessionExpired → NEED_REBIND + Webhook                         │
└─────────────────────────────────────────────────────────────────┘
```

## 目录结构

```
mianshi-worker/
├── main.py                      # 启动调度器 + 可选 FastAPI
├── requirements.txt
├── .env.example
├── README.md
└── app/
    ├── config.py                # 环境变量
    ├── db.py                    # PostgreSQL 读写 boss_sessions
    ├── browser/
    │   ├── persistent_context.py  # ★ 持久化 Context 启动/关闭
    │   ├── humanize.py            # random_delay / 模拟滚动
    │   └── stealth.py             # 反检测脚本注入
    ├── boss/
    │   ├── auth.py                # 登录页检测 / SessionExpiredError
    │   └── agent.py               # 抓取→投递→监听 全流程
    ├── tasks/
    │   ├── scheduler.py           # ★ APScheduler 注册
    │   ├── daily_agent.py         # 08:30 / 14:00 打工
    │   └── keepalive.py           # 每 6h 保活
    └── notify/
        └── webhook.py             # NEED_REBIND 通知
```

## 持久化 Profile 路径

| 阶段 | 路径 |
|------|------|
| 扫码中（未登录 Offer通） | `storage/connect_{connectId}/` |
| 绑定成功后 | `storage/profiles/user_{userId}/` |

Node 在 `bindBossOnAuth` 时调用 `initPersistentProfile(userId, cookieHeader)` 写入 Profile。

Worker 只读写 `storage/profiles/user_{userId}/`。

## 定时任务

| Cron | 任务 | 说明 |
|------|------|------|
| `30 8 * * *` | `daily_agent_all` | 早高峰 HR 活跃 |
| `0 14 * * *` | `daily_agent_all` | 下午活跃 |
| 每 6 小时 | `keepalive_all` | 打开 Boss 首页滚动 30s |

## 状态机

```
active ──(检测到登录页)──► need_rebind ──(用户重新扫码)──► active
   │                              │
   └── keepalive 成功 ──► 刷新 last_keepalive_at
```

## 启动

```powershell
# 1. API（已有）
cd mianshi-api; npm run dev

# 2. Worker
cd mianshi-worker
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
copy .env.example .env
python main.py
```

## 环境变量

见 `mianshi-worker/.env.example` 与 `mianshi-api/.env.example` 新增项。
