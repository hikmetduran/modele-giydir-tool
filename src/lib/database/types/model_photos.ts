import { Gender } from './common';

/**
 * Garment types that can be worn by models
 */
export type GarmentType = 'tops' | 'bottoms' | 'one-pieces';

/**
 * Model Photos table - AI-generated model images for try-on
 */
export interface ModelPhoto {
    id: string;
    name: string;
    description?: string;
    image_url: string;
    image_path: string;
    gender?: Gender;
    body_type?: string;
    garment_types: GarmentType[];
    is_active: boolean;
    sort_order: number;
    created_at: string;
}

/**
 * Model Photo creation input (without auto-generated fields)
 */
export interface ModelPhotoInput {
    name: string;
    description?: string;
    image_url: string;
    image_path: string;
    gender?: Gender;
    body_type?: string;
    garment_types: GarmentType[];
    is_active?: boolean;
    sort_order?: number;
}

/**
 * Model Photo update input (all fields optional)
 */
export interface ModelPhotoUpdate {
    name?: string;
    description?: string;
    image_url?: string;
    image_path?: string;
    gender?: Gender;
    body_type?: string;
    garment_types?: GarmentType[];
    is_active?: boolean;
    sort_order?: number;
}

// SQL Schema for model_photos table
export const modelPhotosSchema = `
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_model_photos_gender ON public.model_photos(gender);
CREATE INDEX IF NOT EXISTS idx_model_photos_active ON public.model_photos(is_active);
CREATE INDEX IF NOT EXISTS idx_model_photos_sort ON public.model_photos(sort_order);
CREATE INDEX IF NOT EXISTS idx_model_photos_garment_types ON public.model_photos USING GIN(garment_types);
`;
