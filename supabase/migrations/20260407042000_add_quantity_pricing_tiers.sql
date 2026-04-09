/*
  # Add quantity-based pricing tiers

  For ads like Physical Cart Sign where pricing depends on
  how many carts the sponsor wants. More carts = higher price.

  - Adds `has_quantity_pricing` flag to advertisement_types
  - Creates `quantity_pricing_tiers` table
  - Adds quantity fields to sponsorships
*/

ALTER TABLE advertisement_types
  ADD COLUMN IF NOT EXISTS has_quantity_pricing boolean NOT NULL DEFAULT false;

UPDATE advertisement_types
  SET has_quantity_pricing = true
  WHERE name = 'Physical Cart Sign';

CREATE TABLE IF NOT EXISTS quantity_pricing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  advertisement_type_id uuid NOT NULL REFERENCES advertisement_types(id) ON DELETE CASCADE,
  tier_name text NOT NULL,
  quantity integer NOT NULL,
  daily_price numeric DEFAULT 0,
  weekly_price numeric DEFAULT 0,
  monthly_price numeric DEFAULT 0,
  annual_price numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(course_id, advertisement_type_id, quantity)
);

ALTER TABLE quantity_pricing_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quantity pricing tiers"
  ON quantity_pricing_tiers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Course managers can manage quantity pricing tiers"
  ON quantity_pricing_tiers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = quantity_pricing_tiers.course_id
      AND courses.manager_id = auth.uid()
    )
  );

ALTER TABLE sponsorships
  ADD COLUMN IF NOT EXISTS quantity integer;

ALTER TABLE sponsorships
  ADD COLUMN IF NOT EXISTS quantity_pricing_tier_id uuid REFERENCES quantity_pricing_tiers(id);
