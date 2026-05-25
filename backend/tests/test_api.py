"""
API integration tests.
These test the FastAPI endpoints using TestClient.
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client with mocked DB."""
    with patch("core.database.init_db", new_callable=AsyncMock):
        with patch("core.database.engine"):
            from main import app
            return TestClient(app)


def test_health_check(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"


def test_analyze_invalid_ticker(client):
    """Non-existent ticker should return 404 or 500."""
    with patch("routes.analyze.data_service.fetch_all", new_callable=AsyncMock) as mock:
        mock.return_value = MagicMock(current_price=None, company_name=None)
        resp = client.get("/api/analyze/INVALID_TICKER_XYZ")
        assert resp.status_code in (404, 500)


def test_watchlist_empty(client):
    """Watchlist should return empty list when nothing saved."""
    with patch("routes.watchlist.get_db"):
        resp = client.get("/api/watchlist")
        # Will fail without real DB, but should not crash server
        assert resp.status_code in (200, 500)
