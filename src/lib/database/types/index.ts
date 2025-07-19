/**
 * Database Types - Central export file
 * This file exports all database types for easy importing
 */

// Common types and enums
export * from './common';

// Individual table types
export * from './model_photos';
export * from './product_images';
export * from './try_on_results';
export * from './wallets';
export * from './credit_transactions';

// Type aliases for convenience
export type DatabaseTable = 
  | 'model_photos'
  | 'product_images'
  | 'try_on_results'
  | 'wallets'
  | 'credit_transactions';

// Union type for all database records
export type DatabaseRecord = 
  | import('./model_photos').ModelPhoto
  | import('./product_images').ProductImage
  | import('./try_on_results').TryOnResult
  | import('./wallets').Wallet
  | import('./credit_transactions').CreditTransaction;
