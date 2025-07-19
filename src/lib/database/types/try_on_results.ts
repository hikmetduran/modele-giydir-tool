import { ProcessingStatus } from './common';

/**
 * Try On Results table - Results from AI clothing try-on processing
 */
export interface TryOnResult {
    id: string;
    user_id: string; // Using user_id as separate field for ownership
    product_image_id: string;
    model_photo_id: string;
    result_image_url?: string;
    result_image_path?: string;
    status: ProcessingStatus;
    metadata?: Record<string, unknown>;
    credits_used: number;
    error_message?: string;
    processing_started_at?: string;
    processing_completed_at?: string;
    ai_provider?: string;
    ai_model?: string;
    processing_time_seconds?: number;
    created_at: string;
    updated_at: string;
}

/**
 * Try On Result creation input
 */
export interface TryOnResultInput {
    user_id: string;
    product_image_id: string;
    model_photo_id: string;
    credits_used: number;
    metadata?: Record<string, unknown>;
}

/**
 * Try On Result update input
 */
export interface TryOnResultUpdate {
    result_image_url?: string;
    result_image_path?: string;
    status?: ProcessingStatus;
    metadata?: Record<string, unknown>;
    error_message?: string;
    processing_started_at?: string;
    processing_completed_at?: string;
}

// SQL Schema for try_on_results table
export const tryOnResultsSchema = `
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_try_on_results_user_id ON public.try_on_results(user_id);
CREATE INDEX IF NOT EXISTS idx_try_on_results_product_image_id ON public.try_on_results(product_image_id);
CREATE INDEX IF NOT EXISTS idx_try_on_results_model_photo_id ON public.try_on_results(model_photo_id);
CREATE INDEX IF NOT EXISTS idx_try_on_results_status ON public.try_on_results(status);
CREATE INDEX IF NOT EXISTS idx_try_on_results_created_at ON public.try_on_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_try_on_results_updated_at ON public.try_on_results(updated_at DESC);
`;
