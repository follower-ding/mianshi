"""Boss 登录态检测与异常"""

from __future__ import annotations

import re

from app.config import BOSS_HOME, BOSS_LOGIN_PATTERN


class SessionExpiredError(Exception):
    """Cookie/Profile 失效，需用户重新扫码"""


_LOGIN_URL_RE = re.compile(r"zhipin\.com.*/web/user|login|signin", re.I)


async def is_login_page(page) -> bool:
    url = page.url or ""
    if BOSS_LOGIN_PATTERN in url or _LOGIN_URL_RE.search(url):
        return True
    try:
        if await page.locator("text=扫码登录").count() > 0:
            return True
        if await page.locator("text=验证码登录").count() > 0:
            return True
        if await page.locator(".login-container, .sign-form").count() > 0:
            return True
    except Exception:
        pass
    return False


async def assert_session_valid(page) -> None:
    if await is_login_page(page):
        raise SessionExpiredError("页面跳转到 Boss 登录页，Session 已失效或被风控踢下线")


async def open_boss_home(page) -> None:
    await page.goto(BOSS_HOME, wait_until="domcontentloaded", timeout=90000)
    await assert_session_valid(page)
