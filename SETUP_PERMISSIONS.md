# Appwrite Database Permissions Setup

This guide will help you set up the correct database permissions for your Appwrite collections.

## Requirements

- Appwrite API Key with sufficient permissions (Database:write, Collection:write)
- Node.js installed
- Appwrite CLI configured (optional)

## Quick Setup

### 1. Get your Appwrite API Key
1. Go to your Appwrite Console: https://cloud.appwrite.io
2. Navigate to your project → Settings → API Keys
3. Create a new API key with the following permissions:
   - Database:write
   - Collection:write
   - Document:read, write

### 2. Set Environment Variable
```bash
export APPWRITE_API_KEY="your_api_key_here"
```

### 3. Run the Permission Setup Script

```bash
npm run setup-permissions
```

## Manual Setup via Appwrite Console

If you prefer to set up permissions manually:

### Collection Permissions Configuration

#### 1. Profiles Collection
- **Read**: `user:id` (users can read their own profile)
- **Write**: `user:id` (users can update their own profile)

#### 2. Model Photos Collection
- **Read**: `users` (all authenticated users can read)
- **Write**: `user:id` (users can manage their own photos)

#### 3. Product Images Collection
- **Read**: `user:id` (users can read their own images)
- **Write**: `user:id` (users can manage their own images)

#### 4. Try On Results Collection
- **Read**: `user:id` (users can read their own results)
- **Write**: `user:id` (users can manage their own results)

#### 5. Wallets Collection
- **Read**: `user:id` (users can read their own wallet)
- **Write**: `user:id` (users can manage their own wallet)

#### 6. Credit Transactions Collection
- **Read**: `user:id` (users can read their own transactions)
- **Write**: `user:id` (users can manage their own transactions)

## Permission Syntax

The permissions use Appwrite's role-based access control:

- `user:id` - The authenticated user can only access their own documents
- `users` - All authenticated users can access
- `any` - Public access (no authentication required)
- `team:TEAM_ID` - Members of a specific team
- `member:MEMBER_ID` - Specific team member

## Verification

After setting up permissions, you can verify they work by:

1. **Check the debug page**: Visit http://localhost:3000/debug
2. **Test with different users**: Log in with different accounts to ensure isolation
3. **Check console logs**: The debug page will show permission status for each collection

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Ensure your API key has sufficient permissions
2. **Collection not found**: Verify collection IDs match your environment variables
3. **Permission denied**: Check that the API key belongs to the correct project

### Debug Commands

```bash
# Check current collection permissions
appwrite databases getCollection --databaseId modele-giydir-db --collectionId profiles

# List all collections
appwrite databases listCollections --databaseId modele-giydir-db
```

## Security Notes

- Never commit your API key to version control
- Use environment variables for sensitive data
- Regularly rotate API keys
- Use the principle of least privilege when creating API keys

## Support

If you encounter issues:
1. Check the Appwrite documentation: https://appwrite.io/docs
2. Verify your project settings in the Appwrite console
3. Ensure your collections exist before setting permissions
