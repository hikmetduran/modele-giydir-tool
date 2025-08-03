import { TransactionType, OperationType } from './common';

/**
 * Credit Transactions table - History of credit changes
 */
export interface CreditTransaction {
    id: string;
    user_id: string; // Using user_id as separate field for ownership
    type: TransactionType;
    transaction_type?: OperationType; // Specific operation type (try_on, regeneration, video_generation)
    amount: number;
    credits_before: number;
    credits_after: number;
    description?: string;
    metadata?: Record<string, unknown>;
    related_try_on_id?: string;
    created_at: string;
}

/**
 * Credit Transaction creation input
 */
export interface CreditTransactionInput {
    user_id: string;
    type: TransactionType;
    transaction_type?: OperationType;
    amount: number;
    credits_before: number;
    credits_after: number;
    description?: string;
    metadata?: Record<string, unknown>;
    related_try_on_id?: string;
}

/**
 * Credit Transaction update input (limited fields)
 */
export interface CreditTransactionUpdate {
    description?: string;
    metadata?: Record<string, unknown>;
}

// SQL Schema for credit_transactions table
export const creditTransactionsSchema = `
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('deduct', 'refund', 'purchase', 'bonus')) NOT NULL,
  amount INTEGER NOT NULL,
  credits_before INTEGER NOT NULL,
  credits_after INTEGER NOT NULL,
  description TEXT,
  metadata JSONB,
  related_try_on_id UUID REFERENCES public.try_on_results(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON public.credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_related_try_on ON public.credit_transactions(related_try_on_id);
`;
