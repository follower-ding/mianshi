"""PostgreSQL · boss_sessions 读写"""

from __future__ import annotations

import logging
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Iterator

import psycopg2
from psycopg2.extras import RealDictCursor

from app.config import DATABASE_URL

log = logging.getLogger(__name__)


@contextmanager
def get_conn() -> Iterator[psycopg2.extensions.connection]:
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL 未配置")
    conn = psycopg2.connect(DATABASE_URL)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def list_active_boss_users() -> list[dict]:
    """status = active 且 profile_dir 非空"""
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT user_id, boss_name, profile_dir, status, last_keepalive_at
                FROM boss_sessions
                WHERE status = 'active' AND profile_dir IS NOT NULL AND profile_dir <> ''
                """
            )
            return list(cur.fetchall())


def mark_need_rebind(user_id: str, reason: str) -> None:
    now = datetime.now(timezone.utc)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE boss_sessions
                SET status = 'need_rebind',
                    rebind_reason = %s,
                    updated_at = %s
                WHERE user_id = %s
                """,
                (reason[:500], now, user_id),
            )
    log.warning("用户 %s 标记 NEED_REBIND: %s", user_id, reason)


def touch_keepalive(user_id: str) -> None:
    now = datetime.now(timezone.utc)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE boss_sessions
                SET last_keepalive_at = %s, last_validated_at = %s, updated_at = %s
                WHERE user_id = %s
                """,
                (now, now, now, user_id),
            )


def set_profile_dir(user_id: str, profile_dir: str) -> None:
    now = datetime.now(timezone.utc)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE boss_sessions
                SET profile_dir = %s, status = 'active', rebind_reason = NULL, updated_at = %s
                WHERE user_id = %s
                """,
                (profile_dir, now, user_id),
            )
