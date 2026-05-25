from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Stock Analyzer"
    DEBUG: bool = False
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "https://localhost:3000",
    ]

    # Database — Supabase free tier
    # Format: postgresql+asyncpg://postgres:[password]@db.[ref].supabase.co:5432/postgres
    DATABASE_URL: str = "sqlite+aiosqlite:///./stocksage.db"  # SQLite fallback if no DB set

    # AI — optional, app works without it (uses rule-based fallback)
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"  # cheaper model by default

    # Data Sources — yfinance is always free, others optional
    ALPHA_VANTAGE_API_KEY: str = ""
    FINNHUB_API_KEY: str = ""  # free tier: 60 calls/min

    # Notifications — all optional
    SENDGRID_API_KEY: str = ""
    ALERT_FROM_EMAIL: str = ""
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""

    @property
    def has_openai(self) -> bool:
        return bool(self.OPENAI_API_KEY and self.OPENAI_API_KEY.startswith("sk-"))

    @property
    def has_database(self) -> bool:
        return bool(self.DATABASE_URL)

    @property
    def is_sqlite(self) -> bool:
        return "sqlite" in self.DATABASE_URL

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
