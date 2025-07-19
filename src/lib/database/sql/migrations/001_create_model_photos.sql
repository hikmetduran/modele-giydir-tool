-- Create model_photos table
CREATE TABLE IF NOT EXISTS public.model_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  image_path TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'unisex')),
  body_type TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_model_photos_gender ON public.model_photos(gender);
CREATE INDEX IF NOT EXISTS idx_model_photos_active ON public.model_photos(is_active);
CREATE INDEX IF NOT EXISTS idx_model_photos_sort ON public.model_photos(sort_order);
