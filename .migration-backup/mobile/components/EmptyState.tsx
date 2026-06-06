import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C, T, S, R } from '@/theme/tokens';

interface Props {
  icon: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Show a downward arrow hinting at the FAB */
  showFABHint?: boolean;
}

const ICON_MAP: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  'file-text': 'file-text',
  'folder': 'folder',
  'search': 'search',
};

export function EmptyState({ icon, title, subtitle, actionLabel, onAction, showFABHint }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Feather name={ICON_MAP[icon] ?? 'file'} size={42} color={C.amber} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable style={styles.action} onPress={onAction} hitSlop={8}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
      {showFABHint && (
        <View style={styles.fabHint}>
          <Text style={styles.fabHintArrow}>↓</Text>
          <Text style={styles.fabHintText}>Tap + to add your first document</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: S[16],
    paddingHorizontal: S[8],
    gap: S[3],
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: R.xl,
    backgroundColor: C.ink2,
    borderWidth: 1,
    borderColor: C.ink3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S[2],
  },
  title: {
    fontSize: T.lg,
    fontWeight: '600',
    color: C.cream,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: T.base,
    color: C.ash,
    textAlign: 'center',
    lineHeight: T.base * 1.5,
    maxWidth: 280,
  },
  action: {
    marginTop: S[2],
    paddingHorizontal: S[5],
    paddingVertical: S[3],
    borderRadius: R.full,
    backgroundColor: C.amber,
    minHeight: 44,
    justifyContent: 'center',
  },
  actionText: {
    fontSize: T.base,
    fontWeight: '600',
    color: C.ink1,
  },
  fabHint: {
    marginTop: S[4],
    alignItems: 'center',
    gap: S[1],
  },
  fabHintArrow: {
    fontSize: 20,
    color: C.amber,
    fontWeight: '700',
  },
  fabHintText: {
    fontSize: T.sm,
    color: C.ash,
  },
});
