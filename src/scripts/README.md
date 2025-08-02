# Model Photo Generator

This script generates AI model photos using the FalAI minimax API and uploads them to Supabase for use in the try-on tool.

## Features

- 🎨 Generates realistic model photos using FalAI minimax/image-01 API
- 🔄 Automatically checks for existing models to avoid duplicates
- 📤 Uploads generated images to Supabase storage
- 💾 Stores model metadata in the database
- 🎯 Supports different genders and body types
- 📊 Provides detailed progress tracking and error reporting
- 🔍 Dry-run mode to preview what would be generated

## Prerequisites

1. **Environment Variables**: Set up the following environment variables in your `.env.local` file:
   ```bash
   FAL_API_KEY=your_fal_ai_api_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. **Model Prompts File**: Ensure `resources/model-prompts.json` exists in the project root with the following structure:
   ```json
   {
     "model_photos": [
       {
         "name": "Model Name",
         "description": "Description of the model",
         "gender": "female|male|unisex",
         "prompt": "Detailed AI prompt for image generation"
       }
     ]
   }
   ```

3. **Supabase Setup**: 
   - Ensure the `model_photos` table exists in your database
   - Ensure the `model-photos` storage bucket exists
   - Set up proper RLS policies for the service role

## Usage

### Install Dependencies
```bash
npm install
```

### Run the Generator
```bash
# Generate all model photos
npm run generate-models

# Dry run (preview what would be generated)
npm run generate-models:dry-run

# Show help
npm run generate-models -- --help
```

### Manual Execution
You can also run the scripts directly:
```bash
# Using tsx (recommended)
npx tsx src/scripts/run-model-generator.ts

# Direct execution (if you have ts-node)
npx ts-node src/scripts/generate-model-photos.ts
```

## How It Works

1. **Environment Validation**: Checks for required environment variables
2. **Model Prompts Loading**: Loads model definitions from `resources/model-prompts.json`
3. **Duplicate Checking**: Queries the database to check if a model already exists
4. **Image Generation**: Uses FalAI minimax API to generate images based on prompts
5. **Image Download**: Downloads the generated image from FalAI
6. **Storage Upload**: Uploads the image to Supabase storage bucket
7. **Database Storage**: Saves model metadata to the `model_photos` table

## Configuration

### Image Settings
- **Aspect Ratio**: 2:3 (portrait format, suitable for fashion models)
- **Format**: JPEG
- **Optimization**: Enabled via `prompt_optimizer: true`

### API Settings
- **Timeout**: 5 minutes per image generation
- **Retry Logic**: Built-in polling with status checks
- **Rate Limiting**: 2-second delay between requests

## Database Schema

The script expects the following table structure:

```sql
create table public.model_photos (
  id uuid not null default gen_random_uuid (),
  name text not null,
  description text null,
  image_url text not null,
  image_path text not null,
  gender text null default 'unisex'::text,
  body_type text null,
  is_active boolean null default true,
  sort_order integer null default 0,
  created_at timestamp with time zone null default now(),
  constraint model_photos_pkey primary key (id),
  constraint model_photos_gender_check check (
    gender = any (array['male'::text, 'female'::text, 'unisex'::text])
  )
);
```

## Storage Structure

Generated images are stored in the `model-photos` bucket with the following structure:
```
model-photos/
└── generated/
    ├── jane-1703123456789.jpg
    ├── aisha-1703123456790.jpg
    └── ...
```

## Error Handling

The script includes comprehensive error handling:
- **API Failures**: Retries with exponential backoff
- **Upload Failures**: Detailed error messages
- **Database Errors**: Transaction rollback on failure
- **Network Issues**: Timeout handling and retry logic

## Output

The script provides detailed console output with:
- 🎨 Generation progress for each model
- 📤 Upload status and URLs
- 💾 Database save confirmation
- 📊 Final summary with success/failure counts

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   ```
   Error: Missing required environment variables: FAL_API_KEY
   ```
   Solution: Add the missing variables to your `.env.local` file

2. **Model Prompts File Not Found**
   ```
   Error: Model prompts file not found: /path/to/model-prompts.json
   ```
   Solution: Ensure the file exists at `resources/model-prompts.json`

3. **Supabase Connection Issues**
   ```
   Error: Failed to upload to Supabase
   ```
   Solution: Check your Supabase credentials and bucket permissions

4. **FalAI API Errors**
   ```
   Error: Generation failed
   ```
   Solution: Check your FalAI API key and account limits

### Debug Mode

For detailed debugging, you can modify the script to enable verbose logging:
```typescript
// In generate-model-photos.ts
console.log('Debug info:', { status, logs, attempts })
```

## Contributing

When adding new models:
1. Add the model definition to `resources/model-prompts.json`
2. Ensure the prompt is detailed and specific
3. Test with dry-run mode first
4. Run the generator to create the model

## Security Notes

- The script uses the Supabase service role key for database operations
- Generated images are stored in a public bucket
- No sensitive data is logged to the console
- API keys are loaded from environment variables only

## Performance

- Processing time: ~30-60 seconds per model
- Concurrent requests: Sequential processing to avoid API rate limits
- Memory usage: Minimal (images are streamed, not stored in memory)
- Storage: ~500KB-2MB per generated image 