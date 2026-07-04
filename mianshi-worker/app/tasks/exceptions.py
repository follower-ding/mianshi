"""任务异常统一处理 · NEED_REBIND + Webhook"""

from __future__ import annotations

import logging

from app.boss.auth import SessionExpiredError
from app.db import mark_need_rebind
from app.notify.webhook import notify_need_rebind

log = logging.getLogger(__name__)


async def handle_task_error(user_id: str, error: Exception, *, task_name: str) -> None:
    if isinstance(error, SessionExpiredError):
        reason = str(error)
        mark_need_rebind(user_id, reason)
        await notify_need_rebind(user_id, reason, task_name=task_name)
        log.error("[%s] Session 失效 · user=%s", task_name, user_id)
        return

    if isinstance(error, FileNotFoundError):
        mark_need_rebind(user_id, "浏览器 Profile 缺失，请重新扫码绑定")
        await notify_need_rebind(user_id, str(error), task_name=task_name)
        return

    log.exception("[%s] 任务失败 · user=%s · %s", task_name, user_id, error)
