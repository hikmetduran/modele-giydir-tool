/**
 * Common types and enums used across the database
 */

// Gender enum for model photos
export type Gender = 'male' | 'female' | 'unisex';

// Processing status for try-on results
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Transaction types for credit system
export type TransactionType = 'deduct' | 'refund' | 'purchase' | 'bonus';

// File storage types
export type StorageBucket = 'product-images' | 'model-photos' | 'try-on-results';

// Common timestamps
export interface TimestampFields {
  created_at: string;
  updated_at?: string;
}

// User ownership interface
export interface UserOwned {
  user_id: string;
}

// Soft delete interface
export interface SoftDeletable {
  deleted_at?: string;
  is_deleted?: boolean;
}
