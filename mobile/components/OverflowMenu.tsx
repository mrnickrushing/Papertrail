/**
 * OverflowMenu.tsx — "More actions" overflow menu
 *
 * A "⋮" trigger that reveals a bottom sheet of secondary actions
 * (icon + label), each dismissing the sheet before firing. Used to
 * declutter headers that were crowding several equal-weight icon
 * buttons into one row.
 */

import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { C, T, S, R } from '@/theme/tokens';

export interface OverflowMenuAction {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
  /** Renders the row in the danger color (e.g. Delete). */
  destructive?: boolean;
  /** Renders the row in the amber accent color (e.g. an active toggle). */
  active?: boolean;
  /** Shows a spinner instead of the icon and disables the row. */
  loading?: boolean;
}

interface OverflowMenuProps {
  actions: OverflowMenuAction[];
  accessibilityLabel?: string;
}

export function OverflowMenu({ actions, accessibilityLabel = 'More actions' }: OverflowMenuProps) {
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const close = () => setVisible(false);

  const handlePress = (action: OverflowMenuAction) => {
    if (action.loading) return;
    close();
    action.onPress();
  };

  return (
    <>
      <Pressable
        style={styles.trigger}
        onPress={() => setVisible(true)}
        hitSlop={8}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
      >
        <Feather name="more-vertical" size={20} color={C.ash} />
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + S[4] }]}>
          <View style={styles.handle} />
          {actions.map((action, i) => {
            const tint = action.destructive ? C.danger : action.active ? C.amber : C.cream;
            return (
              <Pressable
                key={action.key}
                style={({ pressed }) => [styles.row, i > 0 && styles.rowDivider, pressed && styles.rowPressed]}
                onPress={() => handlePress(action)}
                accessibilityRole="button"
                accessibilityLabel={action.label}
              >
                {action.loading ? (
                  <ActivityIndicator size="small" color={C.ash} style={styles.icon} />
                ) : (
                  <Feather name={action.icon} size={18} color={action.destructive ? C.danger : action.active ? C.amber : C.ash} style={styles.icon} />
                )}
                <Text style={[styles.label, { color: tint }]}>{action.label}</Text>
              </Pressable>
            );
          })}
          <Pressable style={styles.cancelBtn} onPress={close}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.ink2,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    paddingTop: S[3],
    paddingHorizontal: S[5],
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: R.full,
    backgroundColor: C.ink4,
    alignSelf: 'center',
    marginBottom: S[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: S[4],
    gap: S[3],
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: C.ink3,
  },
  rowPressed: {
    opacity: 0.6,
  },
  icon: {
    width: 22,
    textAlign: 'center',
  },
  label: {
    fontSize: T.base,
    fontWeight: '500',
  },
  cancelBtn: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.ink3,
    borderRadius: R.lg,
    marginTop: S[2],
    marginBottom: S[2],
  },
  cancelText: {
    fontSize: T.base,
    color: C.ash,
    fontWeight: '500',
  },
});
