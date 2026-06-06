import { useCallback } from 'react';
import { router } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { CaptureModal } from '@/components/capture/CaptureModal';
import { C } from '@/theme/tokens';

export default function CaptureScreen() {
  const handleClose = useCallback(() => {
    router.back();
  }, []);

  return (
    <View style={styles.container}>
      <CaptureModal visible onClose={handleClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.ink1 },
});
