/*
  # All Square Golf Course Sponsorship Platform Schema

  ## Overview
  Complete database schema for a three-sided marketplace connecting golf courses, 
  sponsors, and All Square administrators for hole sponsorship opportunities.

  ## New Tables

  ### 1. profiles
  Extended user information with role-based access
  - `id` (uuid, FK to auth.users)
  - `role` (text) - course_manager, sponsor, or admin
  - `full_name` (text)
  - `company_name` (text) - for sponsors
  - `phone` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. courses
  Golf course profiles managed by course managers
  - `id` (uuid, PK)
  - `manager_id` (uuid, FK to profiles)
  - `name` (text)
  - `description` (text)
  - `photo_urls` (text[]) - array of photo URLs
  - `contact_email` (text)
  - `contact_phone` (text)
  - `address_line1` (text)
  - `address_line2` (text)
  - `city` (text)
  - `state` (text)
  - `zip_code` (text)
  - `latitude` (numeric) - for map display
  - `longitude` (numeric)
  - `total_holes` (integer) - 9 or 18
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. holes
  Individual holes for each course
  - `id` (uuid, PK)
  - `course_id` (uuid, FK to courses)
  - `hole_number` (integer)
  - `hole_name` (text) - optional custom name
  - `created_at` (timestamptz)

  ### 4. advertisement_types
  Predefined advertisement options (managed by All Square admins)
  - `id` (uuid, PK)
  - `name` (text) - e.g., "Tee Box Sign"
  - `description` (text)
  - `dimensions` (text) - e.g., "24x18 inches"
  - `example_image_urls` (text[])
  - `production_lead_time_days` (integer)
  - `created_at` (timestamptz)

  ### 5. course_advertisement_types
  Junction table for courses to select which ad types they allow
  - `id` (uuid, PK)
  - `course_id` (uuid, FK to courses)
  - `advertisement_type_id` (uuid, FK to advertisement_types)
  - `created_at` (timestamptz)

  ### 6. pricing
  Pricing configuration per hole and duration
  - `id` (uuid, PK)
  - `hole_id` (uuid, FK to holes)
  - `advertisement_type_id` (uuid, FK to advertisement_types)
  - `daily_price` (numeric)
  - `weekly_price` (numeric)
  - `monthly_price` (numeric)
  - `annual_price` (numeric)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 7. sponsorships
  Sponsorship requests and active sponsorships
  - `id` (uuid, PK)
  - `sponsor_id` (uuid, FK to profiles)
  - `hole_id` (uuid, FK to holes)
  - `advertisement_type_id` (uuid, FK to advertisement_types)
  - `start_date` (date)
  - `end_date` (date)
  - `duration_type` (text) - daily, weekly, monthly, annual
  - `total_amount` (numeric)
  - `course_amount` (numeric) - 75%
  - `allsquare_amount` (numeric) - 25%
  - `status` (text) - pending, approved, denied, active, completed, cancelled
  - `payment_status` (text) - pending, held, captured, refunded
  - `payment_intent_id` (text) - Stripe payment intent ID
  - `artwork_status` (text) - pending, submitted, approved, in_production, shipped, delivered, installed
  - `terms_accepted` (boolean)
  - `terms_accepted_at` (timestamptz)
  - `approved_at` (timestamptz)
  - `denied_at` (timestamptz)
  - `denial_reason` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 8. outings
  Golf outing events created by course managers
  - `id` (uuid, PK)
  - `course_id` (uuid, FK to courses)
  - `name` (text)
  - `description` (text)
  - `event_date` (date)
  - `registration_fee` (numeric)
  - `registration_link` (text) - unique link
  - `max_participants` (integer)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 9. outing_registrations
  Player registrations for outing events
  - `id` (uuid, PK)
  - `outing_id` (uuid, FK to outings)
  - `player_name` (text)
  - `player_email` (text)
  - `player_phone` (text)
  - `payment_status` (text) - pending, paid, refunded
  - `payment_intent_id` (text)
  - `created_at` (timestamptz)

  ### 10. artwork
  Artwork files uploaded by sponsors
  - `id` (uuid, PK)
  - `sponsorship_id` (uuid, FK to sponsorships)
  - `file_url` (text)
  - `file_name` (text)
  - `approved` (boolean)
  - `approved_by` (uuid, FK to profiles)
  - `approved_at` (timestamptz)
  - `notes` (text)
  - `created_at` (timestamptz)

  ### 11. shipments
  Shipping and tracking information
  - `id` (uuid, PK)
  - `sponsorship_id` (uuid, FK to sponsorships)
  - `tracking_number` (text)
  - `carrier` (text)
  - `shipped_at` (timestamptz)
  - `delivered_at` (timestamptz)
  - `notes` (text)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Role-based access policies for course managers, sponsors, and admins
  - Users can only access their own data unless they're admins
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('course_manager', 'sponsor', 'admin')),
  full_name text NOT NULL,
  company_name text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  photo_urls text[] DEFAULT '{}',
  contact_email text,
  contact_phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip_code text,
  latitude numeric,
  longitude numeric,
  total_holes integer NOT NULL CHECK (total_holes IN (9, 18)),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view courses"
  ON courses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Course managers can create courses"
  ON courses FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = manager_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'course_manager')
  );

CREATE POLICY "Course managers can update own courses"
  ON courses FOR UPDATE
  TO authenticated
  USING (auth.uid() = manager_id)
  WITH CHECK (auth.uid() = manager_id);

CREATE POLICY "Course managers can delete own courses"
  ON courses FOR DELETE
  TO authenticated
  USING (auth.uid() = manager_id);

-- Create holes table
CREATE TABLE IF NOT EXISTS holes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  hole_number integer NOT NULL CHECK (hole_number > 0),
  hole_name text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(course_id, hole_number)
);

ALTER TABLE holes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view holes"
  ON holes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Course managers can manage holes for their courses"
  ON holes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = holes.course_id 
      AND courses.manager_id = auth.uid()
    )
  );

-- Create advertisement_types table
CREATE TABLE IF NOT EXISTS advertisement_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  dimensions text,
  example_image_urls text[] DEFAULT '{}',
  production_lead_time_days integer DEFAULT 14,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE advertisement_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view advertisement types"
  ON advertisement_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage advertisement types"
  ON advertisement_types FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Create course_advertisement_types table
CREATE TABLE IF NOT EXISTS course_advertisement_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  advertisement_type_id uuid NOT NULL REFERENCES advertisement_types(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(course_id, advertisement_type_id)
);

ALTER TABLE course_advertisement_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view course advertisement types"
  ON course_advertisement_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Course managers can manage their course advertisement types"
  ON course_advertisement_types FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_advertisement_types.course_id 
      AND courses.manager_id = auth.uid()
    )
  );

-- Create pricing table
CREATE TABLE IF NOT EXISTS pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hole_id uuid NOT NULL REFERENCES holes(id) ON DELETE CASCADE,
  advertisement_type_id uuid NOT NULL REFERENCES advertisement_types(id) ON DELETE CASCADE,
  daily_price numeric DEFAULT 0,
  weekly_price numeric DEFAULT 0,
  monthly_price numeric DEFAULT 0,
  annual_price numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(hole_id, advertisement_type_id)
);

ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pricing"
  ON pricing FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Course managers can manage pricing for their holes"
  ON pricing FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM holes
      JOIN courses ON courses.id = holes.course_id
      WHERE holes.id = pricing.hole_id
      AND courses.manager_id = auth.uid()
    )
  );

-- Create sponsorships table
CREATE TABLE IF NOT EXISTS sponsorships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hole_id uuid NOT NULL REFERENCES holes(id) ON DELETE CASCADE,
  advertisement_type_id uuid NOT NULL REFERENCES advertisement_types(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  duration_type text NOT NULL CHECK (duration_type IN ('daily', 'weekly', 'monthly', 'annual')),
  total_amount numeric NOT NULL,
  course_amount numeric NOT NULL,
  allsquare_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'active', 'completed', 'cancelled')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'held', 'captured', 'refunded')),
  payment_intent_id text,
  artwork_status text DEFAULT 'pending' CHECK (artwork_status IN ('pending', 'submitted', 'approved', 'in_production', 'shipped', 'delivered', 'installed')),
  terms_accepted boolean DEFAULT false,
  terms_accepted_at timestamptz,
  approved_at timestamptz,
  denied_at timestamptz,
  denial_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sponsorships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sponsors can view own sponsorships"
  ON sponsorships FOR SELECT
  TO authenticated
  USING (auth.uid() = sponsor_id);

CREATE POLICY "Course managers can view sponsorships for their courses"
  ON sponsorships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM holes
      JOIN courses ON courses.id = holes.course_id
      WHERE holes.id = sponsorships.hole_id
      AND courses.manager_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all sponsorships"
  ON sponsorships FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Sponsors can create sponsorships"
  ON sponsorships FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sponsor_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sponsor')
  );

CREATE POLICY "Sponsors can update own pending sponsorships"
  ON sponsorships FOR UPDATE
  TO authenticated
  USING (auth.uid() = sponsor_id AND status = 'pending')
  WITH CHECK (auth.uid() = sponsor_id);

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
  );

CREATE POLICY "Admins can update all sponsorships"
  ON sponsorships FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Create outings table
CREATE TABLE IF NOT EXISTS outings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  event_date date NOT NULL,
  registration_fee numeric DEFAULT 0,
  registration_link text UNIQUE,
  max_participants integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE outings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view outings"
  ON outings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Course managers can manage their outings"
  ON outings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = outings.course_id 
      AND courses.manager_id = auth.uid()
    )
  );

-- Create outing_registrations table
CREATE TABLE IF NOT EXISTS outing_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outing_id uuid NOT NULL REFERENCES outings(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  player_email text NOT NULL,
  player_phone text,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  payment_intent_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE outing_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Course managers can view registrations for their outings"
  ON outing_registrations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM outings
      JOIN courses ON courses.id = outings.course_id
      WHERE outings.id = outing_registrations.outing_id
      AND courses.manager_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can create outing registrations"
  ON outing_registrations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create artwork table
CREATE TABLE IF NOT EXISTS artwork (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsorship_id uuid NOT NULL REFERENCES sponsorships(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  approved boolean DEFAULT false,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE artwork ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sponsors can view artwork for their sponsorships"
  ON artwork FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sponsorships 
      WHERE sponsorships.id = artwork.sponsorship_id 
      AND sponsorships.sponsor_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all artwork"
  ON artwork FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Sponsors can upload artwork for their sponsorships"
  ON artwork FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sponsorships 
      WHERE sponsorships.id = artwork.sponsorship_id 
      AND sponsorships.sponsor_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update artwork"
  ON artwork FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Create shipments table
CREATE TABLE IF NOT EXISTS shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsorship_id uuid NOT NULL REFERENCES sponsorships(id) ON DELETE CASCADE,
  tracking_number text,
  carrier text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sponsors can view shipments for their sponsorships"
  ON shipments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sponsorships 
      WHERE sponsorships.id = shipments.sponsorship_id 
      AND sponsorships.sponsor_id = auth.uid()
    )
  );

CREATE POLICY "Course managers can view shipments for their courses"
  ON shipments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sponsorships
      JOIN holes ON holes.id = sponsorships.hole_id
      JOIN courses ON courses.id = holes.course_id
      WHERE sponsorships.id = shipments.sponsorship_id
      AND courses.manager_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all shipments"
  ON shipments FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Insert default advertisement types
INSERT INTO advertisement_types (name, description, dimensions, production_lead_time_days) VALUES
  ('Tee Box Sign', 'Weather-resistant sign mounted at the tee box', '24" x 18"', 10),
  ('Flag Sponsorship', 'Custom flag with your logo', '8" x 12"', 7),
  ('Cart Sign', 'Mounted sign on golf cart', '12" x 8"', 7),
  ('Yardage Marker', 'Ground marker with sponsor logo', '6" diameter', 14)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_manager_id ON courses(manager_id);
CREATE INDEX IF NOT EXISTS idx_holes_course_id ON holes(course_id);
CREATE INDEX IF NOT EXISTS idx_sponsorships_sponsor_id ON sponsorships(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsorships_hole_id ON sponsorships(hole_id);
CREATE INDEX IF NOT EXISTS idx_sponsorships_status ON sponsorships(status);
CREATE INDEX IF NOT EXISTS idx_sponsorships_dates ON sponsorships(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_outings_course_id ON outings(course_id);
CREATE INDEX IF NOT EXISTS idx_outing_registrations_outing_id ON outing_registrations(outing_id);/*
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
/*
  # Create Artwork Storage Bucket

  ## Changes Made
  
  1. Storage Bucket Creation
    - Create 'artwork' bucket for storing sponsor logos and PDF files
    - Set bucket to public for easy access to approved artwork
    - Set file size limit to 10MB
  
  2. Storage Policies
    - Allow authenticated sponsors to upload files to their own sponsorships
    - Allow public read access to all files (for approved artwork display)
    - Allow course managers to view files for their courses
  
  ## Security
  - Sponsors can only upload to folders matching their sponsorship IDs
  - File size limited to 10MB
  - Public read access for displaying approved artwork
*/

-- Create the artwork storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'artwork',
  'artwork',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Sponsors can upload artwork for their sponsorships" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to artwork" ON storage.objects;
DROP POLICY IF EXISTS "Sponsors can update their artwork" ON storage.objects;
DROP POLICY IF EXISTS "Sponsors can delete their artwork" ON storage.objects;

-- Policy: Allow authenticated users to upload files to their sponsorships
CREATE POLICY "Sponsors can upload artwork for their sponsorships"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'artwork' AND
  (storage.foldername(name))[1] = 'sponsorships' AND
  EXISTS (
    SELECT 1 FROM sponsorships
    WHERE sponsorships.id::text = (storage.foldername(name))[2]
    AND sponsorships.sponsor_id = auth.uid()
  )
);

-- Policy: Allow public read access to all artwork
CREATE POLICY "Public read access to artwork"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'artwork');

-- Policy: Allow sponsors to update their own files
CREATE POLICY "Sponsors can update their artwork"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'artwork' AND
  EXISTS (
    SELECT 1 FROM sponsorships
    WHERE sponsorships.id::text = (storage.foldername(name))[2]
    AND sponsorships.sponsor_id = auth.uid()
  )
);

-- Policy: Allow sponsors to delete their own files
CREATE POLICY "Sponsors can delete their artwork"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'artwork' AND
  EXISTS (
    SELECT 1 FROM sponsorships
    WHERE sponsorships.id::text = (storage.foldername(name))[2]
    AND sponsorships.sponsor_id = auth.uid()
  )
);
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
  );/*
  # Add indexes for unindexed foreign keys

  ## Summary
  Several foreign key columns were missing covering indexes, which causes
  full table scans when performing joins or lookups on these columns.

  ## New Indexes
  1. `artwork.approved_by` - covers artwork_approved_by_fkey
  2. `artwork.sponsorship_id` - covers artwork_sponsorship_id_fkey
  3. `course_advertisement_types.advertisement_type_id` - covers course_advertisement_types_advertisement_type_id_fkey
  4. `pricing.advertisement_type_id` - covers pricing_advertisement_type_id_fkey
  5. `shipments.sponsorship_id` - covers shipments_sponsorship_id_fkey
  6. `sponsorships.advertisement_type_id` - covers sponsorships_advertisement_type_id_fkey
*/

CREATE INDEX IF NOT EXISTS idx_artwork_approved_by
  ON public.artwork (approved_by);

CREATE INDEX IF NOT EXISTS idx_artwork_sponsorship_id
  ON public.artwork (sponsorship_id);

CREATE INDEX IF NOT EXISTS idx_course_advertisement_types_advertisement_type_id
  ON public.course_advertisement_types (advertisement_type_id);

CREATE INDEX IF NOT EXISTS idx_pricing_advertisement_type_id
  ON public.pricing (advertisement_type_id);

CREATE INDEX IF NOT EXISTS idx_shipments_sponsorship_id
  ON public.shipments (sponsorship_id);

CREATE INDEX IF NOT EXISTS idx_sponsorships_advertisement_type_id
  ON public.sponsorships (advertisement_type_id);
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
