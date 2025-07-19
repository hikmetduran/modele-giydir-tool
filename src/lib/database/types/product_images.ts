/**
 * Product Images table - User-uploaded clothing/product images
 */
export interface ProductImage {
    id: string;
    user_id: string; // Using user_id as separate field for ownership
    original_filename: string;
    image_url: string;
    image_path: string;
    file_size?: number;
    mime_type?: string;
    width?: number;
    height?: number;
    created_at: string;
}

/**
 * Product Image creation input
 */
export interface ProductImageInput {
    user_id: string;
    original_filename: string;
    image_url: string;
    image_path: string;
    file_size?: number;
    mime_type?: string;
    width?: number;
    height?: number;
}

/**
 * Product Image update input
 */
export interface ProductImageUpdate {
    original_filename?: string;
    image_url?: string;
    image_path?: string;
    file_size?: number;
    mime_type?: string;
    width?: number;
    height?: number;
}

// SQL Schema for product_images table
export const productImagesSchema = `
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_images_user_id ON public.product_images(user_id);
CREATE INDEX IF NOT EXISTS idx_product_images_created_at ON public.product_images(created_at DESC);
`;
