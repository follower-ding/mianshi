"""
Boss 直聘扫码登录子进程（DrissionPage ChromiumPage）

用法:
  python login_helper.py                          # 独立模式 → data/cookies.json
  python login_helper.py <connect_id> <connect_dir>  # Web 绑定模式 → login_status.json
"""
from __future__ import annotations

import base64
import json
import socket
import sys
import time
from pathlib import Path

# scripts/ 下运行时把 worker 根目录加入 path
_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from app.boss.boss_utils import (  # noqa: E402
    BOSS_LOGIN_URL,
    collect_drission_cookies,
    detect_dom_username,
    has_likely_login_cookies,
    save_cookies,
    setup_logging,
    test_cookie_valid,
    check_login_status,
    COOKIE_FILE,
)
from app.config import BOSS_HOME  # noqa: E402

MAX_WAIT_SEC = 300
POLL_INTERVAL = 1

log = setup_logging("login_helper")


def find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return int(s.getsockname()[1])


def create_chromium_page(profile_dir: Path | None = None):
    """创建 DrissionPage 实例。勿在 auto_port() 之后 set_user_data_path()，会清空调试地址。"""
    from DrissionPage import ChromiumOptions, ChromiumPage

    co = ChromiumOptions()
    co.headless(False)
    co.set_local_port(find_free_port())
    if profile_dir:
        profile_dir.mkdir(parents=True, exist_ok=True)
        co.set_user_data_path(str(profile_dir))
    co.set_argument("--disable-blink-features=AutomationControlled")
    co.set_argument("--no-first-run")
    co.set_argument("--no-default-browser-check")
    co.set_argument("--window-size=1280,800")
    return ChromiumPage(co)


def write_connect_status(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def try_finish_with_cookies(
    page,
    cookies: list[dict],
    *,
    connect_id: str | None = None,
    status_path: Path | None = None,
    cookie_file: Path | None = None,
) -> bool:
    if not has_likely_login_cookies(cookies):
        return False

    result = test_cookie_valid(cookies)
    if not result.get("valid"):
        log.info("关键 Cookie 已出现但 API 校验未通过: %s", result.get("message"))
        return False

    save_cookies(cookies, cookie_file or COOKIE_FILE)
    zp = result.get("zpData") or {}
    boss_name = str(zp.get("name") or zp.get("showName") or "Boss 用户")
    boss_uid = str(zp.get("userId") or zp.get("encryptUserId") or "")
    log.info("登录成功: %s (uid=%s, cookies=%d)", boss_name, boss_uid, len(cookies))

    if connect_id and status_path:
        from app.boss.boss_utils import cookies_to_header

        write_connect_status(
            status_path,
            {
                "connectId": connect_id,
                "status": "success",
                "inProgress": False,
                "error": None,
                "bossName": boss_name,
                "bossUid": boss_uid,
                "cookieHeader": cookies_to_header(cookies),
                "cookies": cookies,
                "qrImageBase64": None,
                "loggedInPending": False,
            },
        )
        # connect 目录也存一份，供自动化脚本复用
        save_cookies(cookies, status_path.parent / "cookies.json")

    time.sleep(2)
    return True


def capture_preview_base64(page) -> str | None:
    try:
        url = page.url or ""
        if "login.zhipin.com" not in url and "web/user" not in url:
            return None
        png = page.get_screenshot(as_bytes=True, full_page=False)
        if png and len(png) > 1000:
            return "data:image/png;base64," + base64.b64encode(png).decode("ascii")
    except Exception:
        pass
    return None


def run_qr_login(
    *,
    connect_id: str | None = None,
    connect_dir: Path | None = None,
    profile_dir: Path | None = None,
) -> int:
    """扫码登录主流程（独立 / connect 双模式）。"""
    status_path = (connect_dir / "login_status.json") if connect_dir else None
    cookie_out = COOKIE_FILE

    # 1. 启动先校验本地 Cookie
    cached = check_login_status(cookie_out)
    if cached.get("logged_in"):
        log.info("本地 Cookie 有效，跳过浏览器登录")
        if connect_id and status_path:
            zp = cached.get("zpData") or {}
            from app.boss.boss_utils import cookies_to_header, load_cookies

            cookies = load_cookies(cookie_out)
            write_connect_status(
                status_path,
                {
                    "connectId": connect_id,
                    "status": "success",
                    "inProgress": False,
                    "error": None,
                    "bossName": str(zp.get("name") or zp.get("showName") or "Boss 用户"),
                    "bossUid": str(zp.get("userId") or zp.get("encryptUserId") or ""),
                    "cookieHeader": cookies_to_header(cookies),
                    "cookies": cookies,
                    "qrImageBase64": None,
                },
            )
        return 0

    if status_path:
        write_connect_status(
            status_path,
            {
                "connectId": connect_id,
                "status": "waiting_scan",
                "inProgress": True,
                "error": None,
                "bossName": None,
                "bossUid": None,
                "cookieHeader": None,
                "qrImageBase64": None,
            },
        )

    page = None
    last_qr_at = 0.0
    last_dom_check = 0.0
    last_error = ""

    try:
        page = create_chromium_page(profile_dir)
        page.get(BOSS_LOGIN_URL)
        time.sleep(2)
        log.info("已打开 Boss 登录页: %s", page.url)

        for _ in range(MAX_WAIT_SEC):
            try:
                cookies = collect_drission_cookies(page)

                # 主路径：关键 Cookie ≥2 + API 校验
                if try_finish_with_cookies(
                    page,
                    cookies,
                    connect_id=connect_id,
                    status_path=status_path,
                    cookie_file=cookie_out,
                ):
                    return 0

                # 备用：DOM 用户名（每 3 秒）
                now = time.time()
                if now - last_dom_check >= 3:
                    username = detect_dom_username(page)
                    last_dom_check = now
                    if username:
                        log.info("DOM 检测到用户名: %s，重新采集 Cookie", username)
                        page.get(BOSS_HOME)
                        time.sleep(1.5)
                        cookies = collect_drission_cookies(page)
                        if try_finish_with_cookies(
                            page,
                            cookies,
                            connect_id=connect_id,
                            status_path=status_path,
                            cookie_file=cookie_out,
                        ):
                            return 0

                # connect 模式：同步二维码预览
                if status_path and now - last_qr_at >= 3:
                    preview = capture_preview_base64(page)
                    if preview:
                        write_connect_status(
                            status_path,
                            {
                                "connectId": connect_id,
                                "status": "waiting_scan",
                                "inProgress": True,
                                "error": None,
                                "bossName": None,
                                "bossUid": None,
                                "cookieHeader": None,
                                "qrImageBase64": preview,
                            },
                        )
                    last_qr_at = now

            except Exception as e:
                last_error = str(e)
                log.warning("轮询异常: %s", e)
                try:
                    cookies = collect_drission_cookies(page)
                    if try_finish_with_cookies(
                        page,
                        cookies,
                        connect_id=connect_id,
                        status_path=status_path,
                        cookie_file=cookie_out,
                    ):
                        return 0
                except Exception:
                    pass

            time.sleep(POLL_INTERVAL)

        msg = last_error or "扫码登录超时（300 秒）"
        log.error(msg)
        if status_path:
            write_connect_status(
                status_path,
                {
                    "connectId": connect_id,
                    "status": "failed",
                    "inProgress": False,
                    "error": msg,
                    "bossName": None,
                    "bossUid": None,
                    "cookieHeader": None,
                    "qrImageBase64": None,
                },
            )
        return 1

    except Exception as e:
        log.exception("登录失败")
        if status_path:
            write_connect_status(
                status_path,
                {
                    "connectId": connect_id,
                    "status": "failed",
                    "inProgress": False,
                    "error": str(e),
                    "bossName": None,
                    "bossUid": None,
                    "cookieHeader": None,
                    "qrImageBase64": None,
                },
            )
        return 1
    finally:
        if page is not None:
            try:
                page.quit()
            except Exception:
                pass


def main() -> None:
    if len(sys.argv) >= 3:
        connect_id = sys.argv[1]
        connect_dir = Path(sys.argv[2]).resolve()
        profile_dir = connect_dir / "chrome-profile"
        sys.exit(
            run_qr_login(
                connect_id=connect_id,
                connect_dir=connect_dir,
                profile_dir=profile_dir,
            )
        )

    sys.exit(run_qr_login())


if __name__ == "__main__":
    main()
