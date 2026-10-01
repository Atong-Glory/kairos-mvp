# Live Shoot Day Board

The Live Shoot Day board shows scenes scheduled for a selected date, lets project editors update a scene to **Up Next**, **Rolling**, or **Wrapped**, and lets editors move a scene to another date. The recent-changes feed records the actor and timestamp for each status or schedule change. Viewers can see the board but cannot change it.

Board reads use the existing offline cache. Cached data is marked as saved data, and edits are disabled while offline. Changes are written through the `record_shoot_day_update` database function so a reschedule and its audit event are committed together.

## Supabase setup

Apply `supabase/migrations/003_add_shoot_day_updates.sql` to the project database before using the board. The migration creates the append-only activity table, project-member/editor row-level security policies, and the transaction-safe update function.

Push notifications are not sent by this feature. The existing app stores push tokens, but the repository does not provide a server-side push delivery function. Add an authenticated server-side sender before notifying crew devices; never send through Expo Push Service directly from the client.
