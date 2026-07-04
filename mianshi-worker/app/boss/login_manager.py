"""Boss 扫码登录子进程管理（线程锁 + 内存状态）"""

from __future__ import annotations

import subprocess
import sys
import threading
from typing import Any

from app.boss.boss_utils import COOKIE_FILE, check_login_status, delete_cookies, setup_logging
from app.config import ROOT

log = setup_logging("login_manager")

LOGIN_SCRIPT = ROOT / "scripts" / "login_helper.py"

_lock = threading.Lock()
login_process: subprocess.Popen | None = None
login_status: dict[str, Any] = {
    "logged_in": False,
    "in_progress": False,
    "message": "",
}


def _python_bin() -> str:
    win_venv = ROOT / ".venv" / "Scripts" / "python.exe"
    if win_venv.exists():
        return str(win_venv)
    unix_venv = ROOT / ".venv" / "bin" / "python"
    if unix_venv.exists():
        return str(unix_venv)
    return sys.executable


def _sync_logged_in_from_file() -> None:
    status = check_login_status()
    login_status["logged_in"] = bool(status.get("logged_in"))
    if status.get("logged_in"):
        zp = status.get("zpData") or {}
        name = zp.get("name") or zp.get("showName") or "Boss 用户"
        login_status["message"] = f"已登录: {name}"
    elif not login_status.get("in_progress"):
        login_status["message"] = status.get("message") or ""


def get_status_snapshot() -> dict[str, Any]:
    with _lock:
        file_status = check_login_status()
        _sync_logged_in_from_file()
        proc = login_process
        in_progress = login_status["in_progress"] or (proc is not None and proc.poll() is None)
        return {
            "logged_in": login_status["logged_in"],
            "cookie_exists": COOKIE_FILE.exists(),
            "login_in_progress": in_progress,
            "message": login_status.get("message") or file_status.get("message") or "",
        }


def check_login() -> dict[str, Any]:
    with _lock:
        file_status = check_login_status()
        proc = login_process
        in_progress = login_status["in_progress"] or (proc is not None and proc.poll() is None)
        login_status["logged_in"] = bool(file_status.get("logged_in"))
        login_status["in_progress"] = in_progress
        if file_status.get("logged_in"):
            zp = file_status.get("zpData") or {}
            login_status["message"] = f"已登录: {zp.get('name') or zp.get('showName') or 'Boss 用户'}"
        return {
            "logged_in": login_status["logged_in"],
            "login_in_progress": in_progress,
            "message": login_status.get("message") or file_status.get("message") or "",
            "zpData": file_status.get("zpData"),
        }


def _on_process_exit(proc: subprocess.Popen) -> None:
    global login_process
    code = proc.poll()
    with _lock:
        login_status["in_progress"] = False
        login_process = None
        _sync_logged_in_from_file()
        if code == 0 and login_status["logged_in"]:
            log.info("登录子进程成功退出")
        elif code != 0:
            login_status["message"] = login_status.get("message") or f"登录子进程退出 code={code}"
            log.warning("登录子进程退出 code=%s", code)


def start_login() -> dict[str, Any]:
    global login_process

    with _lock:
        existing = login_process
        if existing and existing.poll() is None:
            return {"ok": False, "message": "已有登录任务进行中", "login_in_progress": True}

        file_status = check_login_status()
        if file_status.get("logged_in"):
            login_status["logged_in"] = True
            login_status["message"] = "本地 Cookie 仍有效，无需重新登录"
            return {"ok": True, "message": login_status["message"], "login_in_progress": False, "skipped": True}

        if not LOGIN_SCRIPT.exists():
            return {"ok": False, "message": f"缺少登录脚本: {LOGIN_SCRIPT}"}

        login_status["in_progress"] = True
        login_status["message"] = "正在打开 Chrome，请扫码…"
        login_status["logged_in"] = False

        proc = subprocess.Popen(
            [_python_bin(), str(LOGIN_SCRIPT)],
            cwd=str(ROOT),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        login_process = proc

        def _watch():
            proc.wait()
            _on_process_exit(proc)

        threading.Thread(target=_watch, daemon=True).start()

        return {"ok": True, "message": login_status["message"], "login_in_progress": True}


def logout() -> dict[str, Any]:
    global login_process

    with _lock:
        proc = login_process
        if proc and proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
        login_process = None
        delete_cookies()
        login_status["logged_in"] = False
        login_status["in_progress"] = False
        login_status["message"] = "已退出登录"
        return {"ok": True, "message": "已删除 cookies.json 并终止登录子进程"}
