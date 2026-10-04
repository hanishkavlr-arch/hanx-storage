# Hanx Storage Box

A fast starter for a private multi-user video storage website.

Features:
- User signup and login
- Upload video links
- Generate private share links
- Public/private visibility toggle
- No backend required for the prototype

Run locally:

```bash
npm install
npm run dev
```

Open the browser at http://localhost:3000

Notes:
- This is a frontend prototype using localStorage for demo data.
- For real production use, connect Firebase, Supabase, or AWS S3.
- Private links are protected by a token in the URL.
