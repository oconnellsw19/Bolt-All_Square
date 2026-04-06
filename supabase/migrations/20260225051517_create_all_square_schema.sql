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
CREATE INDEX IF NOT EXISTS idx_outing_registrations_outing_id ON outing_registrations(outing_id);