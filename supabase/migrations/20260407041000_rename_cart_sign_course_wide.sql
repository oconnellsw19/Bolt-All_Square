/*
  # Rename Cart Sign to Physical Cart Sign and make course-wide

  Cart signs are mounted on carts, not specific to a hole.
  Renamed for clarity and moved to course-level advertisements.
*/

UPDATE advertisement_types
  SET name = 'Physical Cart Sign', is_hole_specific = false
  WHERE name = 'Cart Sign';
