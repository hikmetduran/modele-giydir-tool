# Process Try-On Edge Function

## Configuration Requirements

### JWT Verification Settings
**IMPORTANT**: This function is configured for the new Supabase API key system (publishable/secret keys).

#### CLI Deployment
```bash
supabase functions deploy process-try-on --no-verify-jwt
```

#### Why This Matters
- `--no-verify-jwt` disables legacy JWT verification at the edge runtime level
- Uses service role key for robust JWT verification within the function
- Compatible with both ES256 and HS256 JWT tokens from the new API key system
- Handles authentication entirely within the function code

#### Troubleshooting Authentication Issues

##### 401 Unauthorized Error
If you encounter 401 errors:

1. **Check deployment**: Ensure deployed with `--no-verify-jwt` flag
2. **Check environment variables**: Verify all required keys are set correctly
3. **Check function logs**: Look for detailed authentication flow logs
4. **Verify user session**: Ensure the user is properly authenticated in the frontend

##### Expected Log Flow
```
🔍 Debug: Request headers: { authorization: "Bearer eyJ...", ... }
🔍 Authorization header found: Bearer eyJ...
✅ Bearer token format is valid
🔍 Attempting authentication with new API key system...
✅ Authentication successful with new API key system
✅ User authenticated successfully: { id: "...", email: "..." }
```

## Environment Variables Required
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key (publishable key)
- `SERVICE_ROLE_KEY`: Your Supabase service role key (secret key)
- `FAL_API_KEY`: Your Fal.ai API key

## Function Features
- AI-powered try-on processing using Fal.ai
- Automatic credit deduction and refund system
- Real-time status updates
- Supabase Storage integration
- Robust error handling with automatic refunds
