import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, T, S, Font, Radius } from '@/theme';
import { Folder } from '@/types/document';

interface Props {
  folder: Folder;
  docCount: number;
  onPress: () => void;
}

export function FolderCard({ folder, docCount, onPress }: Props) {
  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      android_ripple={{ color: Colors.surfaceDynamic }}
    >
      <View style={[styles.icon, { backgroundColor: `${folder.color}22` }]}>
        <Text style={[styles.iconText, { color: folder.color }]}>📁</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name}>{folder.name}</Text>
        <Text style={styles.count}>{docCount} document{docCount !== 1 ? 's' : ''}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: S[3],
    gap: S[3],
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: T.lg },
  body: { flex: 1 },
  name: { fontSize: T.base, fontWeight: Font.semibold, color: Colors.text },
  count: { fontSize: T.sm, color: Colors.textMuted, marginTop: 2 },
  chevron: { fontSize: T.xl, color: Colors.textFaint },
});
