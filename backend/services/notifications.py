import aiohttp
import logging
from typing import Optional
from core.config import settings

logger = logging.getLogger(__name__)


class NotificationService:
    """Handles email and Telegram notifications."""

    async def send_telegram(self, message: str, chat_id: Optional[str] = None) -> bool:
        """Send message via Telegram Bot API."""
        token = settings.TELEGRAM_BOT_TOKEN
        target_chat = chat_id or settings.TELEGRAM_CHAT_ID

        if not token or not target_chat:
            logger.warning("Telegram not configured")
            return False

        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {
            "chat_id": target_chat,
            "text": message,
            "parse_mode": "Markdown",
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as resp:
                    if resp.status == 200:
                        logger.info("Telegram notification sent")
                        return True
                    else:
                        logger.error(f"Telegram failed: {resp.status}")
                        return False
        except Exception as e:
            logger.error(f"Telegram error: {e}")
            return False

    async def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
    ) -> bool:
        """Send email via SendGrid API."""
        api_key = settings.SENDGRID_API_KEY
        from_email = settings.ALERT_FROM_EMAIL

        if not api_key or not from_email:
            logger.warning("SendGrid not configured")
            return False

        url = "https://api.sendgrid.com/v3/mail/send"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "personalizations": [{"to": [{"email": to_email}]}],
            "from": {"email": from_email, "name": "Stock Analyzer"},
            "subject": subject,
            "content": [{"type": "text/html", "value": body}],
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, headers=headers) as resp:
                    if resp.status in (200, 202):
                        logger.info(f"Email sent to {to_email}")
                        return True
                    else:
                        logger.error(f"SendGrid failed: {resp.status}")
                        return False
        except Exception as e:
            logger.error(f"Email error: {e}")
            return False

    async def send_alert(
        self,
        ticker: str,
        alert_type: str,
        message: str,
        email: Optional[str] = None,
    ):
        """Send alert via all configured channels."""
        telegram_msg = f"⚠️ *Alert: {ticker}*\n{message}"
        await self.send_telegram(telegram_msg)

        if email:
            html_body = f"""
            <h2>Stock Alert: {ticker}</h2>
            <p><strong>Alert Type:</strong> {alert_type}</p>
            <p>{message}</p>
            <hr>
            <small>Sent by Stock Analyzer</small>
            """
            await self.send_email(
                email,
                f"Stock Alert: {ticker} — {alert_type}",
                html_body,
            )
