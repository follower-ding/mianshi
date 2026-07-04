"""
Offer通 · Boss 长效打工 Worker

启动 APScheduler + 可选 FastAPI（健康检查 / Profile 初始化）
"""

from __future__ import annotations

import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)
log = logging.getLogger("mianshi-worker")


def run_scheduler():
    from app.tasks.scheduler import start_scheduler

    scheduler = start_scheduler()
    log.info("Worker 调度器运行中… Ctrl+C 退出")
    try:
        import time

        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        scheduler.shutdown(wait=False)
        log.info("Worker 已停止")


def run_http():
    import uvicorn
    from fastapi import FastAPI, Header, HTTPException
    from pydantic import BaseModel

    from app.browser.persistent_context import seed_profile_from_cookies
    from app.boss.browser_api import crawl_jobs_in_browser, send_greet_in_browser
    from app.config import WORKER_HTTP_PORT, WORKER_INTERNAL_KEY
    from app.db import set_profile_dir
    from app.routes.boss_login import router as boss_login_router
    from app.tasks.scheduler import start_scheduler

    app = FastAPI(title="mianshi-worker", version="0.1.0")
    app.include_router(boss_login_router)
    start_scheduler()

    def verify_key(x_worker_key: str | None = Header(default=None)):
        if not WORKER_INTERNAL_KEY:
            raise HTTPException(
                status_code=500,
                detail="WORKER_INTERNAL_KEY not configured on server",
            )
        if x_worker_key != WORKER_INTERNAL_KEY:
            raise HTTPException(status_code=401, detail="Invalid worker key")

    class SeedProfileBody(BaseModel):
        user_id: str
        cookie_header: str

    class BossGreetBody(BaseModel):
        user_id: str
        job_external_id: str
        greeting: str
        security_id: str | None = None
        lid: str | None = None

    class BossCrawlBody(BaseModel):
        user_id: str
        query: str
        city_code: str
        city_name: str
        max_jobs: int = 20

    @app.get("/health")
    def health():
        return {"ok": True, "service": "mianshi-worker"}

    @app.post("/internal/profile/seed")
    async def seed_profile(body: SeedProfileBody, x_worker_key: str | None = Header(default=None)):
        verify_key(x_worker_key)
        profile_path = await seed_profile_from_cookies(body.user_id, body.cookie_header)
        set_profile_dir(body.user_id, str(profile_path))
        return {"ok": True, "profile_dir": str(profile_path)}

    @app.post("/internal/boss/greet")
    async def boss_greet(body: BossGreetBody, x_worker_key: str | None = Header(default=None)):
        verify_key(x_worker_key)
        result = await send_greet_in_browser(
            body.user_id,
            job_external_id=body.job_external_id,
            greeting=body.greeting,
            security_id=body.security_id,
            lid=body.lid,
        )
        return result

    @app.post("/internal/boss/crawl")
    async def boss_crawl(body: BossCrawlBody, x_worker_key: str | None = Header(default=None)):
        verify_key(x_worker_key)
        jobs = await crawl_jobs_in_browser(
            body.user_id,
            query=body.query,
            city_code=body.city_code,
            city_name=body.city_name,
            max_jobs=min(body.max_jobs, 50),
        )
        return {"ok": True, "jobs": jobs, "count": len(jobs)}

    uvicorn.run(app, host="0.0.0.0", port=WORKER_HTTP_PORT, log_level="info")


if __name__ == "__main__":
    import os

    mode = os.getenv("WORKER_MODE", "http")  # http | scheduler-only
    if mode == "scheduler-only":
        run_scheduler()
    else:
        run_http()
