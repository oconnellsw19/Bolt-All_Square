/*
  # Add Cart Screen Ad advertisement type

  Adds a new digital advertisement type for golf cart screens.
  When a cart pulls up to a hole, the sponsor's ad is displayed
  on the cart's built-in touchscreen — similar to a Tee Box Sign
  but digital and high-visibility.
*/

INSERT INTO advertisement_types (name, description, dimensions, production_lead_time_days)
VALUES (
  'Cart Screen Ad',
  'Digital advertisement displayed on the golf cart screen when arriving at the hole. High-visibility, full-color ad with logo and messaging.',
  '10.1" touchscreen (1280x800)',
  3
)
ON CONFLICT DO NOTHING;
