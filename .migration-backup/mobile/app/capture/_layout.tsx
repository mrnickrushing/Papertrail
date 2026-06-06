import { Stack } from 'expo-router';
import { C } from '@/theme/tokens';

export default function CaptureLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.ink1 },
        animation: 'slide_from_bottom',
        gestureEnabled: true,
        gestureDirection: 'vertical',
      }}
    />
  );
}
