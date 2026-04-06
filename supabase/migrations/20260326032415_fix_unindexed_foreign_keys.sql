/*
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
