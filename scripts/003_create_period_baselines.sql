-- Create a table to store period baselines for accurate period kill tracking
-- This stores the kills count at the START of each period (daily, weekly, monthly)

CREATE TABLE IF NOT EXISTS period_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  period_start TIMESTAMPTZ NOT NULL,
  baseline_kills INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, period_type, period_start)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_period_baselines_lookup 
ON period_baselines(player_id, period_type, period_start DESC);

-- Disable RLS for server-side access
ALTER TABLE period_baselines DISABLE ROW LEVEL SECURITY;
