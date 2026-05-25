from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from core.config import settings
import logging

logger = logging.getLogger(__name__)


def _make_engine():
    url = settings.DATABASE_URL
    if "sqlite" in url:
        # SQLite — no pool settings needed
        logger.info("Using SQLite database (free local fallback)")
        return create_async_engine(
            url,
            echo=settings.DEBUG,
            connect_args={"check_same_thread": False},
        )
    else:
        # PostgreSQL (Supabase free tier)
        logger.info("Using PostgreSQL database (Supabase)")
        return create_async_engine(
            url,
            echo=settings.DEBUG,
            pool_pre_ping=True,
            pool_size=5,       # Supabase free tier: max 60 connections
            max_overflow=10,
            pool_recycle=300,  # Recycle connections every 5 min
        )


engine = _make_engine()

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created/verified")


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
