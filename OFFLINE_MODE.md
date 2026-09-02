# Offline Mode Implementation Guide

## Overview
The KAIRO app now supports offline-first mode, allowing on-set users to:
- View cached scenes, call sheets, and project data when offline
- Continue reading-only operations without internet
- Automatically sync when connection is restored

## Architecture

### 1. **Offline Sync Hook** (`src/hooks/useOfflineSync.ts`)
Provides caching and sync functionality:

```typescript
const { data, isOnline, isFromCache, refresh } = useOfflineSync(
  { cacheKey: 'scenes', ttl: 3600000 }, // 1 hour
  async () => {
    const { data } = await supabase
      .from('scenes')
      .select('*')
      .eq('project_id', projectId);
    return data;
  }
);
```

**Features:**
- Automatic cache on successful fetch
- TTL (time-to-live) support
- Graceful fallback to cache when offline or fetch fails
- Network status monitoring

### 2. **Offline Indicator Component** (`src/components/OfflineIndicator.tsx`)
Shows banner when device is offline:
- Animated slide-in/out
- Clear messaging to user
- Optional cache data indicator

**Usage:**
```tsx
<OfflineIndicator />
// Shows: "No internet connection - using cached data"
```

### 3. **Network Status Detection**
Uses `@react-native-community/netinfo` (already in package.json):
- Monitors connection changes in real-time
- Handles WiFi/cellular transitions
- Triggers auto-refresh when back online

---

## Implementation in Screens

### Example: CallSheetView (Read-Only Access)

```typescript
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { OfflineIndicator, CacheIndicator } from '../../components/OfflineIndicator';

export default function CallSheetView({ route }: ProjectsScreenProps<'CallSheetView'>) {
  const { projectId, sceneId } = route.params;

  // Use offline sync for data
  const { data: crew, isOnline, isFromCache, isLoading, refresh } = useOfflineSync(
    { cacheKey: `call-sheet-${sceneId}` },
    async () => {
      const { data } = await supabase
        .from('project_roles')
        .select('...')
        .eq('project_id', projectId);
      return data;
    }
  );

  return (
    <>
      <OfflineIndicator />
      {isFromCache && <CacheIndicator visible={true} />}
      
      {/* Rest of component - data is read-only */}
      <ScrollView>
        {crew?.map(member => (
          <CrewCard key={member.id} data={member} />
        ))}
      </ScrollView>
    </>
  );
}
```

### Example: SceneManager (With Write Operations)

For scenes that need offline support with syncing:

```typescript
import { useOfflineList } from '../../hooks/useOfflineSync';

export default function SceneManager() {
  const { data: scenes, syncQueue, addToSyncQueue, processSyncQueue } = useOfflineList(
    { cacheKey: 'scenes-project-123' },
    async () => {
      const { data } = await supabase
        .from('scenes')
        .select('*')
        .eq('project_id', projectId);
      return data;
    }
  );

  const handleCreateScene = async (sceneData) => {
    const newScene = { ...sceneData, id: Date.now().toString() };
    addToSyncQueue(newScene); // Queue for sync
    
    // Optimistic update
    setScenes([...scenes, newScene]);

    // Try to upload if online
    if (isOnline) {
      await processSyncQueue(async (items) => {
        for (const item of items) {
          await supabase.from('scenes').insert(item);
        }
      });
    }
  };
}
```

---

## Cache Storage

### Storage Location
- **iOS**: App Documents folder (persists across app restarts)
- **Android**: App-specific cache directory
- **Automatic cleanup**: Expired cache (TTL) is automatically removed

### Cache Size Limits
- Default TTL: 1 hour
- Typical cache size per screen: 50KB - 2MB
- AsyncStorage limit: 10MB (per app)

### Cache Keys Convention
- `offline_cache_scenes` → Scene list
- `offline_cache_call-sheet-{sceneId}` → Call sheet data
- `offline_cache_budget-{projectId}` → Budget data

---

## Best Practices

### 1. **Determine What to Cache**
Cache read-heavy, low-change data:
- ✅ Scenes, call sheets, storyboards
- ✅ Role assignments, crew lists
- ❌ Real-time chat messages
- ❌ Frequently changing budget items (cache but refresh on restore)

### 2. **Set Appropriate TTL**
```typescript
// Read-only project data - 1 hour cache
useOfflineSync({ cacheKey: 'scenes', ttl: 3600000 }, fetchFn);

// Frequently updated data - 5 minute cache
useOfflineSync({ cacheKey: 'chat', ttl: 300000 }, fetchFn);

// Critical data - 30 minute cache
useOfflineSync({ cacheKey: 'budget', ttl: 1800000 }, fetchFn);
```

### 3. **Handle Data Staleness**
Show user when data is cached:
```typescript
{isFromCache && (
  <View style={styles.warning}>
    <Text>This data may be outdated</Text>
    <Button title="Refresh" onPress={refresh} />
  </View>
)}
```

### 4. **Sync Strategy for Writes**
- Queue operations locally (using useOfflineList)
- Show pending sync indicator
- Auto-sync when back online
- Allow manual retry on failure

---

## Network Status Patterns

### Pattern 1: Fetch → Cache → Use
```typescript
// Automatic with useOfflineSync
// 1. Try to fetch fresh data
// 2. Cache if successful
// 3. Use cached data if fetch fails and offline
```

### Pattern 2: Detect Offline & Prevent Writes
```typescript
const isOnline = useOnline();

if (!isOnline) {
  return <Text>Editing is not available offline</Text>;
}
```

### Pattern 3: Queue & Sync
```typescript
// When offline, queue operations
// When back online, sync automatically
const { processSyncQueue } = useOfflineList(...);
```

---

## Testing Offline Mode

### On Expo/Emulator
```bash
# iOS Simulator - Toggle network in Hardware menu
# Android Emulator - Toggle in Settings or use CLI

# Programmatically simulate offline:
import NetInfo from '@react-native-community/netinfo';
// (In development/testing only)
```

### Testing Checklist
- [ ] Data loads from cache when offline
- [ ] Offline indicator appears
- [ ] Data refreshes when back online
- [ ] Write operations fail gracefully offline
- [ ] Cache expires after TTL
- [ ] Multiple screens don't duplicate API calls

---

## Troubleshooting

### Cache not appearing
1. Check TTL hasn't expired
2. Verify cache key matches
3. Check AsyncStorage permissions

### Sync not working
1. Verify network status detection
2. Check if data was queued
3. Ensure sync function has proper error handling

### Performance issues
1. Reduce cache size (more frequent TTL)
2. Limit cached data queries (add filters)
3. Profile AsyncStorage access

---

## Configuration

Add to `app.json` if needed:
```json
{
  "expo": {
    "plugins": [
      ["@react-native-community/netinfo"]
    ]
  }
}
```

The hook already handles:
- Automatic network monitoring
- Background sync preparation
- Memory management
- Error recovery

---

## Migration Path

1. **Phase 1**: Implement `useOfflineSync` in read-only screens
2. **Phase 2**: Add `OfflineIndicator` to main navigation
3. **Phase 3**: Add `useOfflineList` for writable screens
4. **Phase 4**: Implement background sync (Expo.BackgroundFetch)

See `IMPLEMENTATION_NOTES.md` for per-screen integration details.
