import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from '@/services/database';
import { useDocumentStore } from '@/store/documentStore';
import { Colors } from '@/theme';

export default function RootLayout() {
  const loadAll = useDocumentStore((s) => s.loadAll);

  useEffect(() => {
    (async () => {
      await initDatabase();
      await loadAll();
    })();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.bg },
            animation: 'ios_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="document/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="folder/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="onboarding" options={{ presentation: 'fullScreenModal' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
