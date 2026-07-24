-- Migration: Add featured (sponsored) race columns to races table
-- Date: 2026-07-24

ALTER TABLE races 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS featured_icon TEXT DEFAULT NULL;

-- Create an index to optimize sorting/filtering by featured status
CREATE INDEX IF NOT EXISTS idx_races_is_featured ON races (is_featured);

-- Add column descriptions
COMMENT ON COLUMN races.is_featured IS 'Flags whether a race is a featured/sponsored event pinned to top of the list and unclustered on the map.';
COMMENT ON COLUMN races.featured_icon IS 'Custom icon key for featured races (e.g. crown, star, trophy, sparkles).';
