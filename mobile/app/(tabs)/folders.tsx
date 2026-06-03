import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, T, S, Font } from '@/theme';
import { useDocumentStore } from '@/store/documentStore';
import { FolderCard } from '@/components/FolderCard';
import { EmptyState } from '@/components/EmptyState';

export default function FoldersScreen() {
  const insets = useSafeAreaInsets();
  const folders = useDocumentStore((s) => s.folders);
  const documents = useDocumentStore((s) => s.documents);

  const docCountForFolder = (folderId: string) =>
    documents.filter((d) => d.folderId === folderId).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Folders</Text>
        <Pressable
          style={styles.newBtn}
          onPress={() => router.push('/folder/new')}
        >
          <Text style={styles.newBtnText}>New folder</Text>
        </Pressable>
      </View>

      <FlatList
        data={folders}
        keyExtractor={(f) => f.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <FolderCard
            folder={item}
            docCount={docCountForFolder(item.id)}
            onPress={() => router.push(`/folder/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="folder"
            title="No folders yet"
            message="Create folders to organize your documents by category or project."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: T.xl, fontWeight: Font.bold, color: Colors.text, letterSpacing: -0.5 },
  newBtn: {
    paddingHorizontal: S[3],
    paddingVertical: S[2],
    borderRadius: 8,
    backgroundColor: Colors.accentHighlight,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  newBtnText: { fontSize: T.sm, color: Colors.accent, fontWeight: Font.medium },
  list: { padding: S[4], gap: S[2], paddingBottom: S[10] },
});
