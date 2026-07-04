"""Playwright 反检测 · 等价 playwright_stealth"""

from __future__ import annotations

STEALTH_INIT_SCRIPT = """
() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  window.chrome = { runtime: {} };
  Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  const originalQuery = window.navigator.permissions.query;
  window.navigator.permissions.query = (parameters) =>
    parameters.name === 'notifications'
      ? Promise.resolve({ state: Notification.permission })
      : originalQuery(parameters);
}
"""


async def apply_stealth(page) -> None:
    await page.add_init_script(STEALTH_INIT_SCRIPT)
