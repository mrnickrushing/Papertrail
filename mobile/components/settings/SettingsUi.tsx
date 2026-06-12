import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ScreenHeader';
import { C, T, R, S } from '@/theme/tokens';

export function SettingsTabShell({
  title,
  children,
  footerInset = 100,
  overlay,
}: {
  title: string;
  children: React.ReactNode;
  footerInset?: number;
  overlay?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title={title} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + footerInset }]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {overlay}
    </View>
  );
}

export function SettingsSubpageShell({
  title,
  children,
  footerInset = 40,
}: {
  title: string;
  children: React.ReactNode;
  footerInset?: number;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.subpageHeader}>
        <Pressable
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/settings'))}
          hitSlop={8}
        >
          <Text style={styles.backText}>‹ Settings</Text>
        </Pressable>
        <Text style={styles.subpageTitle}>{title}</Text>
        <View style={styles.backSpacer} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + footerInset }]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title.toUpperCase()}</Text>;
}

export function SettingsCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <Text style={styles.hint}>{children}</Text>;
}

export function SettingsNavRow({
  label,
  value,
  icon,
  onPress,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.navRow, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.navRowMain}>
        <View style={styles.navIconWrap}>
          <Feather name={icon} size={16} color={C.amber} />
        </View>
        <View style={styles.navTextWrap}>
          <Text style={styles.navLabel}>{label}</Text>
          <Text style={styles.navValue} numberOfLines={1}>{value}</Text>
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={C.ash} />
    </Pressable>
  );
}

export function ActionRow({
  label,
  sub,
  loading,
  disabled,
  onPress,
}: {
  label: string;
  sub: string;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionRow, (pressed || disabled) && styles.pressed]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.actionContent}>
        <Text style={[styles.actionLabel, disabled && !loading && styles.actionLabelDisabled]}>
          {label}
        </Text>
        <Text style={styles.actionSub} numberOfLines={2}>{sub}</Text>
      </View>
      {loading ? <ActivityIndicator color={C.amber} /> : <Text style={styles.actionChevron}>›</Text>}
    </Pressable>
  );
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatUsd(amount: number): string {
  if (amount === 0) return '$0.00';
  if (amount < 0.01) return '< $0.01';
  return `$${amount.toFixed(2)}`;
}

export function spendWarning(amount: number): { tone: 'amber' | 'danger'; message: string } | null {
  if (amount >= 5) {
    return { tone: 'danger', message: `You’ve spent ${formatUsd(amount)} on AI Organize on this device — keep an eye on it.` };
  }
  if (amount >= 1) {
    return { tone: 'amber', message: `You’ve crossed ${formatUsd(amount)} in AI Organize spend on this device.` };
  }
  return null;
}

export function SpendWarningBanner({
  tone,
  message,
}: {
  tone: 'amber' | 'danger';
  message: string;
}) {
  return (
    <View style={[styles.spendWarning, tone === 'danger' && styles.spendWarningDanger]}>
      <Text style={[styles.spendWarningText, tone === 'danger' && styles.spendWarningTextDanger]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.ink1 },
  content: { padding: S[4], gap: S[2] },
  subpageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S[4],
    paddingBottom: S[3],
  },
  backBtn: { minWidth: 88, minHeight: 44, justifyContent: 'center' },
  backText: { fontSize: T.base, color: C.amber, fontWeight: '600' },
  subpageTitle: { fontSize: T.lg, color: C.cream, fontWeight: '700' },
  backSpacer: { width: 88 },
  sectionHeader: {
    fontSize: T.xs,
    fontWeight: '600',
    color: C.ash,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: S[4],
    marginBottom: S[1],
    marginLeft: S[2],
  },
  card: {
    backgroundColor: C.ink2,
    borderRadius: R.lg,
    overflow: 'hidden',
    marginBottom: S[2],
    borderWidth: 1,
    borderColor: C.ink3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S[4],
    paddingVertical: S[4],
    minHeight: 52,
  },
  rowLabel: { flex: 1, fontSize: T.base, color: C.cream },
  rowValue: { fontSize: T.base, color: C.ash, fontWeight: '500' },
  divider: { height: 1, backgroundColor: C.ink3, marginLeft: S[4] },
  hint: {
    fontSize: T.xs,
    color: C.ink4,
    marginHorizontal: S[2],
    marginBottom: S[2],
    lineHeight: 18,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S[4],
    paddingVertical: S[4],
    minHeight: 68,
  },
  navRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
    flex: 1,
    minWidth: 0,
  },
  navIconWrap: {
    width: 36,
    height: 36,
    borderRadius: R.md,
    backgroundColor: C.amberDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTextWrap: { flex: 1, gap: 2, minWidth: 0 },
  navLabel: { fontSize: T.base, color: C.cream, fontWeight: '600' },
  navValue: { fontSize: T.sm, color: C.ash },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S[4],
    paddingVertical: S[4],
    minHeight: 64,
  },
  actionContent: { flex: 1, gap: 2 },
  actionLabel: { fontSize: T.base, color: C.cream, fontWeight: '600' },
  actionLabelDisabled: { color: C.ash },
  actionSub: { fontSize: T.sm, color: C.ash, lineHeight: 18 },
  actionChevron: { fontSize: 22, color: C.ash },
  spendWarning: {
    backgroundColor: C.amberDim,
    borderRadius: R.md,
    paddingHorizontal: S[3],
    paddingVertical: S[2] + 2,
    marginHorizontal: S[2],
    marginBottom: S[3],
  },
  spendWarningDanger: { backgroundColor: C.danger + '22' },
  spendWarningText: { fontSize: T.xs, color: C.amber, fontWeight: '600', lineHeight: 18 },
  spendWarningTextDanger: { color: C.danger },
  pressed: { opacity: 0.78 },
});
