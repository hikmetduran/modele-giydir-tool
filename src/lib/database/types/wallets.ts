import { TimestampFields, UserOwned } from './common';

/**
 * Wallets table - User credit balance system
 * Note: Using user_id as both primary key and foreign key to auth.users
 */
export interface Wallet {
  user_id: string; // Primary key and foreign key to auth.users
  credits: number;
  total_earned: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

/**
 * Wallet creation input
 */
export interface WalletInput {
  user_id: string;
  credits?: number;
  total_earned?: number;
  total_spent?: number;
}

/**
 * Wallet update input
 */
export interface WalletUpdate {
  credits?: number;
  total_earned?: number;
  total_spent?: number;
  updated_at?: string;
}

// SQL Schema for wallets table
export const walletsSchema = `
CREATE TABLE IF NOT EXISTS public.wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
  total_earned INTEGER NOT NULL DEFAULT 0 CHECK (total_earned >= 0),
  total_spent INTEGER NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wallets_credits ON public.wallets(credits);
CREATE INDEX IF NOT EXISTS idx_wallets_updated_at ON public.wallets(updated_at DESC);

-- Trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_wallets_updated_at 
    BEFORE UPDATE ON public.wallets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
`;
