/**
 * folders.tsx — Folder management tab
 *
 * Displays all user-created folders with document counts.
 * Tapping a folder opens FolderDetailScreen (inline navigation).
 * Long-press a folder to rename or delete.
 * FAB to create a new folder.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useDocumentStore } from '@/store/documentStore';
import { useProStore } from '@/store/proStore';
import { PaywallModal } from '@/components/PaywallModal';
import { DocumentCard } from '@/components/DocumentCard';
import { EmptyState } from '@/components/EmptyState';
import { FAB } from '@/components/FAB';
import { SkeletonList } from '@/components/SkeletonLoader';
import { C, T, R, S } from '@/theme/tokens';
import type { Folder } from '@/types/document';

const FOLDER_COLORS = [
  '#F59E0B', '#EF4444', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
];

type ActiveFolder = {
  id: string | null;
  name: string;
  color: string;
};

export default function FoldersScreen() {
  const insets = useSafeAreaInsets();
  const folders = useDocumentStore(s => s.folders);
  const isLoading = useDocumentStore(s => s.isLoading);
  const addFolder = useDocumentStore(s => s.addFolder);
  const updateFolder = useDocumentStore(s => s.updateFolder);
  const deleteFolder = useDocumentStore(s => s.deleteFolder);
  const getFolderDocuments = useDocumentStore(s => s.getFolderDocuments);

  const isPro = useProStore(s => s.isPro);
  const checkPro = useProStore(s => s.checkPro);

  const [showPaywall, setShowPaywall] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderError, setFolderError] = useState('');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0]);
  const [activeFolder, setActiveFolder] = useState<ActiveFolder | null>(null);

  const unfiledCount = getFolderDocuments(null).length;

  const openCreate = () => {
    if (!isPro) {
      setShowPaywall(true);
      return;
    }
    setFolderName('');
    setFolderError('');
    setSelectedColor(FOLDER_COLORS[0]);
    setEditingFolder(null);
    setShowCreateModal(true);
  };

  const openEdit = (folder: Folder) => {
    setFolderName(folder.name);
    setFolderError('');
    setSelectedColor(folder.color);
    setEditingFolder(folder);
    setShowCreateModal(true);
  };

  const handleSaveFolder = () => {
    const name = folderName.trim();
    if (!name) {
      setFolderError('Folder name is required.');
      return;
    }
    if (editingFolder) {
      updateFolder(editingFolder.id, { name, color: selectedColor });
    } else {
      addFolder(name, selectedColor);
    }
    setFolderError('');
    setShowCreateModal(false);
  };

  const handleDeleteFolder = useCallback((folder: Folder) => {
    const docCount = getFolderDocuments(folder.id).length;
    Alert.alert(
      'Delete Folder',
      docCount > 0
        ? `"${folder.name}" contains ${docCount} document${docCount === 1 ? '' : 's'}. They will be moved to Unfiled.`
        : `Delete "${folder.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteFolder(folder.id, true),
        },
      ]
    );
  }, [getFolderDocuments, deleteFolder]);

  const handleLongPress = useCallback((folder: Folder) => {
    Alert.alert(folder.name, undefined, [
      { text: 'Rename', onPress: () => openEdit(folder) },
      { text: 'Delete', style: 'destructive', onPress: () => handleDeleteFolder(folder) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [handleDeleteFolder]);

  // If a folder is open, show its contents
  if (activeFolder) {
    const folderDocs = getFolderDocuments(activeFolder.id);
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable
            style={styles.backBtn}
            onPress={() => setActiveFolder(null)}
            hitSlop={8}
          >
            <Text style={styles.backBtnText}>‹ Folders</Text>
          </Pressable>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.folderDot, { color: activeFolder.color }]}>●</Text>
            <Text style={styles.headerTitle}>{activeFolder.name}</Text>
          </View>
          <View style={{ width: 80 }} />
        </View>

        {folderDocs.length === 0 ? (
          <EmptyState
            icon="folder"
            title={activeFolder.id === null ? 'No unfiled documents' : 'Empty folder'}
            subtitle={
              activeFolder.id === null
                ? 'Documents assigned to a folder will not appear here.'
                : 'Move documents here from the home screen with bulk select.'
            }
          />
        ) : (
          <FlatList
            data={folderDocs}
            keyExtractor={d => d.id}
            contentContainerStyle={{ padding: S[4], paddingBottom: insets.bottom + 100 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push({ pathname: '/viewer/[id]', params: { id: item.id } })}
                style={({ pressed }) => [styles.docItem, pressed && { opacity: 0.7 }]}
              >
                <DocumentCard document={item} compact />
              </Pressable>
            )}
          />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Folders</Text>
        <Pressable style={styles.newFolderBtn} onPress={openCreate}>
          <Text style={styles.newFolderBtnText}>+ New</Text>
        </Pressable>
      </View>

      {isLoading && folders.length === 0 ? (
        <SkeletonList count={4} />
      ) : null}

      <ScrollView
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
      >
        {/* Unfiled */}
        <Pressable
          style={styles.folderRow}
          onPress={() => setActiveFolder({ id: null, name: 'Unfiled', color: C.ash })}
        >
          <View style={[styles.folderIcon, { backgroundColor: C.ink3 }]}>
            <Feather name="inbox" size={24} color={C.ash} />
          </View>
          <View style={styles.folderInfo}>
            <Text style={styles.folderName}>Unfiled</Text>
            <Text style={styles.folderCount}>
              {unfiledCount} document{unfiledCount === 1 ? '' : 's'}
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{unfiledCount}</Text>
          </View>
          <Text style={styles.folderChevron}>›</Text>
        </Pressable>

        {folders.length === 0 ? (
          <View style={styles.noFolders}>
            <Text style={styles.noFoldersText}>
              Tap + New to create your first folder.
            </Text>
          </View>
        ) : (
          folders.map(folder => {
            const count = getFolderDocuments(folder.id).length;
            return (
              <Pressable
                key={folder.id}
                style={({ pressed }) => [styles.folderRow, pressed && { opacity: 0.75 }]}
                onPress={() => setActiveFolder(folder)}
                onLongPress={() => handleLongPress(folder)}
                delayLongPress={400}
              >
                <View style={[styles.folderIcon, { backgroundColor: folder.color + '22' }]}>
                  <Feather name="folder" size={24} color={folder.color} />
                </View>
                <View style={styles.folderInfo}>
                  <Text style={styles.folderName}>{folder.name}</Text>
                  <Text style={styles.folderCount}>
                    {count} document{count === 1 ? '' : 's'}
                  </Text>
                </View>
                <Text style={styles.folderChevron}>›</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <FAB onPress={openCreate} />

      {showPaywall && (
        <PaywallModal
          visible={showPaywall}
          onClose={() => setShowPaywall(false)}
          onSuccess={() => {
            setShowPaywall(false);
            void checkPro();
          }}
        />
      )}

      {/* Create / Edit Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowCreateModal(false)}
        >
          <Pressable
            style={[styles.modalSheet, { paddingBottom: insets.bottom + S[4] }]}
            onPress={() => {}}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {editingFolder ? 'Rename Folder' : 'New Folder'}
            </Text>

            <TextInput
              style={styles.folderNameInput}
              value={folderName}
              onChangeText={(value) => {
                setFolderName(value);
                if (folderError && value.trim()) setFolderError('');
              }}
              placeholder="Folder name…"
              placeholderTextColor={C.ash}
              autoFocus
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={handleSaveFolder}
            />
            {folderError ? <Text style={styles.fieldError}>{folderError}</Text> : null}

            {/* Color picker */}
            <Text style={styles.colorLabel}>Color</Text>
            <View style={styles.colorGrid}>
              {FOLDER_COLORS.map(color => (
                <Pressable
                  key={color}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorSwatchSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <Feather name="check" size={16} color={C.cream} />
                  )}
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[
                styles.saveBtn,
                !folderName.trim() && styles.saveBtnDisabled,
              ]}
              onPress={handleSaveFolder}
              disabled={!folderName.trim()}
            >
              <Text style={styles.saveBtnText}>
                {editingFolder ? 'Save Changes' : 'Create Folder'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.ink1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S[4],
    paddingVertical: S[4],
    borderBottomWidth: 1,
    borderBottomColor: C.ink3,
  },
  screenTitle: { fontSize: T.xl, fontWeight: '700', color: C.cream },
  newFolderBtn: {
    backgroundColor: C.amberDim,
    borderRadius: R.full,
    paddingHorizontal: S[4],
    paddingVertical: S[2],
    minHeight: 36,
    justifyContent: 'center',
  },
  newFolderBtnText: { fontSize: T.sm, color: C.amber, fontWeight: '600' },
  backBtn: { minHeight: 44, justifyContent: 'center', paddingRight: S[4] },
  backBtnText: { fontSize: T.base, color: C.amber, fontWeight: '500' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: S[2] },
  headerTitle: { fontSize: T.lg, fontWeight: '700', color: C.cream },
  folderDot: { fontSize: 10 },
  listContent: { padding: S[4], gap: S[2] },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.ink2,
    borderRadius: R.lg,
    padding: S[4],
    minHeight: 72,
    gap: S[3],
  },
  folderIcon: {
    width: 48, height: 48,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderInfo: { flex: 1 },
  folderName: { fontSize: T.base, fontWeight: '600', color: C.cream },
  folderCount: { fontSize: T.sm, color: C.ash, marginTop: 2 },
  countBadge: {
    minWidth: 32,
    height: 28,
    borderRadius: R.full,
    paddingHorizontal: S[2],
    backgroundColor: C.ink3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: { fontSize: T.xs, color: C.cream, fontWeight: '700' },
  folderChevron: { fontSize: T.xl, color: C.ink4 },
  noFolders: {
    paddingVertical: S[8],
    alignItems: 'center',
  },
  noFoldersText: { fontSize: T.base, color: C.ash, textAlign: 'center' },
  docItem: { marginBottom: S[3] },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: C.ink2,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    paddingTop: S[3],
    paddingHorizontal: S[4],
  },
  sheetHandle: {
    width: 40, height: 4,
    borderRadius: R.full,
    backgroundColor: C.ink4,
    alignSelf: 'center',
    marginBottom: S[4],
  },
  sheetTitle: {
    fontSize: T.lg, fontWeight: '600',
    color: C.cream,
    textAlign: 'center',
    marginBottom: S[4],
  },
  folderNameInput: {
    backgroundColor: C.ink3,
    borderRadius: R.md,
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    fontSize: T.base,
    color: C.cream,
    minHeight: 48,
    marginBottom: S[2],
  },
  fieldError: {
    color: '#F87171',
    fontSize: T.sm,
    marginBottom: S[3],
  },
  colorLabel: {
    fontSize: T.sm,
    fontWeight: '600',
    color: C.ash,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: S[2],
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S[3],
    marginBottom: S[5],
  },
  colorSwatch: {
    width: 36, height: 36,
    borderRadius: R.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: C.cream,
  },
  colorCheck: { fontSize: T.sm, color: C.cream, fontWeight: '700' },
  saveBtn: {
    backgroundColor: C.amber,
    borderRadius: R.lg,
    paddingVertical: S[4],
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: T.base, fontWeight: '700', color: C.ink1 },
});
