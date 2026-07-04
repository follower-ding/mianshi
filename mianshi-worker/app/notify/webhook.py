"""NEED_REBIND Webhook 通知"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import httpx

from app.config import REBIND_WEBHOOK_ENABLED, REBIND_WEBHOOK_URL

log = logging.getLogger(__name__)


async def notify_need_rebind(user_id: str, reason: str, *, task_name: str = "") -> None:
    if not REBIND_WEBHOOK_ENABLED or not REBIND_WEBHOOK_URL:
        log.info("Webhook 未启用，跳过通知 · user=%s", user_id)
        return

    payload = {
        "event": "boss_need_rebind",
        "user_id": user_id,
        "reason": reason,
        "task": task_name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "message": f"Offer通用户 {user_id} Boss Session 失效，请引导重新扫码绑定。原因：{reason}",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(REBIND_WEBHOOK_URL, json=payload)
            res.raise_for_status()
        log.info("Webhook 已发送 · user=%s", user_id)
    except Exception as e:
        log.error("Webhook 发送失败 · user=%s · %s", user_id, e)
