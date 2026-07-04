"""每 6 小时保活 · 刷新 Boss Session"""

from __future__ import annotations

import asyncio
import logging

from app.boss.auth import SessionExpiredError, open_boss_home
from app.browser.humanize import random_delay, simulate_human_scroll
from app.browser.persistent_context import open_user_context
from app.db import list_active_boss_users, touch_keepalive

log = logging.getLogger(__name__)

KEEPALIVE_STAY_SEC = 30


async def keepalive_user(user_id: str) -> None:
    log.info("保活开始 · user=%s", user_id)
    async with open_user_context(user_id) as context:
        page = context.pages[0] if context.pages else await context.new_page()
        await open_boss_home(page)
        await random_delay(2, 4)
        await simulate_human_scroll(page, duration_sec=KEEPALIVE_STAY_SEC)
        await random_delay(1, 2)

    touch_keepalive(user_id)
    log.info("保活完成 · user=%s", user_id)


async def keepalive_all() -> None:
    from app.tasks.exceptions import handle_task_error

    users = list_active_boss_users()
    log.info("保活任务：%d 个用户", len(users))
    for row in users:
        user_id = row["user_id"]
        try:
            await keepalive_user(user_id)
            await asyncio.sleep(3)
        except SessionExpiredError as e:
            await handle_task_error(user_id, e, task_name="keepalive")
        except Exception as e:
            await handle_task_error(user_id, e, task_name="keepalive")
