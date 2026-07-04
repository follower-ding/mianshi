"""抓取 → AI 打分 → 打招呼 → 监听 HR 回复 · 全自动流"""

from __future__ import annotations

import asyncio
import logging

import httpx

from app.boss.auth import SessionExpiredError, assert_session_valid, open_boss_home
from app.browser.humanize import random_delay, random_mouse_wiggle, simulate_human_scroll
from app.browser.persistent_context import open_user_context
from app.config import MIANSHI_API_URL, WORKER_INTERNAL_KEY

log = logging.getLogger(__name__)


async def _trigger_api_agent(user_id: str) -> dict:
    """委托 Node API 执行 AI 打分、入库、HTTP 层投递与 inbox 同步"""
    headers = {"X-Worker-Key": WORKER_INTERNAL_KEY} if WORKER_INTERNAL_KEY else {}
    async with httpx.AsyncClient(timeout=300.0) as client:
        res = await client.post(
            f"{MIANSHI_API_URL}/api/internal/worker/boss-agent/{user_id}",
            headers=headers,
        )
        res.raise_for_status()
        return res.json()


async def _browser_warmup_crawl(page, user_id: str) -> None:
    """浏览器侧：打开职位搜索页，模拟真人浏览（配合 API 侧 Firecrawl/Playwright 抓取）"""
    await open_boss_home(page)
    await random_delay(2, 5)
    await random_mouse_wiggle(page)

    search_url = "https://www.zhipin.com/web/geek/jobs?query=Java"
    await page.goto(search_url, wait_until="domcontentloaded", timeout=90000)
    await assert_session_valid(page)
    await random_delay(3, 6)
    await simulate_human_scroll(page, duration_sec=15)

    chat_url = "https://www.zhipin.com/web/geek/chat"
    try:
        await page.goto(chat_url, wait_until="domcontentloaded", timeout=60000)
        await assert_session_valid(page)
        await random_delay(2, 4)
        log.info("已浏览消息页 · user=%s", user_id)
    except Exception as e:
        log.warning("消息页访问跳过 · user=%s · %s", user_id, e)


async def run_daily_agent_for_user(user_id: str) -> dict:
    """
    单用户打工任务：
    1. 打开 persistent context
    2. 校验 Session
    3. 浏览器暖场 + 触发 Node 侧完整 Agent Pipeline
    """
    log.info("开始打工任务 · user=%s", user_id)

    async with open_user_context(user_id) as context:
        page = context.pages[0] if context.pages else await context.new_page()
        await _browser_warmup_crawl(page, user_id)

    # 浏览器关闭后再调 API（避免双开 profile 锁）
    await random_delay(1, 3)
    api_result = await _trigger_api_agent(user_id)

    log.info("打工完成 · user=%s · %s", user_id, api_result)
    return {"user_id": user_id, "browser": "ok", "api": api_result}


async def run_daily_agent_all() -> None:
    from app.db import list_active_boss_users
    from app.tasks.exceptions import handle_task_error

    users = list_active_boss_users()
    log.info("打工任务：%d 个活跃用户", len(users))
    for row in users:
        user_id = row["user_id"]
        try:
            await run_daily_agent_for_user(user_id)
            await asyncio.sleep(5)  # 用户间间隔，降低并发风控
        except Exception as e:
            await handle_task_error(user_id, e, task_name="daily_agent")
