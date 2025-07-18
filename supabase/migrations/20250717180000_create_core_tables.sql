-- Create model_photos table
CREATE TABLE IF NOT EXISTS public.model_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    image_path TEXT NOT NULL,
    gender TEXT DEFAULT 'unisex' CHECK (gender IN ('male', 'female', 'unisex')),
    body_type TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create product_images table
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    original_filename TEXT NOT NULL,
    image_url TEXT NOT NULL,
    image_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create try_on_results table  
CREATE TABLE IF NOT EXISTS public.try_on_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_image_id UUID REFERENCES product_images(id) ON DELETE CASCADE NOT NULL,
    model_photo_id UUID REFERENCES model_photos(id) ON DELETE CASCADE NOT NULL,
    result_image_url TEXT,
    result_image_path TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    ai_provider TEXT,
    ai_model TEXT,
    processing_time_seconds INTEGER,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.model_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.try_on_results ENABLE ROW LEVEL SECURITY;

-- Create policies for model_photos (publicly readable)
CREATE POLICY "Anyone can view active model photos"
ON public.model_photos FOR SELECT
USING (is_active = true);

-- Create policies for product_images (user-specific)
CREATE POLICY "Users can view their own product images"
ON public.product_images FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own product images"
ON public.product_images FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own product images"
ON public.product_images FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own product images"
ON public.product_images FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create policies for try_on_results (user-specific)
CREATE POLICY "Users can view their own try-on results"
ON public.try_on_results FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own try-on results"
ON public.try_on_results FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own try-on results"
ON public.try_on_results FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Allow service role to manage all tables
CREATE POLICY "Service role can manage model photos"
ON public.model_photos FOR ALL
TO service_role
USING (true);

CREATE POLICY "Service role can manage product images"
ON public.product_images FOR ALL
TO service_role
USING (true);

CREATE POLICY "Service role can manage try-on results"
ON public.try_on_results FOR ALL
TO service_role
USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_images_user_id ON public.product_images(user_id);
CREATE INDEX IF NOT EXISTS idx_product_images_created_at ON public.product_images(created_at);
CREATE INDEX IF NOT EXISTS idx_model_photos_active ON public.model_photos(is_active);
CREATE INDEX IF NOT EXISTS idx_model_photos_sort_order ON public.model_photos(sort_order);
CREATE INDEX IF NOT EXISTS idx_try_on_results_user_id ON public.try_on_results(user_id);
CREATE INDEX IF NOT EXISTS idx_try_on_results_status ON public.try_on_results(status);
CREATE INDEX IF NOT EXISTS idx_try_on_results_created_at ON public.try_on_results(created_at);

-- Add triggers for updated_at timestamp on try_on_results
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_try_on_results_updated_at
    BEFORE UPDATE ON public.try_on_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 