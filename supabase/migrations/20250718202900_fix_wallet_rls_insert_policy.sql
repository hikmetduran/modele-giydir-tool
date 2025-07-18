-- Fix wallet RLS policy for INSERT operations
-- This migration ensures authenticated users can create their own wallets

-- Ensure RLS is enabled on wallets table
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can create their own wallet" ON public.wallets;

-- Create proper INSERT policy for authenticated users
CREATE POLICY "Users can create their own wallet" ON public.wallets
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Update ensure_user_wallet function to use SECURITY DEFINER
-- This allows the function to bypass RLS when called from triggers
CREATE OR REPLACE FUNCTION public.ensure_user_wallet(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_wallet_id UUID;
BEGIN
    -- Try to get existing wallet
    SELECT id INTO v_wallet_id
    FROM wallets
    WHERE user_id = p_user_id;
    
    -- If no wallet exists, create one
    IF v_wallet_id IS NULL THEN
        INSERT INTO wallets (user_id, credits)
        VALUES (p_user_id, 100)
        RETURNING id INTO v_wallet_id;
    END IF;
    
    RETURN v_wallet_id;
END;
$$;

-- Ensure handle_new_user function is properly configured
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_wallet_id UUID;
BEGIN
    -- Insert profile with conflict handling
    INSERT INTO profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW();
    
    -- Ensure wallet exists using the updated function
    SELECT ensure_user_wallet(NEW.id) INTO v_wallet_id;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Grant necessary permissions
GRANT INSERT ON public.wallets TO authenticated;
GRANT SELECT, UPDATE ON public.wallets TO authenticated;
GRANT SELECT ON public.wallets TO anon;
