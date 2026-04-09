-- Add upcoming_dismissed flag to sponsorships
-- Allows course managers to dismiss upcoming sponsorships from their checklist
-- without changing the sponsorship status
ALTER TABLE public.sponsorships
  ADD COLUMN IF NOT EXISTS upcoming_dismissed boolean DEFAULT false;
