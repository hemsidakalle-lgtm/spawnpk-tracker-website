-- Create players table to store tracked players
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create player_stats table to store historical stats
CREATE TABLE IF NOT EXISTS player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  kills INTEGER NOT NULL DEFAULT 0,
  deaths INTEGER NOT NULL DEFAULT 0,
  kdr DECIMAL(10, 2) NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  elo INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_player_stats_player_id ON player_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_recorded_at ON player_stats(recorded_at);

-- Enable Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

-- Allow public read access to players and stats (no auth required to view leaderboard)
CREATE POLICY "Allow public read access to players" ON players FOR SELECT USING (true);
CREATE POLICY "Allow public read access to player_stats" ON player_stats FOR SELECT USING (true);

-- Allow service role full access for API sync
CREATE POLICY "Allow service role insert players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service role update players" ON players FOR UPDATE USING (true);
CREATE POLICY "Allow service role delete players" ON players FOR DELETE USING (true);
CREATE POLICY "Allow service role insert player_stats" ON player_stats FOR INSERT WITH CHECK (true);
