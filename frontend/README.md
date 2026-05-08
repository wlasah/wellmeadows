# Wellmeadows Supabase Frontend

This folder contains a full frontend implementation for the Wellmeadows Hospital project using Supabase as the backend.

## Setup
1. Copy `supabase-config.js` and replace the placeholders with your Supabase project URL and anon key.
2. Open the folder in a local server (recommended):
   - `cd "g:\wellmeadows UI\frontend"`
   - `python -m http.server 8000`
3. Open `http://localhost:8000` in your browser.

## Notes
- This frontend uses direct Supabase queries in the browser.
- For production, configure Row Level Security (RLS) policies in Supabase and restrict access appropriately.
- The app handles:
  - patient lookup and registration
  - appointments listing and booking
  - medications dashboard
  - ward inventory and availability
  - staff directory and schedule
  - dashboard summary counts

> If you see errors like "Could not find the table 'public.staff_department_assignments'",
> make sure you have run `supabase_full_schema.sql` in your Supabase project and that
> the `staff_department_assignments` table exists in the public schema.
- The old Flask backend and Jinja template files have been removed.

## Recommended Supabase policies
Use policies to allow authenticated access or permit the `anon` role only if your project is for development/testing.
