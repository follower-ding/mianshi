"""
浏览器内执行 Boss API（在真实 Chrome Profile 上下文中 fetch，规避 Node 环境异常）
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.browser.humanize import random_delay
from app.browser.persistent_context import open_user_context

log = logging.getLogger(__name__)

BOSS_ORIGIN = "https://www.zhipin.com"


async def _page_fetch(page, path: str, *, method: str = "GET", form: dict[str, str] | None = None) -> dict[str, Any]:
    """在页面上下文中调用 Boss 同源 API"""
    return await page.evaluate(
        """async ({ path, method, form }) => {
          const opts = { method, credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' } };
          if (form && method === 'POST') {
            opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            opts.body = new URLSearchParams(form).toString();
          }
          const res = await fetch(path.startsWith('http') ? path : `https://www.zhipin.com${path}`, opts);
          try { return await res.json(); } catch { return { code: -1, message: 'invalid json' }; }
        }""",
        {"path": path, "method": method, "form": form or {}},
    )


def _parse_job_item(raw: dict[str, Any], city: str) -> dict[str, Any] | None:
    job_info = raw.get("jobInfo") or raw
    brand = raw.get("brandComInfo") or raw
    external_id = str(job_info.get("encryptJobId") or job_info.get("jobId") or raw.get("encryptJobId") or "")
    if not external_id:
        return None
    boss_meta: dict[str, str] = {"jobId": external_id}
    security_id = str(raw.get("securityId") or job_info.get("securityId") or "")
    lid = str(raw.get("lid") or job_info.get("lid") or "")
    if security_id:
        boss_meta["securityId"] = security_id
    if lid:
        boss_meta["lid"] = lid
    return {
        "title": str(job_info.get("jobName") or job_info.get("title") or "未知岗位"),
        "company": str(brand.get("brandName") or brand.get("companyName") or "未知公司"),
        "salary": str(job_info.get("salaryDesc") or job_info.get("salary") or "面议"),
        "city": city,
        "experience": str(job_info.get("jobExperience") or "经验不限"),
        "education": str(job_info.get("jobDegree") or "本科"),
        "tags": [],
        "externalId": external_id,
        "jd": str(job_info.get("postDescription") or job_info.get("jobDesc") or "")[:2000],
        "bossMeta": boss_meta,
    }


async def send_greet_in_browser(
    user_id: str,
    *,
    job_external_id: str,
    greeting: str,
    security_id: str | None = None,
    lid: str | None = None,
) -> dict[str, Any]:
    """在 persistent Chrome 内发送打招呼（friend/add.json）"""
    greeting = (greeting or "")[:500]
    async with open_user_context(user_id) as context:
        page = context.pages[0] if context.pages else await context.new_page()
        job_url = f"{BOSS_ORIGIN}/job_detail/{job_external_id}.html"
        await page.goto(job_url, wait_until="domcontentloaded", timeout=90000)
        await random_delay(2, 4)

        meta = {"securityId": security_id or "", "lid": lid or "", "jobId": job_external_id}
        if not meta["securityId"]:
            detail = await _page_fetch(page, f"/wapi/zpgeek/job/detail.json?jobId={job_external_id}")
            if detail.get("code") == 0:
                zp = detail.get("zpData") or {}
                job_card = zp.get("jobInfo") or zp
                meta["securityId"] = str(job_card.get("securityId") or zp.get("securityId") or "")
                meta["lid"] = str(job_card.get("lid") or zp.get("lid") or meta["lid"])

        if not meta["securityId"]:
            html = await page.content()
            import re

            m = re.search(r'"securityId"\s*:\s*"([^"]+)"', html)
            if m:
                meta["securityId"] = m.group(1)

        if not meta["securityId"]:
            return {"ok": False, "message": "浏览器内无法解析 securityId，请重新抓取该岗位"}

        await random_delay(1, 3)
        result = await _page_fetch(
            page,
            "/wapi/zpgeek/friend/add.json",
            method="POST",
            form={
                "jobId": meta["jobId"],
                "securityId": meta["securityId"],
                "lid": meta["lid"],
                "greet": greeting,
            },
        )
        code = result.get("code")
        msg = str(result.get("message") or result.get("zpData") or "")
        if code == 0:
            return {
                "ok": True,
                "message": "Boss 打招呼已发送（浏览器通道）",
                "securityId": meta["securityId"],
                "channel": "browser",
            }
        if any(k in msg for k in ("已沟通", "已发送", "重复")):
            return {
                "ok": True,
                "message": msg,
                "securityId": meta["securityId"],
                "channel": "browser",
            }
        return {"ok": False, "message": msg or f"Boss 返回 code={code}", "channel": "browser"}


async def crawl_jobs_in_browser(
    user_id: str,
    *,
    query: str,
    city_code: str,
    city_name: str,
    max_jobs: int = 20,
) -> list[dict[str, Any]]:
    """在 persistent Chrome 内抓取职位列表"""
    async with open_user_context(user_id) as context:
        page = context.pages[0] if context.pages else await context.new_page()
        search_url = f"{BOSS_ORIGIN}/web/geek/jobs?query={query}&city={city_code}"
        await page.goto(search_url, wait_until="domcontentloaded", timeout=90000)
        await random_delay(2, 5)

        jobs: list[dict[str, Any]] = []
        seen: set[str] = set()
        for page_no in range(1, 4):
            if len(jobs) >= max_jobs:
                break
            result = await _page_fetch(
                page,
                "/wapi/zpgeek/search/joblist.json",
                method="POST",
                form={
                    "scene": "1",
                    "query": query,
                    "city": city_code,
                    "page": str(page_no),
                    "pageSize": str(min(30, max_jobs)),
                },
            )
            if result.get("code") != 0:
                log.warning("browser crawl page %s failed: %s", page_no, result.get("message"))
                break
            zp = result.get("zpData") or {}
            lst = zp.get("jobList") or zp.get("list") or []
            if not isinstance(lst, list) or not lst:
                break
            for raw in lst:
                if not isinstance(raw, dict):
                    continue
                item = _parse_job_item(raw, city_name)
                if not item or item["externalId"] in seen:
                    continue
                seen.add(item["externalId"])
                jobs.append(item)
                if len(jobs) >= max_jobs:
                    break
            await random_delay(1.5, 3)
        return jobs


def send_greet_sync(**kwargs) -> dict[str, Any]:
    return asyncio.run(send_greet_in_browser(**kwargs))


def crawl_jobs_sync(**kwargs) -> list[dict[str, Any]]:
    return asyncio.run(crawl_jobs_in_browser(**kwargs))
