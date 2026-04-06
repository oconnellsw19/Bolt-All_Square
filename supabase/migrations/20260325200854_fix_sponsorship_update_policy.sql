/*
  # Fix Sponsorship Update Policy for Course Managers

  1. Changes
    - Drop and recreate the "Course managers can update sponsorships for their courses" policy
    - Add WITH CHECK clause to allow course managers to update sponsorships to any status
    
  2. Security
    - Course managers can only update sponsorships for holes in their courses
    - They can change status to approved/denied and add approval/denial messages
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Course managers can update sponsorships for their courses" ON sponsorships;

-- Recreate with WITH CHECK clause
CREATE POLICY "Course managers can update sponsorships for their courses"
  ON sponsorships FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM holes
      JOIN courses ON courses.id = holes.course_id
      WHERE holes.id = sponsorships.hole_id
      AND courses.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM holes
      JOIN courses ON courses.id = holes.course_id
      WHERE holes.id = sponsorships.hole_id
      AND courses.manager_id = auth.uid()
    )
  );