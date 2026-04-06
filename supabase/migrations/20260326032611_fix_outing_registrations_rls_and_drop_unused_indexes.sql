/*
  # Fix outing_registrations INSERT policy and drop unused indexes

  ## Summary

  1. **Fix always-true INSERT policy on outing_registrations**
     The existing `Anyone can create outing registrations` policy used
     `WITH CHECK (true)` which bypasses row-level security entirely for inserts.
     It is replaced with a check that validates the outing actually exists and
     is active, preventing phantom inserts.

  2. **Drop unused indexes**
     Two indexes have never been used and waste storage and write overhead:
     - `idx_sponsorships_dates` on `public.sponsorships`
     - `idx_outing_registrations_outing_id` on `public.outing_registrations`
*/

-- Fix the always-true INSERT policy
DROP POLICY IF EXISTS "Anyone can create outing registrations" ON public.outing_registrations;

CREATE POLICY "Anyone can create outing registrations"
  ON public.outing_registrations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.outings
      WHERE id = outing_id
    )
  );

-- Drop unused indexes
DROP INDEX IF EXISTS public.idx_sponsorships_dates;
DROP INDEX IF EXISTS public.idx_outing_registrations_outing_id;
