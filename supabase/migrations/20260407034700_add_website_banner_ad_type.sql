/*
  # Add Website Banner Ad advertisement type

  Adds a new advertisement type for sponsor banners on the
  golf course's website. Includes clickable logo with link
  to the sponsor's site, visible to all website visitors.
*/

INSERT INTO advertisement_types (name, description, dimensions, production_lead_time_days)
VALUES (
  'Website Banner Ad',
  'Sponsor banner displayed on the golf course website. Includes clickable logo with link to sponsor site, visible to all website visitors browsing hole info and tee times.',
  '728x90 leaderboard / 300x250 sidebar',
  1
)
ON CONFLICT DO NOTHING;
