# Environment Variables Setup

This project uses environment variables to securely store sensitive configuration data like Supabase credentials.

## Setup Instructions

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file with your actual values:**
   ```env
   VITE_SUPABASE_URL=your_actual_supabase_url
   VITE_SUPABASE_ANON_KEY=your_actual_supabase_anon_key
   ```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key | Yes |

## Security Notes

- The `.env` file is included in `.gitignore` and will not be committed to version control
- Environment variables prefixed with `VITE_` are exposed to the client-side code
- Never commit your actual `.env` file to version control
- The application will fall back to hardcoded values if environment variables are not set (for development purposes)

## Getting Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the Project URL and anon/public key
4. Add them to your `.env` file
