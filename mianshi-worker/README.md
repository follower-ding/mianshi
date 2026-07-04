# Offer通 Boss Worker

Python 侧 Playwright 持久化 Context + APScheduler 定时打工。

## 快速启动

```powershell
cd mianshi-worker
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
copy .env.example .env
python main.py
```

## 模式

| WORKER_MODE | 说明 |
|-------------|------|
| `http`（默认） | FastAPI :8790 + 调度器 |
| `scheduler-only` | 仅后台调度 |

## API

- `GET /health`
- `POST /internal/profile/seed` — Node 绑定成功后初始化 Profile

Header: `X-Worker-Key: <WORKER_INTERNAL_KEY>`

详见 [docs/BOSS_WORKER_ARCHITECTURE.md](../docs/BOSS_WORKER_ARCHITECTURE.md)
