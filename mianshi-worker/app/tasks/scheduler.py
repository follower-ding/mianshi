"""★ APScheduler 定时任务注册"""

from __future__ import annotations

import asyncio
import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.config import SCHEDULER_TZ

log = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def _run_async(coro_fn):
    """在 APScheduler 线程中运行 async 协程"""
    def wrapper():
        try:
            asyncio.run(coro_fn())
        except Exception:
            log.exception("调度任务异常 · %s", coro_fn.__name__)

    return wrapper


def create_scheduler() -> BackgroundScheduler:
    from app.boss.agent import run_daily_agent_all
    from app.tasks.keepalive import keepalive_all

    scheduler = BackgroundScheduler(timezone=SCHEDULER_TZ)

    # 核心打工：08:30 / 14:00（HR 活跃时段）
    scheduler.add_job(
        _run_async(run_daily_agent_all),
        CronTrigger(hour=8, minute=30, timezone=SCHEDULER_TZ),
        id="daily_agent_morning",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    scheduler.add_job(
        _run_async(run_daily_agent_all),
        CronTrigger(hour=14, minute=0, timezone=SCHEDULER_TZ),
        id="daily_agent_afternoon",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    # 保活：每 6 小时
    scheduler.add_job(
        _run_async(keepalive_all),
        IntervalTrigger(hours=6, timezone=SCHEDULER_TZ),
        id="keepalive_6h",
        replace_existing=True,
        misfire_grace_time=1800,
    )

    log.info("APScheduler 已注册: 08:30/14:00 打工 + 每6h 保活 (tz=%s)", SCHEDULER_TZ)
    return scheduler


def start_scheduler() -> BackgroundScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = create_scheduler()
        _scheduler.start()
    return _scheduler


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler:
        _scheduler.shutdown(wait=False)
        _scheduler = None
