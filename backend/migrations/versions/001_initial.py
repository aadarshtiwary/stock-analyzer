"""initial tables

Revision ID: 001_initial
Revises:
Create Date: 2025-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'watchlist',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('ticker', sa.String(20), nullable=False),
        sa.Column('company_name', sa.String(200), nullable=True),
        sa.Column('added_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('last_score', sa.Float(), nullable=True),
        sa.Column('last_verdict', sa.String(20), nullable=True),
        sa.Column('last_analyzed', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('alerts_enabled', sa.Boolean(), nullable=True, default=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_watchlist_ticker', 'watchlist', ['ticker'])

    op.create_table(
        'analysis_results',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('ticker', sa.String(20), nullable=False),
        sa.Column('analyzed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('score', sa.Float(), nullable=True),
        sa.Column('verdict', sa.String(20), nullable=True),
        sa.Column('metrics', sa.JSON(), nullable=True),
        sa.Column('metric_results', sa.JSON(), nullable=True),
        sa.Column('ai_analysis', sa.JSON(), nullable=True),
        sa.Column('raw_data', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_analysis_results_ticker', 'analysis_results', ['ticker'])

    op.create_table(
        'alerts',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('ticker', sa.String(20), nullable=False),
        sa.Column('alert_type', sa.String(50), nullable=True),
        sa.Column('condition', sa.String(200), nullable=True),
        sa.Column('threshold_value', sa.Float(), nullable=True),
        sa.Column('current_value', sa.Float(), nullable=True),
        sa.Column('triggered_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('notified_email', sa.Boolean(), nullable=True, default=False),
        sa.Column('notified_telegram', sa.Boolean(), nullable=True, default=False),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'portfolios',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'portfolio_holdings',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('portfolio_id', sa.String(), nullable=False),
        sa.Column('ticker', sa.String(20), nullable=False),
        sa.Column('company_name', sa.String(200), nullable=True),
        sa.Column('quantity', sa.Float(), nullable=False),
        sa.Column('avg_buy_price', sa.Float(), nullable=False),
        sa.Column('sector', sa.String(100), nullable=True),
        sa.Column('added_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['portfolio_id'], ['portfolios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('portfolio_holdings')
    op.drop_table('portfolios')
    op.drop_table('alerts')
    op.drop_table('analysis_results')
    op.drop_table('watchlist')
