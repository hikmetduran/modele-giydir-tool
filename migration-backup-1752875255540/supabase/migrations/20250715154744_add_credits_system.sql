-- Create wallets table for credit management
CREATE TABLE IF NOT EXISTS wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    credits INTEGER DEFAULT 100 NOT NULL CHECK (credits >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on wallets
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own wallet" ON wallets;
DROP POLICY IF EXISTS "Users can update their own wallet" ON wallets;
DROP POLICY IF EXISTS "Service role can manage wallets" ON wallets;

-- Create wallet policies
CREATE POLICY "Users can view their own wallet"
ON wallets FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet"
ON wallets FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage wallets"
ON wallets FOR ALL
TO service_role
USING (true);

-- Create credit_transactions table for audit trail
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE NOT NULL,
    amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('debit', 'credit', 'refund')),
    description TEXT,
    try_on_result_id UUID REFERENCES try_on_results(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on credit_transactions
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Service role can manage transactions" ON credit_transactions;

-- Create credit_transactions policies
CREATE POLICY "Users can view their own transactions"
ON credit_transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage transactions"
ON credit_transactions FOR ALL
TO service_role
USING (true);

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_wallets_updated_at ON wallets;

-- Create trigger for wallet updated_at
CREATE TRIGGER update_wallets_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update handle_new_user function to create wallet
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    
    -- Create wallet with initial credits
    INSERT INTO wallets (user_id, credits)
    VALUES (NEW.id, 100);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to deduct credits
CREATE OR REPLACE FUNCTION deduct_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT DEFAULT NULL,
    p_try_on_result_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_wallet_id UUID;
    v_current_credits INTEGER;
BEGIN
    -- Get wallet info
    SELECT id, credits INTO v_wallet_id, v_current_credits
    FROM wallets
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- Check if wallet exists
    IF v_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
    END IF;
    
    -- Check if sufficient credits
    IF v_current_credits < p_amount THEN
        RETURN FALSE;
    END IF;
    
    -- Deduct credits
    UPDATE wallets
    SET credits = credits - p_amount,
        updated_at = NOW()
    WHERE id = v_wallet_id;
    
    -- Record transaction
    INSERT INTO credit_transactions (user_id, wallet_id, amount, transaction_type, description, try_on_result_id)
    VALUES (p_user_id, v_wallet_id, -p_amount, 'debit', p_description, p_try_on_result_id);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to refund credits
CREATE OR REPLACE FUNCTION refund_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT DEFAULT NULL,
    p_try_on_result_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_wallet_id UUID;
BEGIN
    -- Get wallet info
    SELECT id INTO v_wallet_id
    FROM wallets
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- Check if wallet exists
    IF v_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
    END IF;
    
    -- Add credits back
    UPDATE wallets
    SET credits = credits + p_amount,
        updated_at = NOW()
    WHERE id = v_wallet_id;
    
    -- Record transaction
    INSERT INTO credit_transactions (user_id, wallet_id, amount, transaction_type, description, try_on_result_id)
    VALUES (p_user_id, v_wallet_id, p_amount, 'refund', p_description, p_try_on_result_id);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
