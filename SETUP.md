# Wellmeadows Hospital Supabase Frontend Setup

This file explains how to clone the repository to a new device and run the frontend locally.

## 1. Clone the repository

```bash
git clone <repository-url>
cd "wellmeadows UI"
```

Replace `<repository-url>` with the actual Git remote URL for this repository.

## 2. Review the project structure

The frontend is located in the `frontend/` folder:

- `frontend/index.html` — SPA entry page
- `frontend/app.js` — application logic, routing, and Supabase queries
- `frontend/style.css` — UI styling
- `frontend/supabase-config.js` — place your Supabase URL and anon key here
- `frontend/supabase-policies.sql` — optional row-level security policy examples

The SQL schema files are in the repository root:

- `supabase_full_schema.sql` — full schema to apply in Supabase
- `supabase_schema.sql` — older schema variant

## 3. Prepare Supabase

1. Open your Supabase project.
2. In the SQL editor, run `supabase_full_schema.sql` to create the required tables.
3. Optionally, run `frontend/supabase-policies.sql` if you want example RLS policies for development.

## 4. Configure the frontend

Open `frontend/supabase-config.js` and replace the placeholders with your project values:

```js
export const SUPABASE_URL = 'https://your-project-ref.supabase.co';
export const SUPABASE_KEY = 'your-anon-public-key';
```

Use the anon/public key only for browser-based frontend access.

## 5. Run the frontend locally

From the `frontend/` folder, serve the static files. The easiest option is Python 3:

```bash
cd "wellmeadows UI\frontend"
python -m http.server 8000
```

Then open in your browser:

```text
http://localhost:8000
```

### Alternative local server options

- Node.js: `npx serve .`
- VS Code Live Server extension

## 6. Verify the app

Browse the app and confirm the pages load:

- Home
- Patients
- Register
- Appointments
- Medications
- Wards
- Staff
- Schedule
- Dashboard

If you see errors about missing tables or columns, make sure `supabase_full_schema.sql` was applied correctly.

## 7. Notes for another device

- The project is frontend-only; there is no backend server required in this repository.
- The `frontend/` folder is the active application.
- `.venv/` is not required to run the static app, but Python 3 is needed if using `python -m http.server`.
- If you want to use this on another device, just clone the repo, configure `frontend/supabase-config.js`, and run a local static server.

## 8. Helpful files

- `README.md` — main repository overview
- `frontend/README.md` — frontend-specific setup and notes
- `supabase_full_schema.sql` — schema to apply in Supabase
- `frontend/supabase-policies.sql` — example policies
