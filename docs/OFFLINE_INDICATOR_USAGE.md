# Offline Indicator Usage Guide

This guide explains how to use the offline indicators in the mobile app to notify users when they're not connected to the internet.

## Overview

The app includes two types of offline indicators:

1. **OfflineIndicator** - A small, subtle indicator that appears at the top of the screen
2. **OfflineBanner** - A more prominent banner that can be used in specific screens

Both indicators automatically detect network connectivity changes and show relevant information to users.

## 1. OfflineIndicator (Global)

The `OfflineIndicator` is automatically included in the main app layout and appears on all screens when the device is offline.

### Features:

- Shows network status (online/offline)
- Displays pending sync count when offline
- Smooth slide-in/out animations
- Uses existing Badge component for consistent styling

### Usage:

```tsx
// Already included in app/_layout.tsx
<OfflineIndicator />

// For debugging (shows even when online)
<OfflineIndicator showWhenOnline={true} />
```

### Props:

- `showWhenOnline?: boolean` - Show indicator even when online (for debugging)

## 2. OfflineBanner (Screen-specific)

The `OfflineBanner` is a more prominent banner that can be added to specific screens where offline status is critical.

### Features:

- Prominent red banner with clear messaging
- Expandable to show more details
- Retry button for manual sync
- Shows pending sync count
- Smooth animations

### Usage:

```tsx
import { OfflineBanner } from "@/components/OfflineBanner";

export default function MyScreen() {
  const handleRetry = async () => {
    // Custom retry logic
    await someApiCall();
  };

  return (
    <View style={tw`flex-1`}>
      {/* Your screen content */}

      {/* Add the banner */}
      <OfflineBanner onRetry={handleRetry} showSyncStatus={true} />
    </View>
  );
}
```

### Props:

- `onRetry?: () => void` - Custom retry function (defaults to triggering sync)
- `showSyncStatus?: boolean` - Show pending sync count (default: true)
- `style?: any` - Additional styles

## 3. Network Manager

Both indicators use the existing `NetworkManager` to detect connectivity changes and manage offline data.

### Key Methods:

```tsx
import networkManager from "@/utils/networkManager";

// Check if online
const isOnline = networkManager.getIsOnline();

// Subscribe to network changes
const unsubscribe = networkManager.addListener((online: boolean) => {
  console.log("Network changed:", online);
});

// Get pending sync count
const count = await networkManager.getPendingSyncCount();

// Trigger manual sync
const result = await networkManager.syncOfflineData();

// Clear sync queue (for debugging)
await networkManager.clearSyncQueue();
```

## 4. Testing

### Debug Screen

Use the "Offline Indicator Test" screen in the dev menu to test both indicators:

1. Navigate to Developer Options → Offline Indicator Test
2. Enable "Show indicator when online" to see indicators
3. Turn off WiFi/mobile data to test offline state
4. Add test sync items to see pending count
5. Turn internet back on to see sync process

### Manual Testing

1. Turn off WiFi and mobile data
2. Navigate through the app
3. Verify indicators appear
4. Turn internet back on
5. Verify indicators disappear and sync occurs

## 5. Customization

### Styling

Both indicators use the app's design system:

- Colors from the theme
- Typography from `@/styles/typography`
- Tailwind classes for layout

### Behavior

- Indicators automatically show/hide based on network status
- Sync count updates every 5 seconds
- Animations use React Native's Animated API

## 6. Best Practices

1. **Use OfflineIndicator for general awareness** - It's subtle and doesn't interfere with the UI
2. **Use OfflineBanner for critical screens** - Sales, payments, or data entry screens
3. **Provide custom retry logic** - When the default sync isn't sufficient
4. **Test thoroughly** - Use the debug screen and real network conditions
5. **Consider user experience** - Don't overwhelm users with too many indicators

## 7. Integration Examples

### Sales Screen

```tsx
// In app/(tabs)/sales.tsx
<View style={tw`flex-1`}>
  <OfflineBanner onRetry={handleRetry} showSyncStatus={true} />
  {/* Sales screen content */}
</View>
```

### Payment Screen

```tsx
// In payment-related screens
<View style={tw`flex-1`}>
  <OfflineBanner
    onRetry={handlePaymentRetry}
    showSyncStatus={false} // Don't show sync for payments
  />
  {/* Payment screen content */}
</View>
```

## 8. Troubleshooting

### Indicator not showing

- Check if network manager is properly initialized
- Verify `@react-native-community/netinfo` is installed
- Check console logs for network manager errors

### Sync not working

- Verify storage is properly configured
- Check API endpoints are accessible
- Review network manager logs

### Performance issues

- Indicators update every 5 seconds by default
- Consider reducing update frequency for better performance
- Monitor memory usage with multiple listeners
