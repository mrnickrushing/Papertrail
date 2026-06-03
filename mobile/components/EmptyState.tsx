import { View, Text, StyleSheet } from 'react-native';
import { Colors, T, S, Font, Radius } from '@/theme';

interface Props {
  icon: string;
  title: string;
  message: string;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ icon, title, message, action }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{getEmoji(icon)}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {action && (
        <View style={styles.btn}>
          <Text style={styles.btnText} onPress={action.onPress}>
            {action.label}
          </Text>
        </View>
      )}
    </View>
  );
}

function getEmoji(icon: string): string {
  const map: Record<string, string> = {
    'doc.text': '📄',
    'folder': '📁',
    'magnifyingglass': '🔍',
    'doc.text.magnifyingglass': '🔎',
    'doc': '📋',
    'house': '🏠',
  };
  return map[icon] ?? '📄';
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: S[16],
    paddingHorizontal: S[8],
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S[4],
  },
  icon: { fontSize: 28 },
  title: {
    fontSize: T.md,
    fontWeight: Font.semibold,
    color: Colors.text,
    marginBottom: S[2],
    textAlign: 'center',
  },
  message: {
    fontSize: T.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  btn: {
    marginTop: S[4],
    paddingHorizontal: S[4],
    paddingVertical: S[2],
    borderRadius: Radius.md,
    backgroundColor: Colors.accentHighlight,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  btnText: { fontSize: T.sm, color: Colors.accent, fontWeight: Font.semibold },
});
