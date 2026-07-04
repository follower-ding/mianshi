"""随机延迟与鼠标/滚动模拟 · 防封"""

from __future__ import annotations

import asyncio
import random


async def random_delay(min_sec: float = 2.0, max_sec: float = 7.0) -> None:
    await asyncio.sleep(random.uniform(min_sec, max_sec))


async def simulate_human_scroll(page, duration_sec: float = 30.0) -> None:
    """在页面上随机滚动，模拟真人浏览"""
    elapsed = 0.0
    while elapsed < duration_sec:
        delta_y = random.randint(120, 480) * random.choice([1, 1, 1, -1])
        await page.mouse.wheel(0, delta_y)
        await random_delay(0.8, 2.5)
        elapsed += random.uniform(1.0, 2.5)

        if random.random() < 0.15:
            x = random.randint(200, 900)
            y = random.randint(200, 600)
            await page.mouse.move(x, y, steps=random.randint(8, 20))
            await random_delay(0.3, 1.0)


async def random_mouse_wiggle(page) -> None:
    for _ in range(random.randint(2, 5)):
        await page.mouse.move(
            random.randint(100, 1100),
            random.randint(100, 700),
            steps=random.randint(5, 15),
        )
        await asyncio.sleep(random.uniform(0.1, 0.4))
