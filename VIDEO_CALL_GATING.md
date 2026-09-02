# Video Call Gating - Feature Status

## Overview
Built-in video calling has been gated in KAIRO MVP. Instead of a broken WebView implementation, the app now provides a professional "Coming Soon" screen that guides users to external video conferencing solutions.

## Changes Made

### VideoCall.tsx Screen Replacement
**Previous Implementation:**
- Used Jitsi Meet WebView embedded in the app
- Unreliable on mobile devices
- Difficult to maintain and debug

**New Implementation:**
- Professional "Coming Soon" screen
- Recommends Jitsi Meet (free, no account needed)
- Links to alternative providers: Google Meet, Zoom, Skype
- Shows project ID for easy meeting link sharing
- Opens external apps in native browser for better compatibility

### Key Features

#### User-Friendly Interface
- Clear messaging about feature status
- Attractive card layout with icons
- Quick access buttons to external providers
- Information box with tips for crew members

#### Recommended Solution - Jitsi Meet
- Free and secure
- No account required
- Works on any device with a browser
- Easy to use for remote crew coordination
- Project-specific meeting IDs (e.g., `KairosProject-{projectId}`)

#### Alternative Providers
Users can choose from:
1. **Google Meet** - Premium features, seamless Google Workspace integration
2. **Zoom** - Industry standard, extensive recording and meeting features
3. **Skype** - Integrated messaging and video calling

## User Experience

### When User Taps Video Call Button
1. Screen shows "Video Calling - Feature Coming Soon"
2. User sees Jitsi Meet recommended with project ID
3. "Open Jitsi Meet Now" button opens Jitsi in browser
4. Alternative provider links provided
5. Clear instructions for sharing with crew

### Workflow
1. Tap "Video Call" in Dashboard or ProjectDetails
2. See gating screen with options
3. Tap "Open Jitsi Meet Now" or select alternative
4. External browser/app opens with video call
5. User can return to KAIRO app and continue working

## Technical Details

### Implementation
- Screen: `src/screens/Main/VideoCall.tsx`
- Navigation: Route still exists but with gating screen
- External links: Use `Linking.openURL()` for native handling
- No WebView dependency removed (still used elsewhere for other features)

### External Link Handling
```typescript
const handleOpenJitsi = async () => {
  const jitsiUrl = `https://meet.jit.si/KairosProject-${projectId}`;
  try {
    const canOpen = await Linking.canOpenURL(jitsiUrl);
    if (canOpen) {
      await Linking.openURL(jitsiUrl);
    }
  } catch (error) {
    console.error('Error opening Jitsi:', error);
  }
};
```

## Project ID Sharing

Each video call session is associated with the project ID:
```
Meeting Room: KairosProject-{projectId}
```

This makes it easy for crew members to identify which project the meeting is for when multiple calls are happening.

## Future Implementation

When built-in video calling is fully implemented in KAIRO Pro:

1. Replace VideoCall.tsx gating screen with actual WebRTC implementation
2. Options:
   - Use Jitsi SDK directly for better control
   - Integrate with custom WebRTC server
   - Use vendor SDK (Twilio, Agora, etc.)
3. Add recording capabilities
4. Store meeting logs and transcripts
5. Integrate with call sheet and crew management

## Migration Path

**Phase 1 (MVP - Current)**
- ✅ Gated feature with external provider links
- ✅ User education on alternatives
- ✅ Zero maintenance for broken WebView

**Phase 2 (KAIRO v2.0)**
- ⏳ Native SDK integration
- ⏳ Recording support
- ⏳ Meeting transcripts
- ⏳ Call history tracking

**Phase 3 (KAIRO Pro)**
- ⏳ Advanced WebRTC features
- ⏳ Screen sharing
- ⏳ Virtual backgrounds
- ⏳ Meeting scheduling integration

## Related Files
- `src/screens/Main/VideoCall.tsx` - Gating screen implementation
- `src/navigation/types.ts` - Route definition (unchanged)
- `App.tsx` - Navigation integration (unchanged)

## User Communication

Crew members should be informed that:
1. Video calling requires an external service
2. Jitsi Meet is recommended and free
3. They can use any preferred video service (Google Meet, Zoom, etc.)
4. Project IDs are provided for easy meeting identification

## Support & Testing

### Testing Gating Screen
1. Navigate to a project
2. Tap "Video Call" button or menu item
3. Verify "Coming Soon" screen appears
4. Test external links open correctly
5. Verify project ID is displayed

### Testing External Links
```typescript
// Development testing
import { Linking } from 'react-native';

// Test Jitsi
Linking.openURL('https://meet.jit.si/KairosProject-test-123');

// Test Google Meet
Linking.openURL('https://www.google.com/meet/');

// Test Zoom
Linking.openURL('https://www.zoom.us/');
```

### Monitoring
If users report issues:
1. Verify external service is accessible
2. Check network connectivity
3. Test with different user devices
4. Monitor external service status

## FAQ

**Q: When will built-in video calling be available?**
A: It's planned for KAIRO Pro. For now, use Jitsi Meet or your preferred video service.

**Q: Why was the WebView removed?**
A: WebView implementation was unreliable on mobile devices and difficult to maintain.

**Q: Do I need an account for Jitsi Meet?**
A: No! Jitsi is free and doesn't require an account. Just open the link and start calling.

**Q: Can I use Zoom instead?**
A: Yes! You can use any video service you prefer. Just share the link with your crew.

**Q: Will meeting history be saved?**
A: Not in the current MVP. External providers may have their own recording options.

## Metrics to Track

If analytics are implemented, track:
- Number of times video call screen is viewed
- Which provider links are clicked most
- User feedback about the gating approach
- Requests for built-in video implementation
