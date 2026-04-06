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
