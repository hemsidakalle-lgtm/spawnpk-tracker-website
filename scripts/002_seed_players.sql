-- Seed initial players for SpawnPK Clan Tracker
-- These are sample players to get started

INSERT INTO players (username, display_name)
VALUES 
  ('hellspawn', 'Hellspawn'),
  ('ebrahkdabri', 'EbrahKdabri')
ON CONFLICT (username) DO NOTHING;
