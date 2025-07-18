-- Fix wallet RLS policies for new Supabase API key system
-- This migration adds the missing INSERT policy for wallets table

-- Add INSERT policy for wallets table to allow authenticated users to create their own wallet
CREATE POLICY "Users can create their own wallet" ON public.wallets
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Ensure the ensure_user_wallet function works correctly with new auth system
-- Update the function to use the new auth context properly
CREATE OR REPLACE FUNCTION public.ensure_user_wallet()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_uuid uuid;
BEGIN
    -- Get the current authenticated user ID
    user_uuid := auth.uid();
    
    -- Check if wallet already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM wallets 
        WHERE user_id = user_uuid
    ) THEN
        -- Create new wallet with default credits
        INSERT INTO wallets (user_id, credits)
        VALUES (user_uuid, 100);
    END IF;
END;
$$;

-- Update the handle_new_user function to work with new auth system
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create profile for new user
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', new.email)
    );
    
    -- Create wallet for new user
    INSERT INTO public.wallets (user_id, credits)
    VALUES (new.id, 100);
    
    RETURN new;
END;
$$;

-- Ensure all existing functions have proper search_path
CREATE OR REPLACE FUNCTION public.deduct_credits(
    p_user_id uuid,
    p_amount integer,
    p_description text,
    p_try_on_result_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_credits integer;
    new_balance integer;
BEGIN
    -- Get current credits
    SELECT credits INTO current_credits
    FROM wallets
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- Check if user has enough credits
    IF current_credits < p_amount THEN
        RETURN false;
    END IF;
    
    -- Calculate new balance
    new_balance := current_credits - p_amount;
    
    -- Update wallet
    UPDATE wallets
    SET credits = new_balance,
        updated_at = now()
    WHERE user_id = p_user_id;
    
    -- Record transaction
    INSERT INTO credit_transactions (
        user_id,
        wallet_id,
        amount,
        transaction_type,
        description,
        try_on_result_id
    ) VALUES (
        p_user_id,
        (SELECT id FROM wallets WHERE user_id = p_user_id),
        -p_amount,
        'debit',
        p_description,
        p_try_on_result_id
    );
    
    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_credits(
    p_user_id uuid,
    p_amount integer,
    p_description text,
    p_try_on_result_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_credits integer;
    new_balance integer;
BEGIN
    -- Get current credits
    SELECT credits INTO current_credits
    FROM wallets
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- Calculate new balance
    new_balance := current_credits + p_amount;
    
    -- Update wallet
    UPDATE wallets
    SET credits = new_balance,
        updated_at = now()
    WHERE user_id = p_user_id;
    
    -- Record transaction
    INSERT INTO credit_transactions (
        user_id,
        wallet_id,
        amount,
        transaction_type,
        description,
        try_on_result_id
    ) VALUES (
        p_user_id,
        (SELECT id FROM wallets WHERE user_id = p_user_id),
        p_amount,
        'refund',
        p_description,
        p_try_on_result_id
    );
END;
$$;
