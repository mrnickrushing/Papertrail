import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { C, T, S, R } from '@/theme/tokens';

interface BulkActionBarProps {
  count: number;
  onMove: () => void;
  onTag: () => void;
  onDelete: () => void;
  onAiOrganize?: () => void;
  onCancel: () => void;
}

export function BulkActionBar({ count, onMove, onTag, onDelete, onAiOrganize, onCancel }: BulkActionBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + S[3] }]}>
      <View style={styles.countRow}>
        <Text style={styles.countText}>{count} selected</Text>
        <Pressable onPress={onCancel} hitSlop={8}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
      <View style={styles.actions}>
        <ActionButton label="Move" icon="folder" onPress={onMove} />
        <ActionButton label="Tag" icon="tag" onPress={onTag} />
        {onAiOrganize && (
          <ActionButton label="AI Org." icon="cpu" onPress={onAiOrganize} amber />
        )}
        <ActionButton label="Delete" icon="trash-2" onPress={onDelete} danger />
      </View>
    </View>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  danger = false,
  amber = false,
}: {
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
  danger?: boolean;
  amber?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.btn, danger && styles.btnDanger, amber && styles.btnAmber, pressed && styles.btnPressed]}
      onPress={onPress}
    >
      <Feather name={icon} size={20} color={danger ? '#EF4444' : amber ? C.amber : C.ash} style={styles.btnIcon} />
      <Text style={[styles.btnLabel, danger && styles.btnLabelDanger, amber && styles.btnLabelAmber]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.ink2,
    borderTopWidth: 1,
    borderTopColor: C.ink3,
    paddingTop: S[3],
    paddingHorizontal: S[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: S[3],
  },
  countText: {
    fontSize: T.base,
    fontWeight: '600',
    color: C.cream,
  },
  cancelText: {
    fontSize: T.base,
    color: C.ash,
  },
  actions: {
    flexDirection: 'row',
    gap: S[3],
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.ink3,
    borderRadius: R.lg,
    paddingVertical: S[3],
    minHeight: 60,
  },
  btnDanger: {
    backgroundColor: '#3A1515',
  },
  btnPressed: {
    opacity: 0.65,
  },
  btnIcon: {
    marginBottom: 2,
  },
  btnLabel: {
    fontSize: T.xs,
    fontWeight: '600',
    color: C.ash,
  },
  btnLabelDanger: {
    color: '#EF4444',
  },
  btnAmber: {
    backgroundColor: C.amberDim,
  },
  btnLabelAmber: {
    color: C.amber,
  },
});
