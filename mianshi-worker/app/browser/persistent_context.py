"""
★ 核心：Playwright Persistent Context 启动与关闭
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from playwright.async_api import BrowserContext, Playwright, async_playwright

from app.browser.stealth import apply_stealth
from app.config import BOSS_HEADLESS, PROFILE_ROOT

log = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

_launch_args = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-blink-features=AutomationControlled",
    "--disable-dev-shm-usage",
]


def profile_dir_for_user(user_id: str) -> Path:
    path = PROFILE_ROOT / f"user_{user_id}"
    path.mkdir(parents=True, exist_ok=True)
    return path


def connect_dir(connect_id: str) -> Path:
    from app.config import CONNECT_ROOT

    path = CONNECT_ROOT / connect_id
    path.mkdir(parents=True, exist_ok=True)
    return path


async def _launch_persistent(playwright: Playwright, user_data_dir: Path) -> BrowserContext:
    log.info("启动 persistent context: %s", user_data_dir)
    context = await playwright.chromium.launch_persistent_context(
        user_data_dir=str(user_data_dir),
        headless=BOSS_HEADLESS,
        args=_launch_args,
        user_agent=USER_AGENT,
        viewport={"width": 1280, "height": 800},
        locale="zh-CN",
        timezone_id="Asia/Shanghai",
        ignore_https_errors=True,
    )
    if not context.pages:
        page = await context.new_page()
    else:
        page = context.pages[0]
    await apply_stealth(page)
    return context


@asynccontextmanager
async def open_user_context(user_id: str) -> AsyncIterator[BrowserContext]:
    """为已绑定用户打开持久化浏览器环境"""
    user_data_dir = profile_dir_for_user(user_id)
    if not user_data_dir.exists():
        raise FileNotFoundError(f"Profile 不存在: {user_data_dir}")

    async with async_playwright() as playwright:
        context = await _launch_persistent(playwright, user_data_dir)
        try:
            yield context
        finally:
            await context.close()
            log.info("已关闭 persistent context · user=%s", user_id)


async def seed_profile_from_cookies(user_id: str, cookie_header: str) -> Path:
    """
    首次绑定时：创建 persistent profile 并注入 Cookie。
    Node API 在扫码成功后可 HTTP 调用 Worker 执行此函数。
    """
    user_data_dir = profile_dir_for_user(user_id)
    cookies = []
    for part in cookie_header.split(";"):
        part = part.strip()
        if not part or "=" not in part:
            continue
        name, value = part.split("=", 1)
        cookies.append(
            {
                "name": name.strip(),
                "value": value.strip(),
                "domain": ".zhipin.com",
                "path": "/",
            }
        )

    async with async_playwright() as playwright:
        context = await _launch_persistent(playwright, user_data_dir)
        try:
            if cookies:
                await context.add_cookies(cookies)
            page = context.pages[0] if context.pages else await context.new_page()
            await apply_stealth(page)
            await page.goto("https://www.zhipin.com", wait_until="domcontentloaded", timeout=60000)
        finally:
            await context.close()

    log.info("Profile 已初始化 · user=%s · dir=%s", user_id, user_data_dir)
    return user_data_dir
