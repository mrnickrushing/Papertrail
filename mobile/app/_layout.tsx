import { useEffect, useRef } from 'react';
import { AppState, useColorScheme } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { Colors } from '@/theme';
import { useDocumentStore } from '@/store/documentStore';
import { useAppStore } from '@/store/appStore';
import { LockScreen } from '@/components/LockScreen';
import { track } from '@/services/analytics';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const processOCRQueue = useDocumentStore(s => s.processOCRQueue);
  const syncWithBackend = useDocumentStore(s => s.syncWithBackend);
  const biometricEnabled = useAppStore(s => s.biometricEnabled);
  const isLocked = useAppStore(s => s.isLocked);
  const setLocked = useAppStore(s => s.setLocked);
  const hasOnboarded = useAppStore(s => s.hasOnboarded);
  const appStateRef = useRef(AppState.currentState);

  // Run once on mount — capture stable refs so the effect doesn't re-run
  const processOCRQueueRef = useRef(processOCRQueue);
  processOCRQueueRef.current = processOCRQueue;
  const syncWithBackendRef = useRef(syncWithBackend);
  syncWithBackendRef.current = syncWithBackend;

  useEffect(() => {
    SplashScreen.hideAsync();
    processOCRQueueRef.current();
    void syncWithBackendRef.current().catch(() => undefined);
    track('app_opened');
  }, []);

  useEffect(() => {
    if (!hasOnboarded) {
      router.replace('/onboarding');
    }
  }, [hasOnboarded]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (
        biometricEnabled &&
        appStateRef.current === 'active' &&
        (next === 'background' || next === 'inactive')
      ) {
        setLocked(true);
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [biometricEnabled, setLocked]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={colorScheme === 'light' ? 'dark' : 'light'} />
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
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="capture" options={{ headerShown: false, presentation: 'transparentModal' }} />
          <Stack.Screen name="viewer/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="document/[id]" options={{ title: 'Document', headerBackTitle: 'Back' }} />
          <Stack.Screen name="folder/[id]" options={{ title: 'Folder', headerBackTitle: 'Back' }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        </Stack>

        {biometricEnabled && isLocked && (
          <LockScreen onUnlocked={() => setLocked(false)} />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
