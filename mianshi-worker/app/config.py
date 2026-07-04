import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = Path(os.getenv("BOSS_DATA_DIR", str(ROOT / "data"))).resolve()
LOGS_DIR = Path(os.getenv("BOSS_LOGS_DIR", str(ROOT / "logs"))).resolve()
PROFILE_ROOT = Path(os.getenv("BOSS_PROFILE_ROOT", str(ROOT / "storage" / "profiles"))).resolve()
CONNECT_ROOT = Path(os.getenv("BOSS_CONNECT_ROOT", str(ROOT / "storage" / "connect"))).resolve()

DATABASE_URL = os.getenv("DATABASE_URL", "")
BOSS_HEADLESS = os.getenv("BOSS_HEADLESS", "true").lower() != "false"
MIANSHI_API_URL = os.getenv("MIANSHI_API_URL", "http://localhost:8788").rstrip("/")
WORKER_INTERNAL_KEY = os.getenv("WORKER_INTERNAL_KEY", "")
REBIND_WEBHOOK_URL = os.getenv("REBIND_WEBHOOK_URL", "")
REBIND_WEBHOOK_ENABLED = os.getenv("REBIND_WEBHOOK_ENABLED", "false").lower() == "true"
SCHEDULER_TZ = os.getenv("SCHEDULER_TZ", "Asia/Shanghai")
try:
    WORKER_HTTP_PORT = int(os.getenv("WORKER_HTTP_PORT", "8790"))
except ValueError:
    raise ValueError(
        f"WORKER_HTTP_PORT must be a number, got: {os.getenv('WORKER_HTTP_PORT')!r}"
    ) from None

BOSS_HOME = "https://www.zhipin.com"
BOSS_LOGIN_PATTERN = "/web/user/"
