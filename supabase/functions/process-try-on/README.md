# Process Try-On Edge Function

## Configuration Requirements

### JWT Verification Settings
**IMPORTANT**: This function handles JWT verification internally using multiple fallback mechanisms.

#### Dashboard Configuration
1. Go to Supabase Dashboard → Edge Functions → process-try-on
2. **DISABLE** "Verify JWT with legacy secret" (set to OFF)
3. Save the changes

#### Why This Matters
- The function implements robust authentication with 3 approaches:
  1. Standard user client authentication
  2. Admin client JWT verification  
  3. Manual JWT verification via profile lookup
- This ensures compatibility with both legacy and new JWT systems
- Legacy JWT verification in the dashboard can interfere with this logic

#### Troubleshooting Authentication Issues

##### 401 Unauthorized Error
If you encounter 401 errors:

1. **Check JWT Setting**: Ensure "Verify JWT with legacy secret" is OFF in dashboard
2. **Redeploy if needed**: The CLI may reset this setting, so check after each deployment
3. **Check function logs**: Look for detailed authentication flow logs
4. **Verify user session**: Ensure the user is properly authenticated in the frontend

##### Expected Log Flow
```
🔍 Debug: Request headers: { authorization: "Bearer eyJ...", ... }
🔍 Authorization header found: Bearer eyJ...
✅ Bearer token format is valid
🔍 Approach 1: Attempting to verify JWT with user client...
✅ User client authentication successful
✅ User authenticated successfully: { id: "...", email: "..." }
```

##### Authentication Fallbacks
If the first approach fails, the function will try:
1. **User client** (standard authentication)
2. **Admin client** (service role verification)
3. **Manual verification** (profile lookup)

## Environment Variables Required
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SERVICE_ROLE_KEY`: Your Supabase service role key (for admin operations)
- `FAL_KEY`: Your Fal.ai API key

## Function Features
- AI-powered try-on processing using Fal.ai
- Automatic credit deduction and refund system
- Real-time status updates
- Supabase Storage integration
- Robust error handling with automatic refunds 