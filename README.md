# Kairos

Film production management for small production houses: projects, scenes, call sheets,
budgets, script PDFs, continuity photos and team chat. Expo (React Native) client on a
Supabase backend, multi-tenant (one tenant = one production house).

## Stack

- Expo SDK 52 / React Native 0.76 / TypeScript
- Supabase (Postgres + RLS, Auth, Storage, Realtime)
- EAS Build for iOS / Android binaries

## Local development

```bash
cp .env.example .env          # fill in EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY
npm ci
npm start                     # Expo dev server
npm run check                 # typecheck + expo-doctor + dependency alignment
```

`react-native-pdf` and `react-native-blob-util` need native code, so the app runs in a
**development build** (`eas build --profile development`) or `npx expo run:ios|android`,
not in Expo Go.

## Supabase setup (required before first real user)

1. Create a project, copy the URL and anon key into `.env`.
2. Apply `supabase/migrations/*.sql` (`supabase db push`, or paste into the SQL editor).
   This creates the schema, tenant-scoped RLS policies, the `on_auth_user_created`
   trigger that provisions tenant + profile from sign-up metadata, the private `scripts`
   and `continuity` storage buckets with per-project policies, and enables realtime for
   `projects` and `messages`.
3. Seed `roles_master` (name, department) if empty.
4. Auth → URL configuration: add `kairos://auth-callback` to **Redirect URLs**.
5. Auth → Email: configure a custom SMTP provider (the default sender is rate-limited to
   a few emails/hour and is not suitable for production) and review the templates for
   confirm sign-up and reset password.

Never ship the `service_role` key in the app. The anon key is safe to embed only because
every table has RLS enabled.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL (embedded in the bundle) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (embedded in the bundle) |
| `EAS_PROJECT_ID` | Set after `eas init`; enables EAS Build/Update |

For EAS builds, set the `EXPO_PUBLIC_*` values as EAS environment variables (or EAS
secrets) for each build profile; `.env` is gitignored and not uploaded.

## Building & releasing

```bash
npm i -g eas-cli && eas login
eas init                                  # writes EAS_PROJECT_ID → put it in .env / EAS env
eas build --profile preview --platform android   # internal APK for testers
eas build --profile production --platform all
eas submit --profile production --platform all
```

Bundle identifiers: `com.atomzdigital.kairos` (iOS & Android), configured in
`app.config.ts`. Version/build numbers are managed remotely (`appVersionSource: remote`).

## Auth flows

- **Sign up** → confirmation email → deep link `kairos://auth-callback` → session restored.
- **Forgot password** → email → deep link → in-app *Set new password* screen.
- **Invite crew** → creates the account with the inviter's `tenant_id` in metadata using a
  session-less client (inviter stays signed in); invitee confirms email then uses
  *Forgot password?* to set a password.

## Project layout

```
App.tsx                 navigation root, auth gating, error boundary
app.config.ts           Expo config (reads env for Supabase / EAS)
src/context             AuthContext (session, profile, deep links, recovery)
src/lib                 supabase clients, validation helpers
src/screens/Auth        Login, SignUp, ForgotPassword, ResetPassword
src/screens/Main        Dashboard, project tools, chat, invites
supabase/migrations     schema, RLS, triggers, storage, realtime
```
