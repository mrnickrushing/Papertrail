import { View, Text, ScrollView, StyleSheet, Switch, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, T, S, Font, Radius } from '@/theme';
import { useAppStore } from '@/store/appStore';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { biometricEnabled, setBiometricEnabled, viewMode, setViewMode, isPro } = useAppStore();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Pro Banner */}
        {!isPro && (
          <Pressable style={styles.proBanner}>
            <Text style={styles.proBannerTitle}>Upgrade to Pro</Text>
            <Text style={styles.proBannerSub}>
              Cloud sync, AI organization, secure sharing & more.
            </Text>
            <Text style={styles.proBannerCta}>Learn more →</Text>
          </Pressable>
        )}

        {/* Security */}
        <Text style={styles.groupLabel}>SECURITY</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Biometric Lock</Text>
            <Switch
              value={biometricEnabled}
              onValueChange={setBiometricEnabled}
              trackColor={{ false: Colors.surfaceDynamic, true: Colors.accent }}
              thumbColor={Colors.text}
            />
          </View>
        </View>

        {/* Appearance */}
        <Text style={styles.groupLabel}>APPEARANCE</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Default View</Text>
            <View style={styles.segmented}>
              {(['card', 'list'] as const).map((mode) => (
                <Pressable
                  key={mode}
                  style={[styles.seg, viewMode === mode && styles.segActive]}
                  onPress={() => setViewMode(mode)}
                >
                  <Text style={[styles.segText, viewMode === mode && styles.segTextActive]}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Pro Features — locked */}
        <Text style={styles.groupLabel}>PRO FEATURES</Text>
        <View style={styles.group}>
          {['Cloud Sync', 'Email to Vault', 'AI Auto-Naming', 'Shared Vaults', 'Accountant Export'].map((feature) => (
            <View key={feature} style={styles.row}>
              <Text style={styles.rowLabel}>{feature}</Text>
              <Text style={styles.proTag}>PRO</Text>
            </View>
          ))}
        </View>

        {/* About */}
        <Text style={styles.groupLabel}>ABOUT</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Storage</Text>
            <Text style={styles.rowValue}>Local (on-device)</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: T.xl, fontWeight: Font.bold, color: Colors.text, letterSpacing: -0.5 },
  scroll: { padding: S[4], paddingBottom: S[16] },
  proBanner: {
    backgroundColor: Colors.accentHighlight,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.accent,
    padding: S[4],
    marginBottom: S[5],
  },
  proBannerTitle: { fontSize: T.md, fontWeight: Font.bold, color: Colors.accent },
  proBannerSub: { fontSize: T.sm, color: Colors.textMuted, marginTop: S[1], lineHeight: 20 },
  proBannerCta: { fontSize: T.sm, color: Colors.accent, fontWeight: Font.semibold, marginTop: S[2] },
  groupLabel: {
    fontSize: T.xs,
    fontWeight: Font.semibold,
    color: Colors.textFaint,
    letterSpacing: 0.8,
    marginBottom: S[2],
    marginTop: S[4],
  },
  group: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  rowLabel: { fontSize: T.base, color: Colors.text },
  rowValue: { fontSize: T.sm, color: Colors.textMuted },
  proTag: {
    fontSize: T.xs,
    color: Colors.accent,
    fontWeight: Font.bold,
    backgroundColor: Colors.accentHighlight,
    paddingHorizontal: S[2],
    paddingVertical: 2,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceOffset,
    borderRadius: Radius.md,
    padding: 2,
  },
  seg: { paddingHorizontal: S[3], paddingVertical: S[1], borderRadius: Radius.sm },
  segActive: { backgroundColor: Colors.surface2 },
  segText: { fontSize: T.sm, color: Colors.textMuted, fontWeight: Font.medium },
  segTextActive: { color: Colors.text },
});
