/*
  # Add Approval Messages and Artwork File Type Support

  ## Changes Made
  
  1. Sponsorships Table Updates
    - Add `approval_message` column to store optional message from manager when approving
    - Add `manager_notes` column for course managers to add internal notes
  
  2. Artwork Table Updates
    - Add `file_type` column to distinguish between logos (images) and PDFs
    - Add `file_size` column to track file sizes
    - Add `mime_type` column for proper file handling
  
  3. RLS Policy Updates
    - Add policy for course managers to view artwork for their courses
    - Add policy for course managers to update artwork approval status
  
  ## Security
  - Maintains existing RLS policies
  - Course managers can only approve artwork for sponsorships on their courses
*/

-- Add approval message and notes to sponsorships
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sponsorships' AND column_name = 'approval_message'
  ) THEN
    ALTER TABLE sponsorships ADD COLUMN approval_message text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sponsorships' AND column_name = 'manager_notes'
  ) THEN
    ALTER TABLE sponsorships ADD COLUMN manager_notes text;
  END IF;
END $$;

-- Add file metadata to artwork table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artwork' AND column_name = 'file_type'
  ) THEN
    ALTER TABLE artwork ADD COLUMN file_type text CHECK (file_type IN ('logo', 'pdf', 'image'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artwork' AND column_name = 'file_size'
  ) THEN
    ALTER TABLE artwork ADD COLUMN file_size bigint;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artwork' AND column_name = 'mime_type'
  ) THEN
    ALTER TABLE artwork ADD COLUMN mime_type text;
  END IF;
END $$;

-- Add RLS policy for course managers to view artwork for their courses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'artwork' 
    AND policyname = 'Course managers can view artwork for their courses'
  ) THEN
    CREATE POLICY "Course managers can view artwork for their courses"
      ON artwork FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM sponsorships
          JOIN holes ON holes.id = sponsorships.hole_id
          JOIN courses ON courses.id = holes.course_id
          WHERE sponsorships.id = artwork.sponsorship_id
          AND courses.manager_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Add RLS policy for course managers to update artwork approval
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'artwork' 
    AND policyname = 'Course managers can approve artwork for their courses'
  ) THEN
    CREATE POLICY "Course managers can approve artwork for their courses"
      ON artwork FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM sponsorships
          JOIN holes ON holes.id = sponsorships.hole_id
          JOIN courses ON courses.id = holes.course_id
          WHERE sponsorships.id = artwork.sponsorship_id
          AND courses.manager_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM sponsorships
          JOIN holes ON holes.id = sponsorships.hole_id
          JOIN courses ON courses.id = holes.course_id
          WHERE sponsorships.id = artwork.sponsorship_id
          AND courses.manager_id = auth.uid()
        )
      );
  END IF;
END $$;
