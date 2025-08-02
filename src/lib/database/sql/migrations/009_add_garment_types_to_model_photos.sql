-- Migration: Add garment_types column to model_photos table
-- This allows models to be associated with multiple garment types (tops, bottoms, one-pieces)

-- Add the garment_types column as an array of text
ALTER TABLE public.model_photos 
ADD COLUMN IF NOT EXISTS garment_types TEXT[] NOT NULL DEFAULT '{}';

-- Add a check constraint to ensure only valid garment types are stored
ALTER TABLE public.model_photos 
ADD CONSTRAINT check_garment_types 
CHECK (
  garment_types <@ ARRAY['tops', 'bottoms', 'one-pieces']::TEXT[]
);

-- Create a GIN index for efficient querying of garment types
CREATE INDEX IF NOT EXISTS idx_model_photos_garment_types 
ON public.model_photos USING GIN(garment_types);

-- Update existing records to have at least one garment type (defaulting to 'tops')
-- This is a safe default since most model photos would likely work for tops
UPDATE public.model_photos 
SET garment_types = ARRAY['tops'] 
WHERE garment_types = '{}' OR garment_types IS NULL;