"""
Boss 直聘共享工具（Cookie 持久化、会话校验、浏览器注入）

单实例默认使用 data/cookies.json；结构预留 user_id 扩展。
"""

from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import Any

import requests

from app.config import BOSS_HOME, DATA_DIR, LOGS_DIR

# --- 路径（可扩展为多用户：COOKIE_FILE = DATA_DIR / f"cookies_{user_id}.json"）---
COOKIE_FILE = DATA_DIR / "cookies.json"
LOGIN_LOG_FILE = LOGS_DIR / "login.log"

# --- Boss 官方接口 ---
USER_INFO_URL = "https://www.zhipin.com/wapi/zpuser/wap/getUserInfo.json"
BOSS_LOGIN_URL = "https://www.zhipin.com/web/user/?ka=header-login"

KEY_COOKIE_NAMES = ("wt2", "__zp_stoken__", "geek_name")
DOM_USER_SELECTORS = (".user-name", ".nav-figure-text", ".label-text .user-name", "[class*='user-name']")

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

DEFAULT_HEADERS = {
    "User-Agent": USER_AGENT,
    "Referer": f"{BOSS_HOME}/",
}


def setup_logging(name: str = "boss_login", log_file: Path | None = None) -> logging.Logger:
    """配置日志：控制台 + logs/login.log"""
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)
    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")

    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(fmt)
    logger.addHandler(stream_handler)

    target = log_file or LOGIN_LOG_FILE
    target.parent.mkdir(parents=True, exist_ok=True)
    file_handler = logging.FileHandler(target, encoding="utf-8")
    file_handler.setFormatter(fmt)
    logger.addHandler(file_handler)

    return logger


def ensure_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    LOGS_DIR.mkdir(parents=True, exist_ok=True)


def save_cookies(cookies: list[dict[str, Any]], cookie_file: Path | None = None) -> None:
    """保存浏览器 cookie 数组到 JSON 文件。"""
    ensure_dirs()
    path = cookie_file or COOKIE_FILE
    path.write_text(json.dumps(cookies, ensure_ascii=False, indent=2), encoding="utf-8")


def load_cookies(cookie_file: Path | None = None) -> list[dict[str, Any]]:
    path = cookie_file or COOKIE_FILE
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            return [c for c in data if isinstance(c, dict) and c.get("name")]
    except Exception:
        pass
    return []


def delete_cookies(cookie_file: Path | None = None) -> None:
    path = cookie_file or COOKIE_FILE
    if path.exists():
        path.unlink()


def cookies_to_header(cookies: list[dict[str, Any]]) -> str:
    return "; ".join(f"{c['name']}={c['value']}" for c in cookies if c.get("name") and c.get("value") is not None)


def count_key_cookies(cookies: list[dict[str, Any]]) -> int:
    names = {c.get("name") for c in cookies if isinstance(c, dict)}
    return sum(1 for key in KEY_COOKIE_NAMES if key in names)


def has_likely_login_cookies(cookies: list[dict[str, Any]], min_keys: int = 2) -> bool:
    return count_key_cookies(cookies) >= min_keys


def normalize_drission_cookies(raw) -> list[dict[str, Any]]:
    """将 DrissionPage cookies 输出规范为 Playwright 兼容数组。"""
    items: list[dict[str, Any]] = []
    if isinstance(raw, dict) and "cookies" in raw:
        raw = raw["cookies"]
    if isinstance(raw, dict) and raw and "name" not in raw:
        for name, value in raw.items():
            items.append(
                {
                    "name": name,
                    "value": str(value),
                    "domain": ".zhipin.com",
                    "path": "/",
                }
            )
        return items
    if not isinstance(raw, list):
        return items
    for c in raw:
        if not isinstance(c, dict) or not c.get("name"):
            continue
        item = {
            "name": c["name"],
            "value": str(c.get("value", "")),
            "domain": c.get("domain") or ".zhipin.com",
            "path": c.get("path") or "/",
        }
        if c.get("expires") is not None:
            item["expires"] = c["expires"]
        if c.get("httpOnly") is not None:
            item["httpOnly"] = c["httpOnly"]
        if c.get("secure") is not None:
            item["secure"] = c["secure"]
        if c.get("sameSite") is not None:
            item["sameSite"] = c["sameSite"]
        items.append(item)
    return items


def collect_drission_cookies(page) -> list[dict[str, Any]]:
    """从 DrissionPage 页面收集全部域 Cookie（含 HttpOnly）。"""
    collectors = []
    zhipin_urls = ["https://www.zhipin.com", "https://login.zhipin.com", "https://m.zhipin.com"]

    try:
        collectors.append(lambda: page.cookies(all_domains=True))
    except Exception:
        pass
    try:
        if hasattr(page, "browser"):
            collectors.append(lambda: page.browser.cookies())
    except Exception:
        pass
    collectors.extend(
        [
            lambda: page.run_cdp("Network.getAllCookies"),
            lambda: page.run_cdp("Network.getCookies", {"urls": zhipin_urls}),
            lambda: page.cookies(),
        ]
    )

    best: list[dict[str, Any]] = []
    for fn in collectors:
        try:
            raw = fn()
            normalized = normalize_drission_cookies(raw)
            if len(normalized) > len(best):
                best = normalized
        except Exception:
            continue
    return best


def test_cookie_valid(cookies: list[dict[str, Any]]) -> dict[str, Any]:
    """
    调用 Boss 官方 getUserInfo.json 校验 Cookie。
    返回: { valid, code, message, zpData }
    """
    if not cookies:
        return {"valid": False, "code": 7, "message": "Cookie 为空", "zpData": None}

    header = cookies_to_header(cookies)
    try:
        resp = requests.get(USER_INFO_URL, headers={**DEFAULT_HEADERS, "Cookie": header}, timeout=15)
        data = resp.json()
        code = data.get("code")
        zp_data = data.get("zpData")
        if code == 0 and zp_data:
            return {
                "valid": True,
                "code": 0,
                "message": "已登录",
                "zpData": zp_data,
            }
        if code == 7:
            return {"valid": False, "code": 7, "message": "未登录或会话失效", "zpData": None}
        return {
            "valid": False,
            "code": code,
            "message": str(data.get("message") or "校验失败"),
            "zpData": None,
        }
    except Exception as e:
        return {"valid": False, "code": -1, "message": str(e), "zpData": None}


def check_login_status(cookie_file: Path | None = None) -> dict[str, Any]:
    """读取本地 Cookie 文件并做权威 API 校验；失效则删除文件。"""
    path = cookie_file or COOKIE_FILE
    cookies = load_cookies(path)
    exists = path.exists() and bool(cookies)

    if not cookies:
        return {
            "logged_in": False,
            "cookie_exists": exists,
            "message": "Cookie 文件不存在或为空",
            "zpData": None,
        }

    if not has_likely_login_cookies(cookies):
        delete_cookies(path)
        return {
            "logged_in": False,
            "cookie_exists": False,
            "message": "关键 Cookie 不足，已清理本地文件",
            "zpData": None,
        }

    result = test_cookie_valid(cookies)
    if not result["valid"]:
        delete_cookies(path)
        return {
            "logged_in": False,
            "cookie_exists": False,
            "message": result.get("message") or "会话失效",
            "zpData": None,
        }

    return {
        "logged_in": True,
        "cookie_exists": True,
        "message": "已登录",
        "zpData": result.get("zpData"),
    }


def get_user_info(cookie_file: Path | None = None) -> dict[str, Any] | None:
    status = check_login_status(cookie_file)
    return status.get("zpData") if status.get("logged_in") else None


def apply_cookies_to_drission_page(page, cookies: list[dict[str, Any]]) -> None:
    """先访问主站再注入 Cookie（DrissionPage）。"""
    page.get(BOSS_HOME)
    time.sleep(1)
    for c in cookies:
        try:
            page.set.cookies(c)
        except Exception:
            try:
                page.set.cookies(
                    {
                        "name": c["name"],
                        "value": c["value"],
                        "domain": c.get("domain", ".zhipin.com"),
                        "path": c.get("path", "/"),
                    }
                )
            except Exception:
                pass
    page.get(BOSS_HOME)
    time.sleep(1)


def normalize_playwright_cookie(c: dict[str, Any]) -> dict[str, Any]:
    item: dict[str, Any] = {
        "name": c["name"],
        "value": str(c.get("value", "")),
        "domain": c.get("domain") or ".zhipin.com",
        "path": c.get("path") or "/",
    }
    if not item["domain"].startswith(".") and "zhipin.com" in item["domain"]:
        item["domain"] = "." + item["domain"].lstrip(".")
    if c.get("expires") is not None:
        item["expires"] = int(c["expires"])
    if c.get("httpOnly") is not None:
        item["httpOnly"] = bool(c["httpOnly"])
    if c.get("secure") is not None:
        item["secure"] = bool(c["secure"])
    same_site = c.get("sameSite")
    if same_site in ("Strict", "Lax", "None"):
        item["sameSite"] = same_site
    return item


async def apply_cookies_to_playwright(context, page, cookies: list[dict[str, Any]]) -> None:
    """先 goto 主站，再 add_cookies（Playwright）。"""
    await page.goto(BOSS_HOME, wait_until="domcontentloaded", timeout=60000)
    normalized = [normalize_playwright_cookie(c) for c in cookies if c.get("name")]
    if normalized:
        await context.add_cookies(normalized)
    await page.goto(BOSS_HOME, wait_until="domcontentloaded", timeout=60000)


def detect_dom_username(page) -> str | None:
    """备用：DOM 检测已登录用户名。"""
    for sel in DOM_USER_SELECTORS:
        try:
            el = page.ele(sel, timeout=0.5)
            if el:
                text = (el.text or "").strip()
                if text and len(text) < 30 and "登录" not in text:
                    return text
        except Exception:
            continue
    return None


def cookie_file_for_user(user_id: str | None = None) -> Path:
    """预留多用户扩展点。"""
    if not user_id:
        return COOKIE_FILE
    return DATA_DIR / f"cookies_{user_id}.json"
