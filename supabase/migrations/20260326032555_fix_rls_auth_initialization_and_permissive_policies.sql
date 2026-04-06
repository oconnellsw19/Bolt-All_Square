/*
  # Fix RLS Auth Initialization Plan and Multiple Permissive Policies

  ## Summary
  This migration addresses two categories of issues:

  1. **Auth RLS Initialization Plan**: All policies using `auth.uid()` directly
     are updated to use `(select auth.uid())` instead. This ensures the auth
     function is evaluated once per query rather than once per row, significantly
     improving performance at scale.

  2. **Multiple Permissive Policies**: Tables with multiple SELECT or UPDATE
     permissive policies for the same role are consolidated into single policies
     using OR conditions. PostgreSQL evaluates all permissive policies and grants
     access if any passes, so multiple policies cause redundant evaluations.

  ## Tables Modified
  - `public.profiles` - 3 policies fixed
  - `public.courses` - 3 policies fixed
  - `public.holes` - consolidated 2 SELECT into 1, fixed management policy
  - `public.advertisement_types` - consolidated 2 SELECT into 1
  - `public.course_advertisement_types` - consolidated 2 SELECT into 1, fixed management
  - `public.pricing` - consolidated 2 SELECT into 1, fixed management
  - `public.sponsorships` - consolidated SELECT (3->1), UPDATE (3->1), fixed all
  - `public.outings` - consolidated 2 SELECT into 1, fixed management
  - `public.outing_registrations` - fixed management policy
  - `public.shipments` - consolidated 3 SELECT into 1, fixed all
  - `public.artwork` - consolidated SELECT (3->1), UPDATE (2->1), fixed all
*/

-- ============================================================
-- profiles
-- ============================================================
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- ============================================================
-- courses
-- ============================================================
DROP POLICY IF EXISTS "Course managers can create courses" ON public.courses;
DROP POLICY IF EXISTS "Course managers can delete own courses" ON public.courses;
DROP POLICY IF EXISTS "Course managers can update own courses" ON public.courses;

CREATE POLICY "Course managers can create courses"
  ON public.courses FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = manager_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'course_manager'
    )
  );

CREATE POLICY "Course managers can delete own courses"
  ON public.courses FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = manager_id);

CREATE POLICY "Course managers can update own courses"
  ON public.courses FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = manager_id)
  WITH CHECK ((select auth.uid()) = manager_id);

-- ============================================================
-- holes
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view holes" ON public.holes;
DROP POLICY IF EXISTS "Course managers can manage holes for their courses" ON public.holes;

CREATE POLICY "Anyone can view holes"
  ON public.holes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Course managers can insert holes for their courses"
  ON public.holes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = course_id AND manager_id = (select auth.uid())
    )
  );

CREATE POLICY "Course managers can update holes for their courses"
  ON public.holes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = course_id AND manager_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = course_id AND manager_id = (select auth.uid())
    )
  );

CREATE POLICY "Course managers can delete holes for their courses"
  ON public.holes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = course_id AND manager_id = (select auth.uid())
    )
  );

-- ============================================================
-- advertisement_types
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view advertisement types" ON public.advertisement_types;
DROP POLICY IF EXISTS "Only admins can manage advertisement types" ON public.advertisement_types;

CREATE POLICY "Anyone can view advertisement types"
  ON public.advertisement_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert advertisement types"
  ON public.advertisement_types FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update advertisement types"
  ON public.advertisement_types FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete advertisement types"
  ON public.advertisement_types FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ============================================================
-- course_advertisement_types
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view course advertisement types" ON public.course_advertisement_types;
DROP POLICY IF EXISTS "Course managers can manage their course advertisement types" ON public.course_advertisement_types;

CREATE POLICY "Anyone can view course advertisement types"
  ON public.course_advertisement_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Course managers can insert their course advertisement types"
  ON public.course_advertisement_types FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = course_id AND manager_id = (select auth.uid())
    )
  );

CREATE POLICY "Course managers can update their course advertisement types"
  ON public.course_advertisement_types FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = course_id AND manager_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = course_id AND manager_id = (select auth.uid())
    )
  );

CREATE POLICY "Course managers can delete their course advertisement types"
  ON public.course_advertisement_types FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = course_id AND manager_id = (select auth.uid())
    )
  );

-- ============================================================
-- pricing
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view pricing" ON public.pricing;
DROP POLICY IF EXISTS "Course managers can manage pricing for their holes" ON public.pricing;

CREATE POLICY "Anyone can view pricing"
  ON public.pricing FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Course managers can insert pricing for their holes"
  ON public.pricing FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.holes h
      JOIN public.courses c ON c.id = h.course_id
      WHERE h.id = hole_id AND c.manager_id = (select auth.uid())
    )
  );

CREATE POLICY "Course managers can update pricing for their holes"
  ON public.pricing FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.holes h
      JOIN public.courses c ON c.id = h.course_id
      WHERE h.id = hole_id AND c.manager_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.holes h
      JOIN public.courses c ON c.id = h.course_id
      WHERE h.id = hole_id AND c.manager_id = (select auth.uid())
    )
  );

CREATE POLICY "Course managers can delete pricing for their holes"
  ON public.pricing FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.holes h
      JOIN public.courses c ON c.id = h.course_id
      WHERE h.id = hole_id AND c.manager_id = (select auth.uid())
    )
  );

-- ============================================================
-- sponsorships
-- ============================================================
DROP POLICY IF EXISTS "Admins can update all sponsorships" ON public.sponsorships;
DROP POLICY IF EXISTS "Admins can view all sponsorships" ON public.sponsorships;
DROP POLICY IF EXISTS "Course managers can update sponsorships for their courses" ON public.sponsorships;
DROP POLICY IF EXISTS "Course managers can view sponsorships for their courses" ON public.sponsorships;
DROP POLICY IF EXISTS "Sponsors can create sponsorships" ON public.sponsorships;
DROP POLICY IF EXISTS "Sponsors can update own pending sponsorships" ON public.sponsorships;
DROP POLICY IF EXISTS "Sponsors can view own sponsorships" ON public.sponsorships;

CREATE POLICY "Users can view relevant sponsorships"
  ON public.sponsorships FOR SELECT
  TO authenticated
  USING (
    sponsor_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.holes h
      JOIN public.courses c ON c.id = h.course_id
      WHERE h.id = hole_id AND c.manager_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Sponsors can create sponsorships"
  ON public.sponsorships FOR INSERT
  TO authenticated
  WITH CHECK (
    sponsor_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'sponsor'
    )
  );

CREATE POLICY "Authorized users can update sponsorships"
  ON public.sponsorships FOR UPDATE
  TO authenticated
  USING (
    (sponsor_id = (select auth.uid()) AND status = 'pending')
    OR EXISTS (
      SELECT 1 FROM public.holes h
      JOIN public.courses c ON c.id = h.course_id
      WHERE h.id = hole_id AND c.manager_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    (sponsor_id = (select auth.uid()) AND status = 'pending')
    OR EXISTS (
      SELECT 1 FROM public.holes h
      JOIN public.courses c ON c.id = h.course_id
      WHERE h.id = hole_id AND c.manager_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ============================================================
-- outings
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view outings" ON public.outings;
DROP POLICY IF EXISTS "Course managers can manage their outings" ON public.outings;

CREATE POLICY "Anyone can view outings"
  ON public.outings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Course managers can insert their outings"
  ON public.outings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = course_id AND manager_id = (select auth.uid())
    )
  );

CREATE POLICY "Course managers can update their outings"
  ON public.outings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = course_id AND manager_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = course_id AND manager_id = (select auth.uid())
    )
  );

CREATE POLICY "Course managers can delete their outings"
  ON public.outings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = course_id AND manager_id = (select auth.uid())
    )
  );

-- ============================================================
-- outing_registrations
-- ============================================================
DROP POLICY IF EXISTS "Course managers can view registrations for their outings" ON public.outing_registrations;

CREATE POLICY "Course managers can view registrations for their outings"
  ON public.outing_registrations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.outings o
      JOIN public.courses c ON c.id = o.course_id
      WHERE o.id = outing_id AND c.manager_id = (select auth.uid())
    )
  );

-- ============================================================
-- shipments
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage all shipments" ON public.shipments;
DROP POLICY IF EXISTS "Course managers can view shipments for their courses" ON public.shipments;
DROP POLICY IF EXISTS "Sponsors can view shipments for their sponsorships" ON public.shipments;

CREATE POLICY "Authorized users can view shipments"
  ON public.shipments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sponsorships s
      WHERE s.id = sponsorship_id AND s.sponsor_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.sponsorships s
      JOIN public.holes h ON h.id = s.hole_id
      JOIN public.courses c ON c.id = h.course_id
      WHERE s.id = sponsorship_id AND c.manager_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert shipments"
  ON public.shipments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update shipments"
  ON public.shipments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete shipments"
  ON public.shipments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ============================================================
-- artwork
-- ============================================================
DROP POLICY IF EXISTS "Admins can update artwork" ON public.artwork;
DROP POLICY IF EXISTS "Admins can view all artwork" ON public.artwork;
DROP POLICY IF EXISTS "Course managers can approve artwork for their courses" ON public.artwork;
DROP POLICY IF EXISTS "Course managers can view artwork for their courses" ON public.artwork;
DROP POLICY IF EXISTS "Sponsors can upload artwork for their sponsorships" ON public.artwork;
DROP POLICY IF EXISTS "Sponsors can view artwork for their sponsorships" ON public.artwork;

CREATE POLICY "Authorized users can view artwork"
  ON public.artwork FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sponsorships s
      WHERE s.id = sponsorship_id AND s.sponsor_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.sponsorships s
      JOIN public.holes h ON h.id = s.hole_id
      JOIN public.courses c ON c.id = h.course_id
      WHERE s.id = sponsorship_id AND c.manager_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Sponsors can upload artwork for their sponsorships"
  ON public.artwork FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sponsorships s
      WHERE s.id = sponsorship_id AND s.sponsor_id = (select auth.uid())
    )
  );

CREATE POLICY "Authorized users can update artwork"
  ON public.artwork FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sponsorships s
      JOIN public.holes h ON h.id = s.hole_id
      JOIN public.courses c ON c.id = h.course_id
      WHERE s.id = sponsorship_id AND c.manager_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sponsorships s
      JOIN public.holes h ON h.id = s.hole_id
      JOIN public.courses c ON c.id = h.course_id
      WHERE s.id = sponsorship_id AND c.manager_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );
