-- Migration: Add video support to try_on_results table
-- This migration adds video generation and storage capabilities

ALTER TABLE public.try_on_results 
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS video_path TEXT,
ADD COLUMN IF NOT EXISTS video_status TEXT CHECK (video_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS video_credits_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_error_message TEXT,
ADD COLUMN IF NOT EXISTS video_processing_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS video_processing_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS video_processing_time_seconds INTEGER DEFAULT 0;

-- Add indexes for video-related queries
CREATE INDEX IF NOT EXISTS idx_try_on_results_video_status ON public.try_on_results(video_status);
CREATE INDEX IF NOT EXISTS idx_try_on_results_video_url ON public.try_on_results(video_url) WHERE video_url IS NOT NULL;

-- Update credit_transactions to support video generation transactions
ALTER TABLE public.credit_transactions 
ADD COLUMN IF NOT EXISTS transaction_type TEXT CHECK (transaction_type IN ('try_on', 'regeneration', 'video_generation'));

-- Add index for transaction_type
CREATE INDEX IF NOT EXISTS idx_credit_transactions_transaction_type ON public.credit_transactions(transaction_type);