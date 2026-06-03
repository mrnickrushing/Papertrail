import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, T, S, Font } from '@/theme';
import { useDocumentStore } from '@/store/documentStore';
import { DocumentCard } from '@/components/DocumentCard';
import { EmptyState } from '@/components/EmptyState';

export default function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const folders = useDocumentStore((s) => s.folders);
  const getDocumentsByFolder = useDocumentStore((s) => s.getDocumentsByFolder);

  const folder = folders.find((f) => f.id === id);
  const docs = getDocumentsByFolder(id);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>{folder?.name ?? 'Folder'}</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={docs}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <DocumentCard
            document={item}
            onPress={() => router.push(`/document/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="doc"
            title="No documents"
            message="This folder is empty. Add documents using the + button."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  back: { fontSize: T.base, color: Colors.accent, fontWeight: Font.medium, width: 60 },
  title: { fontSize: T.md, fontWeight: Font.bold, color: Colors.text },
  list: { padding: S[4], paddingBottom: S[10] },
});
