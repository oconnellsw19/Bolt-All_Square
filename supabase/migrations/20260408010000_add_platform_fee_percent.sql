-- Add per-course platform fee percentage (default 30%)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS platform_fee_percent numeric NOT NULL DEFAULT 30;

-- Ensure fee is between 0 and 100
ALTER TABLE courses ADD CONSTRAINT platform_fee_percent_range CHECK (platform_fee_percent >= 0 AND platform_fee_percent <= 100);
