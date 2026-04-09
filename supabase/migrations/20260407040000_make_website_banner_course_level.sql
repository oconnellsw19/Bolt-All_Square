/*
  # Make Website Banner Ad a course-level advertisement

  - Adds `is_hole_specific` boolean to advertisement_types (default true)
  - Sets Website Banner Ad to is_hole_specific = false
  - Makes hole_id nullable in pricing table (course-level ads have no hole)
  - Adds course_id to pricing table for course-level ad pricing
  - Makes hole_id nullable in sponsorships table
  - Adds course_id to sponsorships table
*/

-- Add is_hole_specific flag to advertisement_types
ALTER TABLE advertisement_types
  ADD COLUMN IF NOT EXISTS is_hole_specific boolean NOT NULL DEFAULT true;

-- Mark Website Banner Ad as course-level
UPDATE advertisement_types
  SET is_hole_specific = false
  WHERE name = 'Website Banner Ad';

-- Make hole_id nullable in pricing (course-level ads don't have a hole)
ALTER TABLE pricing
  ALTER COLUMN hole_id DROP NOT NULL;

-- Add course_id to pricing for course-level ad pricing
ALTER TABLE pricing
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES courses(id) ON DELETE CASCADE;

-- Make hole_id nullable in sponsorships
ALTER TABLE sponsorships
  ALTER COLUMN hole_id DROP NOT NULL;

-- Add course_id to sponsorships for course-level sponsorships
ALTER TABLE sponsorships
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES courses(id) ON DELETE CASCADE;

-- Unique constraint for course-level pricing (where hole_id is null)
CREATE UNIQUE INDEX IF NOT EXISTS pricing_course_ad_type_unique
  ON pricing (course_id, advertisement_type_id)
  WHERE hole_id IS NULL;

-- Update pricing RLS policy to support course-level pricing
DROP POLICY IF EXISTS "Course managers can manage pricing for their holes" ON pricing;
CREATE POLICY "Course managers can manage pricing"
  ON pricing FOR ALL
  TO authenticated
  USING (
    (hole_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM holes
      JOIN courses ON courses.id = holes.course_id
      WHERE holes.id = pricing.hole_id
      AND courses.manager_id = auth.uid()
    ))
    OR
    (hole_id IS NULL AND course_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = pricing.course_id
      AND courses.manager_id = auth.uid()
    ))
  );

-- Update sponsorship RLS policies to support course-level sponsorships
DROP POLICY IF EXISTS "Course managers can view sponsorships for their courses" ON sponsorships;
CREATE POLICY "Course managers can view sponsorships for their courses"
  ON sponsorships FOR SELECT
  TO authenticated
  USING (
    (hole_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM holes
      JOIN courses ON courses.id = holes.course_id
      WHERE holes.id = sponsorships.hole_id
      AND courses.manager_id = auth.uid()
    ))
    OR
    (hole_id IS NULL AND course_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = sponsorships.course_id
      AND courses.manager_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "Course managers can update sponsorships for their courses" ON sponsorships;
CREATE POLICY "Course managers can update sponsorships for their courses"
  ON sponsorships FOR UPDATE
  TO authenticated
  USING (
    (hole_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM holes
      JOIN courses ON courses.id = holes.course_id
      WHERE holes.id = sponsorships.hole_id
      AND courses.manager_id = auth.uid()
    ))
    OR
    (hole_id IS NULL AND course_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = sponsorships.course_id
      AND courses.manager_id = auth.uid()
    ))
  );
