# Just Us 💙

Private two-person real-time chat for exactly two roles: Him 🔵 and Her 🟢.

## Stack

Next.js App Router, TypeScript, Tailwind CSS, Supabase PostgreSQL + Realtime, Vercel.

## Local setup

1. Install Node.js 20+.
2. Run `npm install`.
3. Create a Supabase project.
4. Run `supabase/migrations/001_just_us.sql` in the Supabase SQL editor.
5. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
6. Run `npm run dev`.

## Vercel

Import this GitHub repository into Vercel, add the same two environment variables, and deploy. Add `justus.com` under Vercel Project Settings → Domains, then configure the DNS records Vercel provides at your domain registrar.

## Important security note

This product intentionally has no authentication, passwords, email, registration, or shared secret. Therefore role selection is not identity verification. Do not describe the public no-login architecture as cryptographic authentication. Never add a Supabase service-role key to browser code.

## Message lifecycle

Messages have independent `her_seen` and `him_seen` flags. A sender is considered to have seen their own sent message. The database cleanup trigger only removes a message when both flags are true, avoiding client-only deletion decisions and reducing race-condition risk.
