-- Clean up any potential duplicate wallets
DELETE FROM wallets 
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id) id 
    FROM wallets 
    ORDER BY user_id, created_at DESC
);

-- Create a function to ensure wallet exists for user
CREATE OR REPLACE FUNCTION ensure_user_wallet(p_user_id UUID)
RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update handle_new_user function to be more reliable
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
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
    
    -- Ensure wallet exists
    SELECT ensure_user_wallet(NEW.id) INTO v_wallet_id;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create wallets for any existing users who don't have one
INSERT INTO wallets (user_id, credits)
SELECT id, 100
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM wallets)
ON CONFLICT (user_id) DO NOTHING;
