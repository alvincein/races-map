-- Migration: Add featured (sponsored) race columns to races table
-- Date: 2026-07-24

ALTER TABLE races 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS featured_icon TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS featured_bg_color TEXT DEFAULT NULL;

-- Create an index to optimize sorting/filtering by featured status
CREATE INDEX IF NOT EXISTS idx_races_is_featured ON races (is_featured);

-- Add column descriptions
COMMENT ON COLUMN races.is_featured IS 'Flags whether a race is a featured/sponsored event pinned to top of the list and unclustered on the map.';
COMMENT ON COLUMN races.featured_icon IS 'Custom icon key or image URL for featured races (e.g. crown, star, trophy, sparkles, or https://... image URL).';
COMMENT ON COLUMN races.featured_bg_color IS 'Optional hex background color for featured race marker pin (e.g. #FFD700). Defaults to dark gray (#27272a) when NULL/empty.';
