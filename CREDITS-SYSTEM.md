# Credits System Implementation

## Overview

The credits system has been implemented to manage user access to the AI try-on generation feature. Each try-on generation costs 10 credits, and users start with 100 credits upon registration.

## Database Schema

### Wallets Table
- `id`: UUID primary key
- `user_id`: Foreign key to auth.users
- `credits`: Integer (default 100, cannot be negative)
- `created_at`, `updated_at`: Timestamps

### Credit Transactions Table
- `id`: UUID primary key
- `user_id`: Foreign key to auth.users
- `wallet_id`: Foreign key to wallets
- `amount`: Integer (negative for debits, positive for credits/refunds)
- `transaction_type`: 'debit', 'credit', or 'refund'
- `description`: Text description
- `try_on_result_id`: Optional foreign key to try_on_results
- `created_at`: Timestamp

## Database Functions

### `deduct_credits(user_id, amount, description, try_on_result_id)`
- Atomically checks balance and deducts credits
- Returns boolean indicating success
- Creates transaction record
- Uses row-level locking to prevent race conditions

### `refund_credits(user_id, amount, description, try_on_result_id)`
- Adds credits back to user's wallet
- Creates refund transaction record
- Used when try-on processing fails

## Frontend Implementation

### useWallet Hook
- Manages wallet state and real-time updates
- Subscribes to database changes via Supabase real-time
- Provides: `wallet`, `transactions`, `loading`, `error`, `refreshWallet`

### UI Components

#### Header
- Displays current credit balance with coin icon
- Real-time updates when credits change

#### Profile Page
- Shows credit balance in highlighted section
- Displays transaction history (last 20 transactions)
- Refresh button to manually update wallet

#### Processing Flow
- Validates sufficient credits before processing
- Shows cost calculation (images × 10 credits)
- Prevents processing if insufficient credits
- Visual indicators for credit status

## Edge Function Integration

### Credit Deduction Flow
1. User initiates try-on generation
2. Edge function deducts 10 credits before processing
3. If deduction fails (insufficient credits), returns error
4. If processing fails at any point, credits are refunded
5. Transaction records are created for audit trail

### Refund Scenarios
Credits are automatically refunded when:
- Product image not found
- Model photo not found
- AI processing fails
- Request times out
- No result image generated
- Any other processing exception

## Security

### Row Level Security (RLS)
- Users can only view/update their own wallets
- Users can only view their own transactions
- Service role can manage all wallets (for admin operations)

### Atomic Operations
- Credit deduction uses database functions with row locking
- Prevents race conditions and double-spending
- Ensures data consistency

## User Experience

### New User Flow
1. User registers → Database trigger creates wallet with 100 credits
2. User can immediately start using try-on feature
3. Credits are deducted only after successful processing initiation

### Insufficient Credits
- Clear error messages when credits are insufficient
- Cost calculation shown before processing
- Visual indicators (red text) for insufficient balance
- Suggestion to contact support for more credits

## Real-time Updates

The system uses Supabase real-time subscriptions to update:
- Wallet balance in header
- Transaction history in profile
- Credit status in processing flow

## Configuration

### Credit Costs
- Try-on generation: 10 credits per image
- Initial user credits: 100 credits
- Configurable via database functions

### Transaction Types
- `debit`: Credits removed (try-on generation)
- `credit`: Credits added (manual top-up)
- `refund`: Credits returned (failed processing)

## Monitoring

### Transaction Audit
- All credit operations are logged in `credit_transactions`
- Includes timestamps, amounts, and descriptions
- Linked to try-on results for traceability

### Error Handling
- Failed operations are logged with error messages
- Automatic refunds ensure users aren't charged for failed operations
- Real-time updates keep UI in sync with actual balance

## Future Enhancements

1. **Payment Integration**: Add ability to purchase credits
2. **Credit Packages**: Different credit amounts and pricing tiers
3. **Admin Panel**: Manage user credits and view system statistics
4. **Notifications**: Email/in-app notifications for low credits
5. **Analytics**: Track credit usage patterns and conversion rates 