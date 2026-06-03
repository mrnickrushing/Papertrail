import React, { useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDocumentStore } from '@/store';
import { DocumentCard } from '@/components/DocumentCard';
import { EmptyState } from '@/components/EmptyState';
import { Colors, Typography, Spacing } from '@/theme';

export default function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { folders, documents } = useDocumentStore();

  const folder = useMemo(
    () => folders.find((f) => f.id === id),
    [folders, id],
  );

  const folderDocs = useMemo(
    () => documents.filter((d) => d.folderId === id),
    [documents, id],
  );

  if (!folder) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Folder not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing['4'] }]}>
        <Text style={styles.icon}>📁</Text>
        <View>
          <Text style={styles.title}>{folder.name}</Text>
          <Text style={styles.count}>
            {folderDocs.length} document{folderDocs.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <FlatList
        data={folderDocs}
        keyExtractor={(d) => d.id}
        contentContainerStyle={[
          styles.list,
          folderDocs.length === 0 && styles.listEmpty,
        ]}
        renderItem={({ item }) => (
          <DocumentCard
            document={item}
            onPress={() => router.push(`/viewer/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="file-text"
            title="No documents here"
            subtitle="Add documents to this folder from the Vault"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  notFound:  { color: Colors.textMuted, fontSize: Typography.base },
  header: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              Spacing['4'],
    paddingHorizontal: Spacing['6'],
    paddingBottom:    Spacing['4'],
  },
  icon:  { fontSize: 40 },
  title: { fontSize: Typography.xxl, fontWeight: Typography.bold, color: Colors.text, letterSpacing: -0.5 },
  count: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 2 },
  list:      { paddingHorizontal: Spacing['4'], paddingBottom: 40 },
  listEmpty: { flex: 1, justifyContent: 'center' },
});
