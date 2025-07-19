-- Add missing AI provider and model columns to try_on_results table
ALTER TABLE public.try_on_results 
ADD COLUMN IF NOT EXISTS ai_provider TEXT;

ALTER TABLE public.try_on_results 
ADD COLUMN IF NOT EXISTS ai_model TEXT;

ALTER TABLE public.try_on_results 
ADD COLUMN IF NOT EXISTS processing_time_seconds INTEGER DEFAULT 0;

-- Update existing rows with default values
UPDATE public.try_on_results 
SET 
    ai_provider = 'mock',
    ai_model = 'simulation-v1',
    processing_time_seconds = 0
WHERE ai_provider IS NULL;
