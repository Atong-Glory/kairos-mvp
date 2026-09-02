import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Icon from 'react-native-vector-icons/Ionicons';

/**
 * Component that shows an offline indicator banner when device is not connected
 * Place this at the top of your app or screen
 */
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected ?? true;
      setIsOnline(online);

      if (!online) {
        setShowBanner(true);
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: false,
          speed: 20,
          bounciness: 8,
        }).start();
      } else {
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }).start(() => setShowBanner(false));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [slideAnim]);

  if (!showBanner && isOnline) return null;

  const height = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 48],
  });

  return (
    <Animated.View style={[styles.banner, { height }]}>
      <View style={styles.content}>
        <Icon name="cloud-offline" size={18} color="#FCA5A5" />
        <Text style={styles.text}>No internet connection - using cached data</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    overflow: 'hidden',
    backgroundColor: '#7C2D12',
    borderBottomWidth: 1,
    borderBottomColor: '#92400E',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FED7AA',
  },
});

/**
 * Custom hook to check online status
 */
export function useOnline() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return isOnline;
}

/**
 * Component to show when data is from cache
 */
export function CacheIndicator({ visible = true }: { visible?: boolean }) {
  if (!visible) return null;

  return (
    <View style={styles.cacheIndicator}>
      <Icon name="server" size={14} color="#94A3B8" />
      <Text style={styles.cacheText}>Data from cache</Text>
    </View>
  );
}

StyleSheet.create({
  cacheIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    gap: 6,
    marginBottom: 12,
  },
  cacheText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
