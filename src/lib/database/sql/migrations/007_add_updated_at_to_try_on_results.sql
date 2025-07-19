-- Add updated_at column to try_on_results table
ALTER TABLE public.try_on_results 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create trigger to automatically update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if it already exists
DROP TRIGGER IF EXISTS update_try_on_results_updated_at ON public.try_on_results;

-- Create trigger
CREATE TRIGGER update_try_on_results_updated_at 
    BEFORE UPDATE ON public.try_on_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update existing rows to set updated_at to created_at
UPDATE public.try_on_results 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Create index on updated_at for better query performance
CREATE INDEX IF NOT EXISTS idx_try_on_results_updated_at ON public.try_on_results(updated_at DESC);
