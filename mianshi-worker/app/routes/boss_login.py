"""Boss 扫码登录 HTTP API（对齐参考项目 /api/login 系列）"""

from __future__ import annotations

import os

from fastapi import APIRouter, Header, HTTPException

from app.boss import login_manager

router = APIRouter(prefix="/api", tags=["boss-login"])

WORKER_INTERNAL_KEY = os.getenv("WORKER_INTERNAL_KEY", "")


def _verify(x_worker_key: str | None = Header(default=None)):
    if not WORKER_INTERNAL_KEY:
        raise HTTPException(
            status_code=500,
            detail="WORKER_INTERNAL_KEY not configured on server",
        )
    if x_worker_key != WORKER_INTERNAL_KEY:
        raise HTTPException(status_code=401, detail="Invalid worker key")


@router.get("/status")
def api_status(x_worker_key: str | None = Header(default=None)):
    _verify(x_worker_key)
    return login_manager.get_status_snapshot()


@router.post("/login")
def api_login(x_worker_key: str | None = Header(default=None)):
    _verify(x_worker_key)
    return login_manager.start_login()


@router.get("/login/check")
def api_login_check(x_worker_key: str | None = Header(default=None)):
    _verify(x_worker_key)
    return login_manager.check_login()


@router.post("/logout")
def api_logout(x_worker_key: str | None = Header(default=None)):
    _verify(x_worker_key)
    return login_manager.logout()
