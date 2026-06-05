import React from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T, S, R } from '@/theme/tokens';
import type { Folder } from '@/types/document';

type FolderOption = Pick<Folder, 'name' | 'color'> & { id: string | null };

interface FolderPickerModalProps {
  visible: boolean;
  folders: Folder[];
  onSelect: (folderId: string | null) => void;
  onCancel: () => void;
}

export function FolderPickerModal({
  visible,
  folders,
  onSelect,
  onCancel,
}: FolderPickerModalProps) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + S[4] }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>Move to Folder</Text>

        <FlatList<FolderOption>
          data={[{ id: null, name: 'Unfiled', color: '#6B7280' }, ...folders]}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => onSelect(item.id)}
            >
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text style={styles.folderName}>{item.name}</Text>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />

        <Pressable style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    maxHeight: '70%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: R.full,
    backgroundColor: C.ink4,
    alignSelf: 'center',
    marginBottom: S[4],
  },
  title: {
    fontSize: T.lg,
    fontWeight: '700',
    color: C.cream,
    marginBottom: S[3],
  },
  list: {
    paddingBottom: S[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: S[4],
    gap: S[3],
  },
  rowPressed: {
    opacity: 0.6,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: R.full,
  },
  folderName: {
    fontSize: T.base,
    color: C.cream,
    fontWeight: '500',
  },
  sep: {
    height: 1,
    backgroundColor: C.ink3,
  },
  cancelBtn: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.ink3,
    borderRadius: R.lg,
    marginTop: S[2],
  },
  cancelText: {
    fontSize: T.base,
    color: C.ash,
    fontWeight: '500',
  },
});
