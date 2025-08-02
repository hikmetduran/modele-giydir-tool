-- Complete database schema for Modele Giydir
-- This file contains the complete schema for all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create update_updated_at_column function (shared across tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. Model Photos Table
CREATE TABLE IF NOT EXISTS public.model_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  image_path TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'unisex')),
  body_type TEXT,
  garment_types TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Product Images Table
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Try On Results Table
CREATE TABLE IF NOT EXISTS public.try_on_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_image_id UUID NOT NULL REFERENCES public.product_images(id) ON DELETE CASCADE,
  model_photo_id UUID NOT NULL REFERENCES public.model_photos(id) ON DELETE CASCADE,
  result_image_url TEXT,
  result_image_path TEXT,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  metadata JSONB,
  credits_used INTEGER NOT NULL DEFAULT 10,
  error_message TEXT,
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processing_completed_at TIMESTAMP WITH TIME ZONE,
  ai_provider TEXT,
  ai_model TEXT,
  processing_time_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Wallets Table
CREATE TABLE IF NOT EXISTS public.wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
  total_earned INTEGER NOT NULL DEFAULT 0 CHECK (total_earned >= 0),
  total_spent INTEGER NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Credit Transactions Table
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('deduct', 'refund', 'purchase', 'bonus')) NOT NULL,
  amount INTEGER NOT NULL,
  credits_before INTEGER NOT NULL,
  credits_after INTEGER NOT NULL,
  description TEXT,
  metadata JSONB,
  related_try_on_id UUID REFERENCES public.try_on_results(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create all indexes
CREATE INDEX IF NOT EXISTS idx_model_photos_gender ON public.model_photos(gender);
CREATE INDEX IF NOT EXISTS idx_model_photos_active ON public.model_photos(is_active);
CREATE INDEX IF NOT EXISTS idx_model_photos_sort ON public.model_photos(sort_order);
CREATE INDEX IF NOT EXISTS idx_model_photos_garment_types ON public.model_photos USING GIN(garment_types);

CREATE INDEX IF NOT EXISTS idx_product_images_user_id ON public.product_images(user_id);
CREATE INDEX IF NOT EXISTS idx_product_images_created_at ON public.product_images(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_try_on_results_user_id ON public.try_on_results(user_id);
CREATE INDEX IF NOT EXISTS idx_try_on_results_product_image_id ON public.try_on_results(product_image_id);
CREATE INDEX IF NOT EXISTS idx_try_on_results_model_photo_id ON public.try_on_results(model_photo_id);
CREATE INDEX IF NOT EXISTS idx_try_on_results_status ON public.try_on_results(status);
CREATE INDEX IF NOT EXISTS idx_try_on_results_created_at ON public.try_on_results(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallets_credits ON public.wallets(credits);
CREATE INDEX IF NOT EXISTS idx_wallets_updated_at ON public.wallets(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON public.credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_related_try_on ON public.credit_transactions(related_try_on_id);

-- Create triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_wallets_updated_at 
    BEFORE UPDATE ON public.wallets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_try_on_results_updated_at 
    BEFORE UPDATE ON public.try_on_results 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
