# KAIRO Backend Setup Guide

## 🚀 Overview
This guide walks through setting up the backend infrastructure for the new features:
1. Real email invitations
2. Role-based permission enforcement
3. Offline mode support
4. Push notifications

## 📋 Prerequisites
- Access to Supabase dashboard (https://hniojizunzgtyvuwucww.supabase.co)
- Service Role Key (for Edge Functions) - **KEEP SECURE**
- Anon Key (for client) - Already in `app.json`

---

## 🔑 Step 1: Apply Database Migrations

### 1.1 Add Permission & Invite Columns
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Create a new query and paste the contents of `supabase/migrations/001_add_permissions_and_invites.sql`
3. Run the query

**Changes made:**
- `project_roles.permission_level` → 'viewer' or 'editor'
- `users.invite_status` → 'active', 'invited', 'pending'
- `users.invitation_sent_at` → tracks when invite was sent
- `users.last_invite_email` → for retries

### 1.2 Apply RLS Policies
1. In **SQL Editor**, paste `supabase/rls_policies.sql`
2. Run the query

**Security:**
- Viewers can READ all project data but NOT write
- Editors can READ and WRITE
- Budget and storyboard data are protected
- Policies are enforced at database level

---

## 🔧 Step 2: Deploy Edge Function

### 2.1 Prepare Environment
```bash
cd supabase/functions/send-crew-invite
# No npm install needed - Deno uses inline imports
```

### 2.2 Deploy to Supabase
```bash
supabase functions deploy send-crew-invite --project-id hniojizunzgtyvuwucww
```

### 2.3 Verify Deployment
```bash
supabase functions list --project-id hniojizunzgtyvuwucww
```

**Expected output:**
```
send-crew-invite  | deployed
```

### 2.4 Test the Function
```bash
supabase functions invoke send-crew-invite --project-id hniojizunzgtyvuwucww \
  --body '{
    "email": "test@example.com",
    "full_name": "Test User",
    "project_id": "your-project-id",
    "invited_by_user_id": "your-user-id",
    "permission_level": "viewer"
  }'
```

---

## 📧 Step 3: Configure Email Settings

### 3.1 Enable Supabase Email
1. Go to **Supabase Dashboard** → **Settings** → **Email**
2. Choose your email provider:
   - **Built-in (Free)**: Limited to 4 emails/day
   - **SendGrid**: Recommended for production
   - **Postmark**: Premium option

### 3.2 Custom Email Template (Optional)
The current Edge Function uses Supabase's default invitation email. To customize:
1. Update the `EmailTemplate` component in `send-crew-invite/index.ts`
2. Call your custom email service (e.g., SendGrid API)

---

## 🔐 Step 4: Security Configuration

### 4.1 Store Service Role Key Safely
Add to your `.env.local` (NEVER commit to git):
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 4.2 Verify RLS is Enabled
```sql
-- Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Should show `true` for: call_sheets, budget_items, storyboard_images

---

## 📲 Step 5: Configure Offline & Push Notifications

### 5.1 Offline Mode Setup
Already handled by:
- `AsyncStorage` for local caching
- `expo-file-system` for file storage
- Sync logic in screens (see src/hooks/useOfflineSync.ts)

### 5.2 Push Notifications Setup
```bash
npm install expo-notifications
```

Configuration:
1. Add to `app.json` (Expo Config)
2. Request permissions in app startup
3. Store FCM/APNs tokens in `users.expo_push_token`

---

## ✅ Verification Checklist

- [ ] SQL migrations applied (permissions table columns exist)
- [ ] RLS policies enabled on 3 tables
- [ ] Edge Function deployed successfully
- [ ] Can invoke function from client
- [ ] Email invitation received when testing
- [ ] User can click link and create account
- [ ] User automatically added to project with correct permission level
- [ ] Budget/Storyboard data respects viewer vs editor permissions

---

## 🐛 Troubleshooting

### Email not received
1. Check Supabase email settings → check spam folder
2. Verify email address is correct in function call
3. Check Edge Function logs: Dashboard → Functions → Logs

### Permission errors
1. Verify user has project_roles entry
2. Check permission_level is 'viewer' or 'editor'
3. Run RLS policy check query (see Step 4.2)

### Edge Function deployment fails
```bash
# Check Deno version
deno --version

# Test locally
supabase functions serve send-crew-invite
# Then curl http://localhost:54321/functions/v1/send-crew-invite
```

---

## 📚 API Reference

### Invoke from Frontend
```typescript
// In InviteCrew.tsx or similar
const inviteUser = async (email: string, fullName: string) => {
  const { data, error } = await supabase.functions.invoke('send-crew-invite', {
    body: {
      email,
      full_name: fullName,
      project_id: projectId,
      invited_by_user_id: userId,
      permission_level: 'viewer'
    }
  });
  
  if (error) throw error;
  return data;
};
```

### Database Queries

**Get user's role in project:**
```sql
SELECT permission_level FROM project_roles
WHERE user_id = $1 AND project_id = $2;
```

**Check if editor:**
```sql
SELECT EXISTS(
  SELECT 1 FROM project_roles
  WHERE user_id = auth.uid()
  AND project_id = $1
  AND permission_level = 'editor'
);
```

---

## 🚀 Next Steps

1. **Frontend Implementation**: Update InviteCrew screen (see src/screens/Main/InviteCrew.tsx)
2. **Permission Context**: Create usePermissions hook for checking access
3. **Offline Sync**: Implement cache layer for offline access
4. **PDF Export**: Add call sheet PDF generation
5. **Push Notifications**: Configure and test notifications

See `IMPLEMENTATION_NOTES.md` for frontend integration details.
