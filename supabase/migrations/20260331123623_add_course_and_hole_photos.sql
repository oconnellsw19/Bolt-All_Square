/*
  # Add photo columns to courses and holes tables

  ## Summary
  Adds optional photo URL columns so course managers can upload a cover photo
  for their course and individual preview photos for each hole.

  ## Changes

  ### Modified Tables
  - `courses`: new column `cover_photo_url` (text, nullable) - URL of the course cover photo
  - `holes`: new column `photo_url` (text, nullable) - URL of the hole preview photo

  ## Notes
  - Both columns are optional and default to NULL
  - Photo files are stored in Supabase Storage; only the public URL is persisted here
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'cover_photo_url'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN cover_photo_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'holes' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE public.holes ADD COLUMN photo_url text;
  END IF;
END $$;
