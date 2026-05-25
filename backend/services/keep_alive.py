"""
Keep-alive ping service for Render free tier.
Render spins down free services after 15 min of inactivity,
causing a ~30s cold start on the next request.

This background task pings the service every 10 minutes to keep it warm.
Only runs when KEEP_ALIVE=true is set in environment variables.
"""
import asyncio
import logging
import os
import aiohttp

logger = logging.getLogger(__name__)


async def keep_alive_loop():
    """Ping own /health endpoint every 10 minutes."""
    if os.getenv("KEEP_ALIVE", "").lower() != "true":
        return

    # Get own URL from Render's environment variable
    own_url = os.getenv("RENDER_EXTERNAL_URL", "")
    if not own_url:
        logger.info("RENDER_EXTERNAL_URL not set — keep-alive disabled")
        return

    health_url = f"{own_url}/health"
    logger.info(f"Keep-alive enabled — pinging {health_url} every 10 min")

    await asyncio.sleep(60)  # Wait 1 min after startup before first ping

    while True:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(health_url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status == 200:
                        logger.debug("Keep-alive ping OK")
                    else:
                        logger.warning(f"Keep-alive ping returned {resp.status}")
        except Exception as e:
            logger.warning(f"Keep-alive ping failed: {e}")

        await asyncio.sleep(600)  # 10 minutes
