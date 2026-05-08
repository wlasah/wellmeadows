# Wellmeadows Hospital Supabase Frontend

This repository now includes a full frontend implementation for the Wellmeadows Hospital project that uses Supabase directly from the browser.

## Where to find it
- `frontend/index.html` — main app entry point
- `frontend/app.js` — page routing and Supabase queries
- `frontend/style.css` — frontend styles
- `frontend/supabase-config.js` — put your Supabase URL and anon key here

## How to run
1. Open `g:\wellmeadows UI\frontend\supabase-config.js`.
2. Replace the placeholders with your Supabase project URL and anon public key.
3. Serve the frontend locally:
   ```bash
   cd "g:\wellmeadows UI\frontend"
   python -m http.server 8000
   ```
4. Open `http://localhost:8000` in your browser.

## What it supports
- patient search and details
- patient registration
- appointments list and booking
- medications list
- ward inventory and availability
- staff directory and schedule
- dashboard summary counts

## Notes
- This is a frontend-only implementation; the old Flask/Python backend and template files have been removed.
- For real Supabase security, configure Row Level Security (RLS) in your project and adjust policies accordingly.
