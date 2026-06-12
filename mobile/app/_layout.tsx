import React, { Component, type ReactNode, useEffect, useRef } from 'react';
import { AppState, Text, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { Colors } from '@/theme';
import { useDocumentStore, useAppStore, useProStore, useDebugStore } from '@/store';
import { LockScreen } from '@/components/LockScreen';
import { track } from '@/services/analytics';
import { getApiBaseUrl } from '@/services/api';
import { initializePurchases } from '@/services/purchases';

SplashScreen.preventAutoHideAsync();

class RootErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.warn('[RootErrorBoundary]', error);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: Colors.bg }}>
          <Text style={{ color: Colors.text, fontSize: 20, fontWeight: '700', marginBottom: 12 }}>
            FileTrail could not finish loading.
          </Text>
          <Text style={{ color: Colors.textMuted, lineHeight: 22 }}>
            Please fully close the app and open it again. Your documents are still stored on this device.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const processOCRQueue = useDocumentStore(s => s.processOCRQueue);
  const syncWithBackend = useDocumentStore(s => s.syncWithBackend);
  const repairFilePaths = useDocumentStore(s => s.repairFilePaths);
  const hasHydrated = useAppStore(s => s.hasHydrated);
  const biometricEnabled = useAppStore(s => s.biometricEnabled);
  const hasOnboarded = useAppStore(s => s.hasOnboarded);
  const isAccountAuthenticated = useAppStore(s => s.isAccountAuthenticated);
  const accountEmail = useAppStore(s => s.accountProfile?.email);
  const checkPro = useProStore(s => s.checkPro);
  const isLocked = useAppStore(s => s.isLocked);
  const setLocked = useAppStore(s => s.setLocked);
  const logDebug = useDebugStore(s => s.log);
  const setDebugScreenState = useDebugStore(s => s.setScreenState);
  const appStateRef = useRef(AppState.currentState);
  const routeLabel = segments.length > 0 ? `/${segments.join('/')}` : '/';

  // Run once on mount — capture stable refs so the effect doesn't re-run
  const processOCRQueueRef = useRef(processOCRQueue);
  processOCRQueueRef.current = processOCRQueue;
  const syncWithBackendRef = useRef(syncWithBackend);
  syncWithBackendRef.current = syncWithBackend;
  const repairFilePathsRef = useRef(repairFilePaths);
  repairFilePathsRef.current = repairFilePaths;
  const checkProRef = useRef(checkPro);
  checkProRef.current = checkPro;
  const accountEmailRef = useRef(accountEmail);
  accountEmailRef.current = accountEmail;

  useEffect(() => {
    // Surface the bundled API base URL so we can tell from the debug overlay
    // whether the CI build pipeline successfully baked EXPO_PUBLIC_API_URL into
    // the JS bundle. If this shows `null`, the build that produced this binary
    // was missing the env var at Metro bundle time — not a runtime config issue.
    const apiBase = getApiBaseUrl();
    logDebug(`apiBase=${apiBase ?? 'null'}`);
    setDebugScreenState('apiBase', apiBase ?? 'null');

    processOCRQueueRef.current();
    void repairFilePathsRef.current().catch(() => undefined);
    void syncWithBackendRef.current().catch(() => undefined);
    initializePurchases();
    void checkProRef.current(accountEmailRef.current);
    track('app_opened');
  }, [logDebug, setDebugScreenState]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      logDebug(`app-state ${appStateRef.current} -> ${next}`);
      setDebugScreenState('appState', next);
      // Only lock on a true background transition. iOS fires 'inactive' for
      // brief interruptions (Control Centre, app switcher preview, incoming
      // call banner) and locking on those would prompt Face ID constantly.
      if (
        biometricEnabled &&
        appStateRef.current === 'active' &&
        next === 'background'
      ) {
        setLocked(true);
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [biometricEnabled, logDebug, setDebugScreenState, setLocked]);

  useEffect(() => {
    if (!hasHydrated) return;
    // Defer hide by one frame so the navigation redirect commits before the
    // splash disappears, preventing a flash of the tabs screen on cold start.
    requestAnimationFrame(() => { void SplashScreen.hideAsync(); });
  }, [hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;

    const topSegment = segments[0];
    const inOnboarding = topSegment === 'onboarding';
    const inAccount = topSegment === 'account';

    if (!hasOnboarded) {
      if (!inOnboarding) router.replace('/onboarding');
      return;
    }

    if (!isAccountAuthenticated) {
      if (!inAccount) router.replace('/account');
      return;
    }

    if (inOnboarding || inAccount) {
      router.replace('/(tabs)/');
    }
  }, [hasHydrated, hasOnboarded, isAccountAuthenticated, router, segments]);

  useEffect(() => {
    logDebug(`route ${routeLabel}`);
    setDebugScreenState('route', routeLabel);
  }, [logDebug, routeLabel, setDebugScreenState]);

  if (!hasHydrated) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <RootErrorBoundary>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle:      { backgroundColor: Colors.bg },
              headerTintColor:  Colors.text,
              headerTitleStyle: { color: Colors.text, fontWeight: '600' },
              headerShadowVisible: false,
              contentStyle:     { backgroundColor: Colors.bg },
              animation:        'slide_from_right',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
            <Stack.Screen name="capture" options={{ headerShown: false, presentation: 'transparentModal' }} />
            <Stack.Screen name="viewer" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false, animation: 'none' }} />
            <Stack.Screen name="account" options={{ headerShown: false, gestureEnabled: false, animation: 'none' }} />
          </Stack>
        </RootErrorBoundary>

        {biometricEnabled && isLocked && (
          <LockScreen onUnlocked={() => setLocked(false)} />
        )}

      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
