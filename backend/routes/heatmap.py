from fastapi import APIRouter
from services.sector_heatmap import build_sector_heatmap

router = APIRouter()


@router.get("/heatmap/sectors")
async def get_sector_heatmap():
    """Get sector-level scoring heatmap for NSE."""
    return await build_sector_heatmap()
